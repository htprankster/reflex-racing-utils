#!/bin/bash
# This script is part of the htprankster/reflex-racing-utils project.
# LICENSE.md => GNU GPL v3 / 2026

echo "**** Initialize scripts dependencies ****"

cd /config/scripts/injector
./installInjector.sh
cd /config/scripts/rss
npm install
cd /config/scripts/steamworks
npm install
mkdir -p /config/scripts/steamworks/reflexracedbdownload/
cd /config/scripts/steamworks/reflexracedbdownload/
wget https://github.com/htprankster/reflex-racing-utils/releases/download/ReflexRaceDBDownload/Reflex-Racing-DB-20260620-Win.zip -O ReflexRaceDBDownload.zip
unzip ReflexRaceDBDownload.zip
rm -f ReflexRaceDBDownload.zip
chown -R abc:abc .
echo "Done."