/*
    => setLeaderboardsFeatures.js
    Adds the following features to the leaderboards files.
        - New property for censored maps titles and players names.
        - Tracks records activity of the last 14 days.
        - Extends maps and players object with additional public Steam data and custom properties
        - Formats the JSON objects in a compact format
        - Removes blacklisted players records
    ---
    This script is part of the htprankster/reflex-racing-utils project.
    LICENSE.md => GNU GPL v3 / 2026
*/

import * as fs from 'fs';
import { TextCensor, RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

switch(process.argv[2]) {
    case 'filter':
        const argsFilter = process.argv.slice(1);
        try {
            const filterDATA = getFileContent(argsFilter[2]);
            if(filterDATA) {
                const filterOUT = filterLBD(filterDATA);
                fs.writeFileSync(argsFilter[2], filterOUT, { encoding: 'utf8', flag: 'w+', mode: 0o755 });
            }
        }
        catch(err) {
            console.error(err);
        }
        break;
    case 'activity':
        const argsActivity = process.argv.slice(1);
        try {
            const latestMaps = getFileContent(argsActivity[2]);
            const latestRecs = getFileContent(argsActivity[3]);
            const prevRecs = getFileContent(argsActivity[4]);
            const prevActivity = (JSON.parse(getFileContent(argsActivity[5])) || []);
            if(latestMaps && latestRecs && prevRecs) {
                const recordsOUT = activityLBD(latestMaps, latestRecs, prevRecs, prevActivity);
                if(recordsOUT) {
                    fs.writeFileSync(argsActivity[5], recordsOUT, { encoding: 'utf8', flag: 'w+', mode: 0o755 });
                }
            }
        }
        catch(err) {
            console.error(err);
        }
        break;
    case 'save':
        const argsSaveInfo = process.argv.slice(1);
        try {
            const currentInfo = getFileContent(argsSaveInfo[2]) || '[]';
            const newInfo = argsSaveInfo[3];
            const ignoreProperty = argsSaveInfo[4] || false;
            if(currentInfo && newInfo) {
                const latestInfoObj = addExtraInfo(currentInfo, newInfo, ignoreProperty);
                if(latestInfoObj) {
                    fs.writeFileSync(argsSaveInfo[2], latestInfoObj, { encoding: 'utf8', flag: 'w+', mode: 0o755 });
                }
            }
        }
        catch(err) {
            console.error(err);
        }
        break;
    case 'extend':
        const argsExtend = process.argv.slice(1);
        try {
            const extraDetails = getFileContent(argsExtend[2]);
            const obj = getFileContent(argsExtend[3]);
            if(extraDetails !== '' && obj) {
                const finalObj = extendObjDetails(extraDetails, obj);
                if(finalObj) {
                    fs.writeFileSync(argsExtend[3], finalObj, { encoding: 'utf8', flag: 'w+', mode: 0o755 });
                }
            }
        }
        catch(err) {
            console.error(err);
        }
        break;
    case 'plstats':
        const argsPlayerStats = process.argv.slice(1);
        try {
            const latestWorkshopInfo = getFileContent(argsPlayerStats[2]);
            const latestPlayersInfo = getFileContent(argsPlayerStats[3]);
            const latestRecs = getFileContent(argsPlayerStats[4]);
            if(latestRecs) {
                const playerStatsObj = addPlayerStats(latestWorkshopInfo, latestPlayersInfo, latestRecs);
                if(playerStatsObj) {
                    fs.writeFileSync(argsPlayerStats[3], playerStatsObj, { encoding: 'utf8', flag: 'w+', mode: 0o755 });
                }
                //return true;
            }
        }
        catch(err) {
            console.error(err);
        }
        break;
    case 'format':
        const argsFormat = process.argv.slice(1);
        try {
            const obj = getFileContent(argsFormat[2]);
            if(obj) {
                const formattedObj = formatJSON(obj);
                if(formattedObj) {
                    fs.writeFileSync(argsFormat[2], formattedObj, { encoding: 'utf8', flag: 'w+', mode: 0o755 });
                }
            }
        }
        catch(err) {
            console.error(err);
        }
        break;
    case 'blacklist':
        const argsBlacklist = process.argv.slice(1);
        try {
            const latestRecs = getFileContent(argsBlacklist[2]);
            const blacklist = getFileContent(argsBlacklist[3]);
            if(latestRecs) {
                if(blacklist) {
                    const filteredRecsOut = blacklistLDB(latestRecs, blacklist.split('\n'));
                    if(filteredRecsOut) {
                        fs.writeFileSync(argsBlacklist[2], filteredRecsOut, { encoding: 'utf8', flag: 'w+', mode: 0o755 });
                    }
                }
                else {
                    console.log('Blacklist is empty');
                }
            }
        }
        catch(err) {
            console.error(err);
        }
        break;
    default:
        console.error('['+process.argv[1]+'] Missing argument: Allowed values are "filter" -  "activity" - "save" - "extend" - "plstats" - "blacklist"')
        break;
}

function getFileContent(path, encode = 'utf8') {
    if(fs.existsSync(path)) {
        return fs.readFileSync(path, encode);
    }

    return false;
}

function filterLBD(data) {
    function debugGremlins(str) {
        let chars = str.split('');
        let unicodes = chars.map(char => {
            const c = char.charCodeAt(0);
            return '\\u'+c.toString(16).padStart(4,'0');
        });
        return unicodes.join('');
    }

    function fixGremlins(str) {
        const GREMLINS = /([\udb40]+|[\udc21]+|[\xCC\xCD]+|[\u200B]+|[\u200C]+|[\u200D]+|[\u200E]+|[\u200F]+|[\uFEFF]+|[\uFFFD]+)/g;
        if(str.includes('<')) {
            str = str.replace(/<\/?[^>]+(>|$)/g, '$');
        }
        return str.replace(GREMLINS, '$');
    }

    const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });
    const censor = new TextCensor();
    let jsonObj = JSON.parse(data);
    let i = 0;
    while(i < jsonObj.length) {
        if(jsonObj[i].name) {
            const editedName = fixGremlins(jsonObj[i].name);
            const nameMatch = matcher.getAllMatches(editedName);
            jsonObj[i].censored_name = censor.applyTo(editedName, nameMatch);
        }

        if(jsonObj[i].title) {
            const editedTitle = fixGremlins(jsonObj[i].title);
            const titleMatch = matcher.getAllMatches(editedTitle);
            jsonObj[i].censored_title = censor.applyTo(editedTitle, titleMatch);
        }

        if(jsonObj[i].description) {
            const editedDescription = fixGremlins(jsonObj[i].description);
            const descriptionMatch = matcher.getAllMatches(editedDescription);
            jsonObj[i].censored_description = censor.applyTo(editedDescription, descriptionMatch);
        }
        i++;
    }
    return JSON.stringify(jsonObj);
}

