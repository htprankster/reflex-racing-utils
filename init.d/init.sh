#!/bin/bash

basedir=$(pwd)

echo "**** Install scripts dependencies ****"

apt-get update -y && apt-get install wget unzip xdotool xxd sqlite3 jq -y

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install 24

chown -R abc:abc /config/scripts
find /config/scripts -type f -name "*.sh" -exec chmod +x {} \;
/config/scripts/init-scripts.sh
cd "$basedir"

echo "This script will self-destruct to prevent a rerun on a container reboot..."
rm -f "/custom-cont-init.d/init.sh"
