#!/bin/bash
# This script is part of the htprankster/reflex-racing-utils project.
# LICENSE.md => GNU GPL v3 / 2026

# Downloads RSS feeds as arguments for rssFeed.js then saves
# the result in a JS variable which will be used by reflex.racing.

filename="rss.json"
streamlist="streamList.json"
mnt="/external/rss"

mkdir -p "$mnt"

echo "**** Retrieve all RSS feeds to file ****"
echo $(cat "$streamlist") | jq -c '.[]' | while read -r row; do
  url=$(echo "$row" | jq -r '.url')
  rss=$(echo "$row" | jq -r '.rss')
  echo "Saving $url to $rss..."
  curl -sS "$url" -o "$rss"
done
echo "Done."

echo "**** Encode to reflex.racing format ****"
node rssFeed.js "$streamlist" "$filename"
echo "Done."

echo "**** Export to docker volume mount ****"
cp -f "$filename" "$mnt"
echo "Done."

echo "**** Update metadata ****"
/config/scripts/metadata.sh status rss active
/config/scripts/metadata.sh last_updated rss
/config/scripts/metadata.sh sha256 rss "$mnt"

echo "**** Clean up old files ****"
rm -f *.xml* "$filename"
echo "Done."