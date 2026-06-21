#!/bin/bash
# This script is part of the htprankster/reflex-racing-utils project.
# LICENSE.md => GNU GPL v3 / 2026

output="/external/metadata.json"

key="$1"
dataset="$2"

if [[ "$key" == "status" ]]; then
    status="$3"
    jq --arg key "$key" --arg dataset "$dataset" --arg val "$status" '.[][$key][$dataset] = $val' "$output" > "$output.tmp" && mv "$output.tmp" "$output"
elif [[ "$key" == "last_updated" ]]; then
    timestamp=$(date +%s)
    jq --arg key "$key" --arg dataset "$dataset" --arg val "$timestamp" '.[][$key][$dataset] = $val' "$output" > "$output.tmp" && mv "$output.tmp" "$output"
elif [[ "$key" == "sha256" ]]; then
    checksum_dir="$3"
    for file in "$checksum_dir"/*; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            sha256=$(shasum -a 256 "$file" | awk '{ print $1 }')
            jq --arg key "$key" --arg dataset "$dataset" --arg prop "$filename" --arg val "$sha256" '.[][$key][$dataset][$prop] = $val' "$output" > "$output.tmp" && mv "$output.tmp" "$output"
            echo "Added [$sha256 $filename] checksum to $output"
        fi
    done
else
    echo "Missing argument (key) - Allowed values: 'status' 'last_updated' 'checksums'"
fi