function activityLBD(latestMapsObj, latestRecObj, prevRecObj, prevActivity = []) {
    function getRecordsByMap(records, map) {
        let output = new Array();
        let r = 0, sequence = false;
        while(r < records.length) {
            if(records[r].map_id === map) {
                output.push(records[r]);
                sequence = true;
            }
            else if(sequence) {
                break;
            }
            r++;
        }

        return output;
    }

    function updateRecordDetails(latestRec, prevRec = {}) {
        let output = {};
        if(Object.keys(prevRec).length > 0) {
            if(latestRec.score !== prevRec.score) {
                //Values are the offset difference
                //If negative, time was overwritten with a slower record since previous check
                output.score = (prevRec.score-latestRec.score);

                if(latestRec.rank !== prevRec.rank) {
                    //If negative, value is amount of rank lost
                    output.rank = (prevRec.rank-latestRec.rank);
                }

                if(latestRec.top_speed !== prevRec.top_speed) {
                    //If negative, top_speed is lower
                    output.top_speed = (latestRec.top_speed-prevRec.top_speed);
                }

                if(latestRec.distance !== prevRec.distance) {
                    //If negative, distance is higher
                    output.distance = (prevRec.distance-latestRec.distance);
                }
            }
        }
        else {
            output = { score: latestRec.score, rank: latestRec.rank, top_speed: latestRec.top_speed, distance: latestRec.distance };
        }
        return output;
    }

    const timestamp = Date.now();
    const mapList = JSON.parse(latestMapsObj);
    const latestRecs = JSON.parse(latestRecObj);
    const prevRecs = JSON.parse(prevRecObj);
    let latestActivity = new Array();
    let activity = new Array();
    let objStr = '';
    let i = 0, j = 0, k = 0;

    while(i < mapList.length) {
        const mapId = mapList[i].id;
        const latestRecsByMap = getRecordsByMap(latestRecs, mapId);
        let objDiff = { map_id: mapId, check_timestamp: timestamp, type: '', details: [] };

        if(latestRecsByMap.length > 0) {
            j = 0;
            const prevRecsByMap = getRecordsByMap(prevRecs, mapId);
            if(prevRecsByMap.length > 0) {
                while(j < latestRecsByMap.length) {
                    let addActivity = true;
                    objDiff.player_id = latestRecsByMap[j].player_id;
                    objDiff.type = 'new_record';
                    objDiff.details = updateRecordDetails(latestRecsByMap[j]);
                    k = 0;
                    while(k < prevRecsByMap.length) {
                        if(latestRecsByMap[j].player_id === prevRecsByMap[k].player_id) {
                            objDiff.details = updateRecordDetails(latestRecsByMap[j], prevRecsByMap[k]);
                            if(Object.keys(objDiff.details).length > 0) {
                                objDiff.type = 'update_record';
                            }
                            else {
                                addActivity = false;
                            }
                            break;
                        }
                        k++;
                    }

                    if(addActivity) {
                        objStr = JSON.stringify(objDiff);
                        latestActivity.push(JSON.parse(objStr));
                    }
                    j++;
                }
            }
            else {
                objDiff.type = 'new_record';
                while(j < latestRecsByMap.length) {
                    objDiff.player_id = latestRecsByMap[j].player_id;
                    objStr = JSON.stringify(objDiff);
                    latestActivity.push(JSON.parse(objStr));
                    j++;
                }
            }
        }
        i++;
    }

    if(prevActivity.length > 0) {
        i = 0;
        const offsetDays = 14;
        while(i < prevActivity.length) {
            if(Math.floor(Math.abs(prevActivity[i].check_timestamp-timestamp)/1000/60/60/24) < offsetDays) {
                activity.push(prevActivity[i]);
            }
            i++;
        }
    }

    if(latestActivity.length > 0) {
        if(activity.length > 0) {
            i = 0;
            while(i < latestActivity.length) {
                j = 0;
                let added = false;
                while(j < activity.length) {
                    if(latestActivity[i].map_id === activity[j].map_id &&
                        latestActivity[i].player_id === activity[j].player_id) {
                        activity[j] = latestActivity[i];
                        added = true;
                    }
                    j++;
                }

                if(!added) {
                    activity.push(latestActivity[i]);
                }
                i++;
            }
        }
        else {
            return JSON.stringify(latestActivity, null, 2);
        }
    }

    return JSON.stringify(activity, null, 2);
}

