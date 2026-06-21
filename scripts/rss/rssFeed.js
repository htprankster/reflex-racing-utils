/*
    => rssFeed.js
    Converts the input RSS feed to JSON then exports it to a JS variable.
    ---
    This script is part of the htprankster/reflex-racing-utils project.
    LICENSE.md => GNU GPL v3 / 2026
*/

let fs = require('fs');
let feed2json = require('feed2json');

async function exportRSS(streamFile, outputFile) {
    const streamList = getFileContent(streamFile, true);
    if(streamList.length > 0) {
        let rssCollection = new Array();
        for(let i = 0; i < streamList.length; i++) {
            const DATA = getFileContent(streamList[i].rss);
            if(DATA) {
                rssCollection.push(await formatRSS(DATA, streamList[i].title, streamList[i].description, streamList[i].limit, streamList[i].startYear));
            }
        }

        if(rssCollection.length > 0) {
            fs.writeFileSync(outputFile, JSON.stringify(rssCollection, null, 2), { encoding: 'utf8', flag: 'w+', mode: 0o755 });
            console.log('Saved all RSS feeds to '+outputFile);
            return true;
        }
    }
    else {
        console.log('File "'+streamFile+'" not found. Exiting.');
    }
    return false;
}

function formatRSS(DATA, streamTitle, streamDescription, streamLimit, streamStartYear = 0, saveFile = false) {
    return new Promise((resolve) => {
        feed2json.fromString(DATA, null, (err, json) => {
            let rssFeedCollection = new Array();
            json.title = streamTitle;
            json.description = streamDescription;
            for(let j = 0; j < json.items.length; j++) {
                if(new Date(json.items[j].date_published).getFullYear() >= streamStartYear) {
                    delete json.items[j].guid;
                    delete json.items[j].summary;
                    json.items[j].content_html = json.items[j].content_html.replaceAll('\t','').replaceAll("'",'&apos;');
                    rssFeedCollection.push(json.items[j]);
                    if(rssFeedCollection.length >= streamLimit) {
                        break;
                    }
                }
            }

            json.items = rssFeedCollection;

            if(saveFile) {
                fs.writeFileSync(saveFile+'.json', JSON.stringify(json), { encoding: 'utf8', flag: 'w+', mode: 0o755 });
            }
            resolve(json);
        });
    });
}

function getFileContent(path, parse = false, encode = 'utf8') {
    if(fs.existsSync(path)) {
        const output = fs.readFileSync(path, encode);
        if(parse) {
            return JSON.parse(output);
        }
        return output;
    }

    return false;
}

if(process.argv[2]) {
    if(process.argv[3]) {
        return exportRSS(process.argv[2], process.argv[3]);
    }
    else {
        console.error('['+process.argv[1]+'] Missing argument: Output file name.');
    }
}
else {
    console.error('['+process.argv[1]+'] Missing argument: RSS file');
}

return false;