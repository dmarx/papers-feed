#!/bin/bash
pip install llamero lxml
python scripts/process_pdf.py flush_old_conversions --tag=""
python scripts/process_pdf.py flush_old_conversions --tag="grobid"
python scripts/process_pdf.py generate_missing_conversions
