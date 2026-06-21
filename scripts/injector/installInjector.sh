#!/bin/bash
# This script is part of the htprankster/reflex-racing-utils project.
# LICENSE.md => GNU GPL v3 / 2026

# Installs steamtinkerlaunch and its dependencies required for
# ReflexRaceDBDownload to run with Proton.

stl_name="steamtinkerlaunch"
stl_base="/config/scripts/injector"
stl_injector="$stl_base/$stl_name"
stl_cfg="/config/.config/steamtinkerlaunch"
stl_gamecfgs="$stl_cfg/gamecfgs/id"
stl_reflex="/config/.local/share/Steam/steamapps/common/reflexfps"

echo "**** Install steam injector ****"
cd "$stl_base"
wget https://github.com/sonic2kk/steamtinkerlaunch/archive/refs/tags/v12.12.zip -O steamtinkerlaunch.zip
unzip steamtinkerlaunch.zip
rm steamtinkerlaunch.zip
mv steamtinkerlaunch* "$stl_name/"

cd "$stl_name"
wget https://github.com/sonic2kk/steamtinkerlaunch-tweaks/releases/download/Yad-13.0-x86_64.AppImage/Yad-13.0-x86_64.AppImage -O yad.AppImage
chmod +x yad.AppImage
./yad.AppImage --appimage-extract
rm -f yad.AppImage
mv squashfs-root yad
chmod +x steamtinkerlaunch yad/AppRun
cd yad
ln -s usr/bin/yad AppRun.wrapped

chown -R abc:abc "$stl_base"
echo "Done."