/*
    This function is used to extend any object in order
    to add useful details as new properties.
    It is currently used to extend the map list and the players list
    with extra info that ReflexRaceDBDownload does not pull.
*/
function extendObjDetails(extraDetailsObj, currentObj) {
    let extraDetailsList = JSON.parse(extraDetailsObj);
    let objList = JSON.parse(currentObj);
    let output = new Array();
    let k = 0;
    for(let i = 0; i < objList.length; i++) {
        if(extraDetailsList.length > 0) {
            for(let j = 0; j < extraDetailsList.length; j++) {
                if(objList[i].id === extraDetailsList[j].id) {
                    objList[i] = {...objList[i], ...extraDetailsList[j]};
                    extraDetailsList.splice(j, 1);
                    k++;
                    break;
                }
            }
        }
        else if(k === 0) {
            break;
        }
        output.push(JSON.stringify(objList[i]));
    }
 
    if(k > 0) {
        if(extraDetailsList.length > 0) {
            console.log('Updated '+k+'/'+(objList.length)+' object'+(k > 1 ? 's' : '')+' and added '+extraDetailsList.length+' new custom entr'+(extraDetailsList.length > 1 ? 'ies' : 'y')+'.');
            return '['+[...output, ...extraDetailsList.map(obj => JSON.stringify(obj))].join(',\n')+']';
        }
 
        console.log('Updated custom properties to '+k+'/'+(objList.length)+' object'+(k > 1 ? 's' : '')+'.');
        return '['+output.join(',\n')+']';
    }
    else if(extraDetailsList.length > 0) {
        console.log('Added '+extraDetailsList.length+' new custom entr'+(extraDetailsList.length > 1 ? 'ies' : 'y')+'.');
        return '['+[...output, ...extraDetailsList.map(obj => JSON.stringify(obj))].join(',\n')+']';
    }
 
    console.log('All objects already include custom properties.');
    return false;
}

