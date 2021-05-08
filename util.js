const fs = require('fs');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Got this from lightpohl's [gb-dl](https://github.com/lightpohl/gb-dl/blob/cafba731cfdea6afd8917b0cdbb0fca42c486c5c/bin/util.js#L562)
function isInArchive(url, archivePath) {
  if (!fs.existsSync(archivePath)) {
    return false;
  }
    let archive = JSON.parse(fs.readFileSync(archivePath));
    return archive.includes(url);
}

// Got this from lightpohl's [gb-dl](https://github.com/lightpohl/gb-dl/blob/cafba731cfdea6afd8917b0cdbb0fca42c486c5c/bin/util.js#L548)
function writeToArchive(url, archivePath) {
  let archive = [];

  if (fs.existsSync(archivePath)) {
    archive = JSON.parse(fs.readFileSync(archivePath));
  }

  if (!archive.includes(url)) {
    archive.push(url);
  }

  fs.writeFileSync(archivePath, JSON.stringify(archive, null, 4));
};

//Got this from lightpohl's [gb-dl](https://github.com/lightpohl/gb-dl/blob/cafba731cfdea6afd8917b0cdbb0fca42c486c5c/bin/util.js#L465)
let qualityList = ["hd", "high", "low", "mobile"];
function getHighestQualityUrl(video) {
  let highestQualityUrl = null;
  for (let i = 0; i < qualityList.length; i++) {
    let quality = qualityList[i];
    let qualityUrl = video[`${quality}_url`];

    if (qualityUrl) {
      highestQualityUrl = qualityUrl;
      break;
    }
  }

  return highestQualityUrl;
};

module.exports = { sleep, isInArchive, getHighestQualityUrl };