# .github/scripts/process_pdf.py

import os
from pathlib import Path
import time
from typing import Literal

import fire
import requests
from loguru import logger
from lxml import etree

OutputFormat = Literal['markdown', 'tei']

def process_pdf(pdf_path: str, format: OutputFormat = 'markdown') -> None:
    """
    Process a PDF file using Grobid and convert to specified format.
    
    Args:
        pdf_path: Path to the PDF file relative to repository root
        format: Output format, either 'markdown' or 'tei'
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    logger.info(f"Processing {pdf_path}")
    
    # Get base URL from environment or use default
    grobid_host = os.environ.get('GROBID_HOST', 'localhost')
    base_url = f"http://{grobid_host}:8070"
    
    # Process the PDF
    with open(pdf_path, 'rb') as f:
        files = {'input': (pdf_path.name, f, 'application/pdf')}
        
        # Get TEI XML
        resp = requests.post(
            f"{base_url}/api/processFulltextDocument",
            files=files,
            headers={'Accept': 'application/xml'},
            timeout=300  # 5 minute timeout
        )
        
        if resp.status_code != 200:
            raise RuntimeError(f"Grobid processing failed: {resp.status_code}")
        
        # Save TEI output
        tei_path = Path('output.tei.xml')
        tei_path.write_text(resp.text)
        logger.info(f"Saved TEI XML to {tei_path}")
        
        if format == 'markdown':
            # Convert TEI to Markdown using XSLT
            xslt_path = Path(__file__).parent / 'tei2md.xslt'
            if not xslt_path.exists():
                raise FileNotFoundError(f"XSLT stylesheet not found: {xslt_path}")
            
            # Load XSLT stylesheet
            xslt = etree.parse(str(xslt_path))
            transform = etree.XSLT(xslt)
            
            # Load and transform TEI document
            tei_doc = etree.parse(str(tei_path))
            markdown = str(transform(tei_doc))
            
            # Save Markdown output
            md_path = Path('output.md')
            md_path.write_text(markdown)
            logger.info(f"Saved Markdown to {md_path}")

if __name__ == '__main__':
    fire.Fire(process_pdf)