/*
    This function creates and updates an extra info object in place that
    will be used to extend the map list.
    The ignoreProperty argument allows for repo maintainers to keep
    their custom properties, such as "map type" and "difficulty", without
    risking to overwrite them when updating an object.
*/
function addExtraInfo(latestWorkshopInfoObj, obj, ignoreProperty = false) {
    let workshopInfoList = JSON.parse(latestWorkshopInfoObj);
    let workshopObj = JSON.parse(obj);
    if(workshopInfoList.length > 0) {
        let updated = false;
        for(let i = 0; i < workshopInfoList.length; i++) {
            if(workshopInfoList[i].id === workshopObj.id) {
                if(ignoreProperty && workshopInfoList[i][ignoreProperty]) {
                    workshopObj[ignoreProperty] = workshopInfoList[i][ignoreProperty];
                }
                workshopInfoList[i] = workshopObj;
                updated = true;
                break;
            }
        }
 
        if(!updated) {
            workshopInfoList.push(workshopObj);
        }
 
        return JSON.stringify(workshopInfoList, null, 2);
    }
 
    return JSON.stringify([workshopObj], null, 2);
}

/*
    Calculates extra player statistics to save processing power downstream.
*/
function addPlayerStats(latestWorkshopInfoObj, latestPlayersInfoObj, latestRecObj) {
    function findRecordsByMapId(recordsList, mapId) {
        let mi = 0;
        let mapRecords = new Array();
        while(mi < recordsList.length) {
            if(recordsList[mi].map_id == mapId) {
                mapRecords.push(recordsList[mi]);
            }
 
            mi++;
        }
        return mapRecords;
    }
 
    function getCustomMapValues(workshopList, mapId) {
        let output = {difficulty: 1, type: ['?']};
        for(let i = 0; i < workshopList.length; i++) {
            if(workshopList[i].id === mapId) {
                let difficulty = workshopList[i].custom.difficulty.charAt(0);
                if(!isNaN(difficulty)) {
                    output.difficulty = parseInt(difficulty);
                }
                output.type = workshopList[i].custom.type;
                break;
            }
        }
 
        return output;
    }
 
 
    let workshopInfoList = (latestWorkshopInfoObj ? JSON.parse(latestWorkshopInfoObj) : []);
    let playersInfoList = (latestPlayersInfoObj ? JSON.parse(latestPlayersInfoObj) : []);
    let recordsList = JSON.parse(latestRecObj);
 
    let recordsGR = {}; //Global ranks
    let recordsAll = {}; //Everything else about player records
    let i = 0, prevMapId = '', playersCount = 1, difficultyScore = 1, racingType = {};
    for(i = 0; i < recordsList.length; i++) {
        if(!recordsGR[recordsList[i].player_id]) { recordsGR[recordsList[i].player_id] = 0; }
        if(!recordsAll[recordsList[i].player_id]) { recordsAll[recordsList[i].player_id] = {avg: [], wrs: 0, records: 0, fav: {}}; }
        recordsList[i].rank = parseInt(recordsList[i].rank);

        //Accumulate ranking scores to calculate global ranks later on
        if(prevMapId !== recordsList[i].map_id) {
            playersCount = findRecordsByMapId(recordsList, recordsList[i].map_id).length;
            let mapCustomObj = getCustomMapValues(workshopInfoList, recordsList[i].map_id);
            difficultyScore = mapCustomObj.difficulty;
            racingType = mapCustomObj.type;
        }
        const recordPoints = Math.floor((playersCount/recordsList[i].rank)*difficultyScore);
        recordsGR[recordsList[i].player_id] += recordPoints;
 
        //Same as above but for average ranks
        recordsAll[recordsList[i].player_id].avg.push(recordsList[i].rank);
 
        //World Records
        if(recordsList[i].rank === 1) {
            recordsAll[recordsList[i].player_id].wrs++;
        }
 
        //Total Records
        recordsAll[recordsList[i].player_id].records++;
 
        //Favourite type of racing
        for(let j = 0; j < racingType.length; j++) {
            if(racingType[j] !== '?') {
                recordsAll[recordsList[i].player_id].fav[racingType[j]]++;
            }
        }
    }
 
    let sortedRecords = Object.keys(recordsGR).map((key) => [key, recordsGR[key]]);
    sortedRecords.sort(function(a, b) {
        return a[1] - b[1];
    }).reverse();
 
    let recordsFinal = {};
    for(i = 0; i < sortedRecords.length; i++) {
        recordsFinal[sortedRecords[i][0]] = {
            globalrank: (i+1),
            avgrank: (recordsAll[sortedRecords[i][0]].avg.reduce((partialSum, a) => partialSum + a, 0) / recordsAll[sortedRecords[i][0]].avg.length).toFixed(2),
            wrs: recordsAll[sortedRecords[i][0]].wrs,
            records: recordsAll[sortedRecords[i][0]].records,
            fav: recordsAll[sortedRecords[i][0]].fav
        }
    }
 
    for(i = 0; i < playersInfoList.length; i++) {
        let playerObj = (recordsFinal[playersInfoList[i].id] || {
                globalrank: 0,
                avgrank: 0,
                wrs: 0,
                records: 0,
                fav: {}
            });
 
        playersInfoList[i] = {...playersInfoList[i], ...playerObj};
    }
 
    return JSON.stringify(playersInfoList, null, 2);
}

