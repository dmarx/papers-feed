# .github/scripts/process_pdf.py

import os
from pathlib import Path
from typing import Literal

import fire
import requests
from loguru import logger
from lxml import etree

OutputFormat = Literal['markdown', 'tei']

def process_pdf_grobid(pdf_path: str, format: OutputFormat = 'markdown', tag: str = "grobid") -> None:
    """
    Process a PDF file using Grobid and convert to the specified format.
    
    The output file will be saved in the same directory as the input PDF, using the
    same base name with a new extension. If a tag is provided, it will be appended
    to the base name after an underscore.
    
    For example, if pdf_path is "papers/document.pdf", then:
      - with format "markdown" and tag "v1" the output will be "papers/document_v1.md"
      - with format "markdown" and no tag, the output will be "papers/document.md"
      - with format "tei" and tag "v1" the output will be "papers/document_v1.tei.xml"
    
    Args:
        pdf_path: Path to the PDF file relative to the repository root.
        format: Output format, either 'markdown' or 'tei'.
        tag: Optional tag to append to the output filename (default: empty string).
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    logger.info(f"Processing {pdf_path}")
    
    # https://github.com/dmarx/papers-feed/blob/b080a0b373bf953b1dc7df36b08398e8be2b7536/.github/workflows/process_pdf.yml#L26-L35
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
    
    # Compute base output filename based on the input PDF filename
    base_name = pdf_path.stem  # removes .pdf
    if tag:
        tei_filename = f"{base_name}_{tag}.tei.xml"
        md_filename = f"{base_name}_{tag}.md"
    else:
        tei_filename = f"{base_name}.tei.xml"
        md_filename = f"{base_name}.md"
    
    # Save the TEI output
    tei_path = pdf_path.parent / tei_filename
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
        
        # Save Markdown output
        md_path = pdf_path.parent / md_filename
        md_path.write_text(markdown)
        logger.info(f"Saved Markdown to {md_path}")
    else:
        logger.info(f"Output TEI XML saved at {tei_path}")

process_pdf = process_pdf_grobid

if __name__ == '__main__':
    fire.Fire(
        {"process_pdf":process_pdf,
        })
