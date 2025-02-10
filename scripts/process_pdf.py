# .github/scripts/process_pdf.py

import os
from pathlib import Path
from typing import Literal

import fire
import requests
from loguru import logger
from lxml import etree
from llamero.utils import commit_and_push

OutputFormat = Literal['markdown', 'tei']

def remove_extra_whitespace(text: str)->str:
    while '\n\n\n' in text:
        text = text.replace('\n\n\n', '\n\n')
    return text

def remove_gibberish(
    text: str,
    cutoff=2000
)->str:
    good_lines = []
    for line in text.split('\n'):
        # if len(line) < cutoff:
        #     good_lines.append(line)
        #     continue
        _line = line
        if _line.startswith("$"):
            _line = _line[1:-1]
        n_tok = len(_line)
        n_space = _line.count(" ")
        _line = _line.replace(" ","")
        # I think this might remove some formulas if we use cutoff=0
        token_sparsity = n_space/n_tok
        
        skip=False
        if (abs(token_sparsity - .5) < .01) and (len(line) < cutoff):
            skip=True
        if "texitsha1_base64" in _line:
            skip=True
        if skip:
            logger.info(f"removing gibberish")
            logger.info(line)
            continue
        good_lines.append(line)
    return '\n'.join(good_lines)

def sanitize_markdown(text: str)->str:
    text=remove_extra_whitespace(text)
    text=remove_gibberish(text)
    return text

def process_pdf_grobid(
    pdf_path: str, 
    format: OutputFormat = 'markdown', 
    tag: str = "grobid",
    output_path: str | None = None
) -> None:
    """
    Process a PDF file using Grobid and convert to the specified format.
    
    If output_path is not provided, the output file will be saved in the same 
    directory as the input PDF, using the same base name with a new extension. 
    If a tag is provided, it will be appended to the base name after an underscore.
    
    For example, if pdf_path is "papers/document.pdf", then:
      - with format "markdown" and tag "v1" the output will be "papers/document_v1.md"
      - with format "markdown" and no tag, the output will be "papers/document.md"
      - with format "tei" and tag "v1" the output will be "papers/document_v1.tei.xml"
    
    Args:
        pdf_path: Path to the PDF file relative to the repository root.
        format: Output format, either 'markdown' or 'tei'.
        tag: Optional tag to append to the output filename (default: "grobid").
        output_path: Optional path where the output file should be saved. If provided,
            this overrides the default filename generation and tag behavior.
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    logger.info(f"Processing {pdf_path}")
    
    grobid_host = os.environ.get('GROBID_HOST', 'localhost')
    base_url = f"http://{grobid_host}:8070"
    
    # Call Grobid to process the PDF into TEI XML
    with open(pdf_path, 'rb') as f:
        files = {'input': (pdf_path.name, f, 'application/pdf')}
        resp = requests.post(
            f"{base_url}/api/processFulltextDocument",
            files=files,
            headers={'Accept': 'application/xml'},
            timeout=300  # 5 minute timeout
        )
    
    if resp.status_code != 200:
        raise RuntimeError(f"Grobid processing failed: {resp.status_code}")
    
    # Determine output paths based on whether output_path is provided
    if output_path:
        output_path = Path(output_path)
        tei_path = output_path.with_suffix('.tei.xml')
        md_path = output_path.with_suffix('.md')
    else:
        # Use original filename generation logic
        base_name = pdf_path.stem
        if tag:
            tei_filename = f"{base_name}_{tag}.tei.xml"
            md_filename = f"{base_name}_{tag}.md"
        else:
            tei_filename = f"{base_name}.tei.xml"
            md_filename = f"{base_name}.md"
        tei_path = pdf_path.parent / tei_filename
        md_path = pdf_path.parent / md_filename
    
    # Save the TEI output
    tei_path.write_text(resp.text)
    logger.info(f"Saved TEI XML to {tei_path}")
    
    if format == 'markdown':
        # Convert TEI to Markdown using XSLT
        xslt_path = Path(__file__).parent / 'tei2md.xslt'
        if not xslt_path.exists():
            raise FileNotFoundError(f"XSLT stylesheet not found: {xslt_path}")
        
        xslt = etree.parse(str(xslt_path))
        transform = etree.XSLT(xslt)
        
        tei_doc = etree.parse(str(tei_path))
        markdown = str(transform(tei_doc))

        markdown=sanitize_markdown(markdown)
        
        # Save Markdown output
        md_path.write_text(markdown)
        logger.info(f"Saved Markdown to {md_path}")
    else:
        logger.info(f"Output TEI XML saved at {tei_path}")
        
process_pdf = process_pdf_grobid

# just leaving this here in case we need it for some more aggressive "soft-reset" or whatever
ignore_files = [
    "gh-store-snapshot.json",
    "papers-archive.json",
    "papers.json",
    "papers.yaml"
]

def flush_old_conversions(data_path: str = "data/papers", tag: str = "grobid", suffix=".md"):
    """
    I want to be able to just fill in missing files that we expect to be present. 
    In service of that pattern, especially while I'm still developing the markdown conversion procedure,
    it would be helpful to have a mechanism that removes all of the markdown conversions previously generated
    by some procedure.

    Moving forward, I'm going to include the procedure name in the markdown filename. This is the purpose of the 'tag' field.
    """
    data_path = Path(data_path)
    for fpath in data_path.rglob("*"+suffix):
        if tag in str(fpath):
            fpath.unlink()

def generate_missing_conversions(
    data_path: str = "data/papers",
    tag: str = "grobid",
    suffix=".md",
    checkpoint_cadence=5,
):
    """
    We assume that every pdf under the data_path should have an accompanying markdown conversion.
    This function looks for these PDFs and filters on the ones that contain the tag. For each of 
    these PDFs, if a corresponding markdown file (with the same tag somewhere in its filename)
    can't be found, this function generates one.

    I have no idea how long this will take, so instead of locking the repo for the entire procedure, 
    I'm going to add a commit-and-push cadence. If the push errors, we'll exit the job and the 
    "generate missing" procedure can pick up where it left off since it just needs to backfill 
    whatever isn't there. Once backfilling is completed, the procedure will just fill in the gaps for 
    new papers as they arrive.
    """
    data_path = Path(data_path)
    modified_files = []
    for i, pdf_fpath in enumerate(data_path.rglob("*.pdf")):
        # skip PDFs that snuck in via latex source dirs downloaded from arxiv 
        if "source" in str(pdf_fpath):
            continue
        outname = f"{pdf_fpath.stem}{suffix}" if not tag else f"{pdf_fpath.stem}_{tag}{suffix}"
        md_fpath = pdf_fpath.parent / outname
        if not md_fpath.exists():
            process_pdf_grobid(pdf_fpath, output_path=md_fpath)
            modified_files.append(md_fpath)
            logger.info(md_fpath)
        if (i % checkpoint_cadence) == 0:
            msg="persisting markdown conversions"
            commit_and_push(files_to_commit=modified_files, message = msg)
            modified_files=[]
    if modified_files:
        commit_and_push(files_to_commit=modified_files, message = msg)

        

if __name__ == '__main__':
    fire.Fire(
        {"process_pdf":process_pdf,
         "generate_missing_conversions":generate_missing_conversions,
         "flush_old_conversions":flush_old_conversions,
        })
