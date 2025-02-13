#!/bin/bash

find data/papers -name "*_grobid.md" -o -name "*_grobid.tei.xml" | while read file; do
    dir=$(dirname "$file")
    id=$(basename "$dir")
    ext="${file##*.}"
    type=$(if [[ $file == *_grobid.md ]]; then echo "markdown-grobid"; else echo "tei-xml-grobid"; fi)
    mkdir -p "$dir/features/$type"
    mv "$file" "$dir/features/$type/$id.$ext"
done