function formatJSON(obj) {
    let output = new Array();
    let listObj = JSON.parse(obj);
    if(listObj.length > 0) {
        for(let i = 0; i < listObj.length; i++) {
            output.push(JSON.stringify(listObj[i]));
        }

        return '['+output.join(',\n')+']';
    }
    
    return false;
}

/*
    This reads a player id list and removes their records from all
    leaderboards then reindexes the ranks.
    Banned players won't show up on reflex.racing unless they've uploaded at
    least 1 race map to the workshop, in this case people will be able to
    visit their profile but it will be empty of scores as if they never raced before.
*/
function blacklistLDB(latestRecObj, blacklist) {
    if(blacklist.length > 0) {
        if(blacklist.join('').trim() !== '') {
            let i = 0, rank = 1;
            let filteredRecs = new Array();
            let latestRecs = JSON.parse(latestRecObj);
            while(i < latestRecs.length) {
                if(latestRecs[i].rank === 1) {
                    rank = 1;
                }
 
                if(!blacklist.includes(latestRecs[i].player_id)) {
                    latestRecs[i].rank = rank++;
                    filteredRecs.push(JSON.stringify(latestRecs[i]));
                }
                i++;
            }
 
            console.log('Removed '+blacklist.length+' players from the leaderboards.');
            return '['+filteredRecs.join(',\n')+']';
        }
    }
 
    console.log('Blacklist is empty.');
    return false;
}