#!/bin/bash
# This script is part of the htprankster/reflex-racing-utils project.
# LICENSE.md => GNU GPL v3 / 2026

# Updates Reflex Arena and launcher configuration.
# Run after steamtinkerlaunch has been configured through proton.
# See README.md #Build instructions.

stl_name="steamtinkerlaunch"
stl_base="/config/scripts/injector"
stl_cfg="/config/.config/steamtinkerlaunch"
stl_gamecfg="$stl_cfg/gamecfgs"
stl_reflex="/config/.local/share/Steam/steamapps/common/reflexfps"

"$stl_base/$stl_name/$stl_name" yad /config/injector/steamtinkerlaunch/yad/AppRun
"$stl_base/$stl_name/$stl_name" compat add

echo "**** Update injector configurations ****"

cp -f "$stl_base/config/328070.conf" "$stl_gamecfg/id/"
cp -f "$stl_base/config/global.conf" "$stl_cfg/"
cp -f "$stl_base/reflex/game.cfg" "$stl_reflex/"
cp -f "$stl_base/reflex/game_default.cfg" "$stl_reflex/"
echo "Done."