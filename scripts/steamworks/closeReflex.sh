#!/bin/bash
# This script is part of the htprankster/reflex-racing-utils project.
# LICENSE.md => GNU GPL v3 / 2026

echo "Exiting Reflex Arena..."
pkill -f reflex.exe
sleep 5s
echo "Game was successfully closed."
zrproc=$(pgrep -a -f "ReflexRaceDBDownload.exe")
if [ -n "$zrproc" ]; then
    echo "Found steamworks queries still running. Exiting..."
    pkill -f ReflexRaceDBDownload.exe
    echo "Done."
fi