#!/bin/bash
# This script is part of the htprankster/reflex-racing-utils project.
# LICENSE.md => GNU GPL v3 / 2026

# Downloads Reflex Arena racing leaderboards, applies profanity censoring
# to maps/players names, generates and keeps track of records activity
# and exports them to json format.

base_dir="/config/scripts/steamworks"
ldb="$base_dir/reflexracedbdownload/racestats.sqlite"
maps="$base_dir/exported_maps.json"
records="$base_dir/exported_records.json"
players="$base_dir/exported_players.json"
blacklist="$base_dir/blacklist.txt"


ext_dir="/external/leaderboards/latest"
ext_maps="$ext_dir/ldb_maps.json"
ext_records="$ext_dir/ldb_records.json"
ext_players="$ext_dir/ldb_players.json"
ext_activity="$ext_dir/ldb_activity.json"
ext_noedit_maps="$ext_dir/ldb_noedit_maps.json"
ext_noedit_records="$ext_dir/ldb_noedit_records.json"
ext_noedit_players="$ext_dir/ldb_noedit_players.json"
# You can manually edit the files inside /external/leaderboards/custom 
cst_dir="/external/leaderboards/custom"
cst_maps="$cst_dir/extra_maps_info.json"
cst_players="$cst_dir/extra_players_info.json"

# Place your Steam web api key inside this file.
# Refer to the official Steam documentation on how to create one: 
# https://steamcommunity.com/dev/apikey
# Terms of use:
# https://steamcommunity.com/dev/apiterms
steam_web_api="steamapi.txt"
touch "$steam_web_api"
apikey=$(cat "$steam_web_api")

# Set 1 as script argument to pull all available data from the steam web api.
# Note that this is resource expensive, use cron to run this only once a day.
refresh_all_data="${1:-0}"

mkdir -p "$ext_dir"
mkdir -p "$cst_dir"
touch "$ext_maps"
touch "$ext_records"
touch "$ext_players"
touch "$blacklist"
            
get_player_info() {
    steam_web_api="$1"
    player_id="$2"
    out_file="$3"
    playerobj=$(curl -s "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=$steam_web_api&steamids=$player_id" -H "Content-Type: application/x-www-form-urlencoded")
    if echo "$playerobj" | jq type 1>/dev/null 2>&1; then
        local obj=$(echo "$playerobj" | jq -r "{id: $player_id | tostring, name: (.response.players[].personaname // \"[deleted]\") | tostring, avatar: (.response.players[].avatarfull // \"null\") | tostring, country: (.response.players[].loccountrycode // \"null\") | tostring, tags: []}")
        node setLeaderboardsFeatures.js save "$out_file" "$obj" "tags"
        echo "$obj"
    else
        echo 1
    fi
}

get_map_info() {
    map_id="$1"
    out_file="$2"
    mapobj=$(curl -s -X POST "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/" -H "Content-Type: application/x-www-form-urlencoded" -d "itemcount=1" -d "publishedfileids[0]=$mapid")
    if echo "$mapobj" | jq type 1>/dev/null 2>&1; then
        local obj=$(echo "$mapobj" | jq -r "{id: $map_id | tostring, creator: (.response.publishedfiledetails[].creator // \"null\") | tostring, file_size: (.response.publishedfiledetails[].file_size // \"null\") | tostring, time_created: (.response.publishedfiledetails[].time_created // \"null\") | tostring, time_updated: (.response.publishedfiledetails[].time_updated // \"null\") | tostring, custom: { type: [\"?\"], difficulty: \"?\"}}")
        node setLeaderboardsFeatures.js save "$out_file" "$obj" "custom"
        echo "$obj"
    else
        echo 1
    fi
}

steamworks_process() {
    out=$(pgrep -a -f "ReflexRaceDBDownload.exe" | grep -v 'proton' | grep -v 'windows' | cut -d ' ' -f 1)
    echo "$out"
}

echo "**** Download the leaderboards ****"
su - abc -c "steam steam://rungameid/328070 &"
echo "Launching Reflex Arena to trigger the injected script."
echo "Looking for ReflexRaceDBDownload process, timeout set to [5 minutes]..."

timeout_start=0
while [ -z "$(steamworks_process)" ]; do
    if [ "$timeout_start" -ge 60 ]; then
        echo "Steamworks script is taking too long to start and will likely hang during leaderboards download."
        echo "Consider increasing timeout time or upgrading your host. Exiting..."
        ./closeReflex.sh
        /config/scripts/metadata.sh status leaderboards stall
        exit 1
    fi
    timeout_start=$((timeout_start+1))
    sleep 5
done

