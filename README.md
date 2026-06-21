# Reflex Racing Utils [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-222?style=flat-square)](https://www.gnu.org/licenses/gpl-2.0) ![Static Badge](https://img.shields.io/badge/Docker-blue?style=flat-square&logo=docker&logoColor=white) ![Static Badge](https://img.shields.io/badge/NodeJS-v24-green?style=flat-square&logo=node.js&logoColor=white) ![Static Badge](https://img.shields.io/badge/Coverage-90%?style=flat-square)
Server-side applications for Reflex Arena race mode, in a docker container.<br>
Allows for retrieving the racing leaderboards and a curated list of RSS feeds.<br>
[About](#about) / [Requirements](#requirements) / [Build](#build) / [Usage](#usage) / [Datasets](#datasets) / [License](#license)
<hr>

## About
With the free-to-play release of Reflex Arena and the influx of new players there was a need to finally automate the entire process of generating the race leaderboards.<br>
However, since the game only supports Windows there are limited options when it comes to hosting it.<br>
This project solves the problem by using containers to download the leaderboards without needing virtualization.

It works by running [Brandon's app](https://github.com/reflexrace/reflexrace.github.io) using a [linuxserver/steam](https://github.com/linuxserver/docker-steam) docker image as base.<br>
My custom nodejs and bash scripts run on top of that to add new features and apply community moderated rules.

## Requirements
### Dependencies
- <b>Docker</b>
- <b>Web browser</b>
  - This is only required for the first time setup
### Host
- <b>Storage</b>: +20Gb
  - Image size: 5.07Gb
  - Volume size: 14.3Gb
- <b>CPU</b>: Intel® Core™ i5 Processor or equivalent
  - Same as Reflex Arena minimum requirements - tested with a 4th gen i5
- <b>RAM</b>: 8Gb
- <b>Graphics</b>: Not required if the CPU can handle the game menu on low settings

## Build
To use the leaderboards script you have to build the image first by running docker cli.<br>
Follow these instructions only once, when setting up the environment for the first time:
1. Build the image: *(starting from the Dockerfile directory)*
```
docker build --tag htprankster/reflex-racing-utils .
```
2. Run docker using the built image to be able to work with the WebRTC browser display:
```bash
docker run -d --name=reflex-racing-utils --security-opt seccomp=unconfined --security-opt apparmor=unconfined -e PUID=1000 -e PGID=1000 -e TZ=Etc/UTC -p 3000:3000 -p 3001:3001 --shm-size="1gb" --restart unless-stopped htprankster/reflex-racing-utils:latest
```
3. Open ```localhost:3000``` on your browser to check the installation process.
4. From the url shown above, login to a Steam account.
5. Install Reflex Arena and keep the default installation directory as ```/config```.
6. Open the game ```Properties``` tab from your library and then ```Compatibility```, enable Steam Play and select ```Proton 9.0```.
7. Wait for both Reflex and Proton to finish installation.
8. Access the container using bash, then run the injector setup script as non-root user:
```bash
su - abc -c "cd /config/scripts/injector/ && ./setupInjector.sh"
```
9. Go back to your browser and add a new non-steam game, selecting the ```steamtinkerlaunch``` executable in ```/config/scripts/injector/steamtinkerlaunch/```.
10. Open the ```Properties``` tab for ```steamtinkerlaunch``` library entry and add the following command as a Launch Option:
```bash
yad /config/scripts/injector/steamtinkerlaunch/yad/AppRun
```
11. Close the window, run steamtinkerlaunch from Steam and wait for it to automatically exit without displaying anything.
12. Open again ```Properties``` and change the Launch Option to ```compat add```.
13. Run steamtinkerlaunch one last time.
14. Restart your container
15. There should now be a new entry on the Steam Play compatibility tool called ```Steam Tinker Launch```, replace ```Proton 9.0``` with it under the ```Compatibility``` tab of Reflex Arena to complete your build setup.

## Usage
### Leaderboards
*(Requires completing all build steps as shown above)*
- To generate the basic original leaderboards: just run Reflex Arena using Steam then check the ```/config/scripts/steamworks/reflexracedbdownload/``` folder for a ```racestats.sqlite``` file.
- Leaderboards with extended features:
  ```bash
  cd /config/scripts/steamworks/ && ./generateLeaderboards.sh
  ```
  This script saves to the ```/external/leaderboards/latest``` directory.<br>
  You can also add *1* as argument to force refresh the maps/players info, however this can be expensive in terms of processing time and [api limits](https://steamcommunity.com/dev/apiterms).
### RSS
*(Only requires building the image to access the container, but it can also be ran as standalone on any linux host)*
- Run the bash script:
  ```bash
  cd /config/scripts/rss/ && ./generateRSS.sh
  ```
  This script saves to the ```/external/rss``` directory.<br>
  More feeds can be added with a new json entry on the ```streamList.json``` file.

## Datasets
Official reflex.racing leaderboards are available on the dedicated [repository](https://github.com/htprankster/reflex-racing-datasets).<br>
I'm currently working on automating the updates every 20 minutes with a downtime window of 1 hour every day during low game activity to allow for general maintenance and a complete maps/players info refresh.<br>
More info on the dedicated branch [README](https://github.com/htprankster/reflex-racing-datasets/blob/main/README.md).

## License
I do not own any rights to [Reflex Arena](https://store.steampowered.com/app/328070/Reflex_Arena).<br>
All of my scripts are released under license [GNU GPL v3](https://github.com/htprankster/reflex-racing-utils/blob/main/LICENSE.md).