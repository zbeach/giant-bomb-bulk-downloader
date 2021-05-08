// Set these two variables yourself!
const apiKey = 'YOUR_API_KEY_HERE';
const destination = '/mnt/d/Giant Bomb Archive';

const { pause } = require('./util');
const fetch = require('node-fetch');
const fs = require('fs');
const filenamify = require('filenamify');
const stream = require("stream");
const { promisify } = require("util");
const got = require("got");

const pipeline = promisify(stream.pipeline);

const archivePath = `${destination}/video-archive.json`;

(async () => {
  if (!fs.existsSync(archivePath)) {
    fs.writeFileSync(archivePath, '[]');
  }

  const limit = 100;
  for (let moreVideos = true, i = 0; moreVideos; i += limit) {
    console.log(`Getting videos ${i}-${i + limit - 1}...`);
    const videos = await getVideosInfo(i, limit);
    console.log(`Downloading videos ${i}-${i + limit - 1}...`);
    await downloadVideos(videos);
    await pause(18000);
  }
})();

async function getVideosInfo(offset, limit) {
  return (
    (
      await (
        await fetch(`
          https://www.giantbomb.com/api/videos/
            ?api_key=${apiKey}
            &format=json
            &filter=premium:true
            &sort=id:asc
            &offset=${offset}
            &limit=${limit}
        `.replace(/\s+/g, ''))
      ).json()
    ).results
  );
}

async function downloadVideos(videos) {
  for (video of videos) {
    console.log(`Downloading "${video.video_show ? video.video_show.title : 'No show'}": "${video.name}"...`);
    await downloadVideo(video, destination);
  }
  await pause(18000);
}

async function downloadVideo(video, destination) {
  if (!isInArchive(video)) {
    // Create show directory if it doesn't already exist
    const showPath = `${destination}/${filenamify(video.video_show ? video.video_show.title : 'No show', { replacement: '' })}`;
    if (!fs.existsSync(showPath)) {
      fs.mkdirSync(showPath);
    }
    
    // Borrowed from @lightpohl and modified a bit
    // https://github.com/lightpohl/gb-dl/blob/cafba731cfdea6afd8917b0cdbb0fca42c486c5c/bin/util.js#L428
    const filePath = `${showPath}/${filenamify(video.name, { replacement: '' })}.mp4`;
    try {
      await pipeline(
        got
          .stream(`${getHighestQualityVideoUrl(video)}?api_key=${apiKey}`)
          .on('downloadProgress', progress => {
            printProgress(progress);
          })
          .on('end', () => {
            () => { process.stdout.write('\n'); }
            console.log('\nDownload complete!');
          }),
        fs.createWriteStream(filePath)
      );
    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
    addToArchive(video);
    await pause(18000);
  }
  else {
    console.log(`"${video.video_show ? video.video_show.title : 'No show'}": "${video.name}" has already been downloaded. Skipping...`)
  }
}

// Borrowed from @lightpohl
// https://github.com/lightpohl/gb-dl/blob/cafba731cfdea6afd8917b0cdbb0fca42c486c5c/bin/util.js#L322
function printProgress({ percent, total, transferred }) {
  const BYTES_IN_MB = 1000000;

  let line = `downloading...`;

  if (transferred > 0) {
    /*
     * Got has a bug where "percent" will be 1 for a moment when the download starts.
     * Ignore percent until transfer has started.
     */
    let percentRounded = (percent * 100).toFixed(2);
    line += ` ${percentRounded}%`;

    if (total) {
      let totalMBs = total / BYTES_IN_MB;
      let roundedTotalMbs = totalMBs.toFixed(2);
      line += ` of ${roundedTotalMbs} MB`;
    }
  }

  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(line);
};

// Borrowed from @lightpohl
// https://github.com/lightpohl/gb-dl/blob/cafba731cfdea6afd8917b0cdbb0fca42c486c5c/bin/util.js#L466
function getHighestQualityVideoUrl(video) {
  const qualities = [ 'hd', 'high', 'low', 'mobile' ];
  for (quality of qualities) {
    const urlOfQuality = video[`${quality}_url`];
    if (urlOfQuality) {
      return urlOfQuality;
    }
  }
}

function isInArchive(video) {
  const archive = JSON.parse(fs.readFileSync(archivePath));
  return archive.map(video => video.url).includes(getHighestQualityVideoUrl(video));
}

function addToArchive(video) {
  const archive = JSON.parse(fs.readFileSync(archivePath));
  archive.push({ id: video.id, url: getHighestQualityVideoUrl(video) });
  fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
}