timeout_download=0
while true; do
    if [ -z "$(steamworks_process)" ]; then
        echo "Download complete. Saving to file..."
        sleep 30s
        if [ -s "$ldb" ]; then
            echo "Database saved to $ldb file!"
            ./closeReflex.sh
            /config/scripts/metadata.sh status leaderboards active

            echo "**** Convert leaderboards to JSON ****"
            sqlite3 -header -json "$ldb" 'select CAST(id AS TEXT) AS id, title, preview_url from tblMap;' > $maps
            echo "Successfully exported maps to $maps"
            cp -f "$maps" "$ext_noedit_maps"
            sqlite3 -header -json "$ldb" 'select CAST(map_id AS TEXT) as map_id, CAST(player_id AS TEXT) as player_id, rank, score, top_speed, distance from tblRecord;' > $records
            echo "Successfully exported records to $records"
            cp -f "$records" "$ext_noedit_records"
            sqlite3 -header -json "$ldb" 'select CAST(id AS TEXT) AS id, name from tblPlayer;' > $players
            echo "Successfully exported players to $players"
            cp -f "$players" "$ext_noedit_players"

            echo "**** Apply blacklist ****"
            touch "$blacklist"
            node setLeaderboardsFeatures.js blacklist "$records" "$blacklist"

            echo "**** Extend leaderboards data ****"
            if [[ ! -e "$cst_maps" ]]; then
                echo "Creating custom map object file..."
                echo "[]" > "$cst_maps"
            fi
            
            if [[ ! -e "$cst_players" ]]; then
                echo "Creating custom player object file..."
                echo "[]" > "$cst_players"
            fi
            
            if [[ ! -e "$ext_activity" ]]; then
                echo "Creating activity object file..."
                echo "[]" > "$ext_activity"
            fi
            
            echo "Updating map objects with previously saved extra info..."
            node setLeaderboardsFeatures.js extend "$cst_maps" "$maps"
            
            echo "Updating player objects with previously saved extra info..."
            node setLeaderboardsFeatures.js plstats "$cst_maps" "$cst_players" "$records"
            node setLeaderboardsFeatures.js extend "$cst_players" "$players"
            
            new_steam_info=0
            echo "Checking for new maps..."
            echo $(cat "$maps") | jq -r ".[] | select(has(\"custom\") | not) | .id" | while read -r mapid; do
                mapinfo=$(get_map_info "$mapid" "$cst_maps")
                if [ "$mapinfo" != 1 ]; then
                    echo "Map: $mapid => Checking if mapper exists in players list..."
                    mapperid=$(echo "$mapinfo" | jq -r ".creator")
                    if [ ! -z "$mapperid" ] && [ "$mapperid" != "null" ]; then
                        if ! jq -e --arg mapobj "$mapperid" '.[] | select(.id == $mapobj)' "$players" > /dev/null; then
                            echo "Mapper $mapperid is missing, will fix the players list..."
                            get_player_info "$apikey" "$mapperid" "$cst_players"
                        fi
                        echo "Checks completed for map $mapid"
                    else
                        echo "Incomplete JSON setup for map $mapid, skipping."
                    fi
                    new_steam_info=$((new_steam_info+1))
                else
                    echo "ERROR: Could not check info for map $mapid"
                fi
            done

            if [ "$refresh_all_data" -eq 1 ]; then
                echo "Refreshing all players info..."
                echo $(cat "$players") | jq -r ".[] | .id" | while read -r playerid; do
                    #Runtime estimate 25 minutes
                    get_player_info "$apikey" "$playerid" "$cst_players"
                done
            
                echo "Refreshing all maps info..."
                echo $(cat "$maps") | jq -r ".[] | .id" | while read -r mapid; do
                    #Runtime estimate 8 minutes
                    get_map_info "$mapid" "$cst_maps"
                done
                /config/scripts/metadata.sh status leaderboards paused
            fi
            
            if [[ "$new_steam_info" -gt 0 || "$refresh_all_data" -eq 1 ]]; then
                node setLeaderboardsFeatures.js extend "$cst_maps" "$maps"
                node setLeaderboardsFeatures.js plstats "$cst_maps" "$cst_players" "$records"
                node setLeaderboardsFeatures.js extend "$cst_players" "$players"
            else
                echo "No new maps found".
            fi

            echo "**** Update players activity ****"
            node setLeaderboardsFeatures.js activity "$maps" "$records" "$ext_records" "$ext_activity"
            echo "Done."
            
            echo "**** Censor profanity ****"
            node setLeaderboardsFeatures.js filter "$maps"
            node setLeaderboardsFeatures.js filter "$players"
            echo "Done."
            
            echo "**** Format JSON files ****"
            node setLeaderboardsFeatures.js format "$maps"
            node setLeaderboardsFeatures.js format "$players"
            node setLeaderboardsFeatures.js format "$cst_maps"
            node setLeaderboardsFeatures.js format "$cst_players"
            node setLeaderboardsFeatures.js format "$ext_activity"
            echo "Done."

            echo "**** Export to docker volume mount ****"
            cp -f "$maps" "$ext_maps"
            cp -f "$records" "$ext_records"
            cp -f "$players" "$ext_players"
            cp -f "$ldb" "$ext_dir/"
            echo "Done."

            echo "**** Update metadata ****"
            /config/scripts/metadata.sh last_updated leaderboards
            /config/scripts/metadata.sh sha256 leaderboards "$ext_dir"

            echo "**** Clean up old files ****"
            rm -f "$maps" "$records" "$players"
            echo "Done."

            echo "Successfully generated all leaderboards!"
        else
            echo "Something went wrong when generating the sqlite file! Re-run the script."
            ./closeReflex.sh
            /config/scripts/metadata.sh status leaderboards shift
        fi
        break
    else
        if [[ "$timeout_download" -ge 15 ]]; then
            echo "Request timeout limit reached!"
            ./closeReflex.sh
            /config/scripts/metadata.sh status leaderboards stall
            break
        else
            echo "Downloading, please wait... [Timeout: $((15-$timeout_download)) min. left]"
            sleep 1m
        fi
        timeout_download=$((timeout_download+1))
    fi
done
