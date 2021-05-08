const fetch = require('node-fetch');
const { sleep, isInArchive, getHighestQualityUrl } = require('./util');
const filenamify = require('filenamify');
const fs = require('fs');
const https = require('https');
const path = require('path');

const apiKey = 'API_KEY';
const destination = '/mnt/d/Giant Bomb Archive';

let execSync = require("child_process").execSync;

(
  async () => {
    console.log(`Getting shows...`);
    const shows = await getShows();

    for (show of shows) {
      console.log(`Getting videos for show "${show.title}"...`);
      const videos = await getVideos(show);
      console.log(`Downloading videos for show "${show.title}"...`);
      await downloadVideos(videos);
    }
  }
)();

async function downloadVideos(videos) {
  const archivePath = path.resolve(process.cwd(), "gb-dl-archive.json");
  // Make show directory if it doesn't already exist
  if (videos.length > 1) {
    if (!fs.existsSync(`${destination}/${filenamify(videos[0].show.title)}`)) {
      console.log(`Making directory ${`${destination}/${filenamify(videos[0].show.title)}`}`)
      fs.mkdirSync(`${destination}/${filenamify(videos[0].show.title)}`);
    }
  }
  for (video of videos) {
    if (!isInArchive(video.url, archivePath)) {
      console.log(`Found a show not in the archive!`)
      try {
        const file = fs.createWriteStream(`${destination}/${filenamify(video.show.title)}/${filenamify(video.name)}.mp4`);
        console.log(`Downloading "${video.show.title}": "${video.name}"`);
        const request = https.get(
          `${video.url}?api_key=${apiKey}`,
          response => response.pipe(file)
        );
        // execSync(
        //   `npx gb-dl --api-key ${apiKey} --archive --show-name "${video.show.title}" --video-name "${video.name}" --out-dir "${destination}/${filenamify(video.show.title)}"`,
        //   { stdio: "inherit" } // this will allow us to see the console output as it downloads
        // );
      } catch (error) {
        console.error(error);
        moreResults = false;
      }
      await sleep(19000);
    }
    else console.log(`"${video.name}" is already in the archive. Skipping...`);
  }
}

async function getShows() {
  const fetchShows = async (apiKey, offset, limit) => await (await fetch(`https://www.giantbomb.com/api/video_shows/?api_key=${apiKey}&offset=${offset}&limit=${limit}&format=json&sort=id:asc`)).json();
  let offset = 0;
  const limit = 100;
  return (await fetchShows(apiKey, offset, limit)).results.map(show => ({ id: show.id, title: show.title }));
}

async function getVideos(show) {
  const fetchVideos = async (apiKey, offset, limit) => await (await fetch(`https://www.giantbomb.com/api/videos/?api_key=${apiKey}&filter=video_show:${show.id},premium:true&offset=${offset}&limit=${limit}&format=json&sort=id:asc`)).json();
  const limit = 100;
  let videos = [];
  for (let moreResults = true, offset = 0; moreResults; offset += limit) {
    console.log(`Getting results starting at index ${offset}...`);
    const response = await fetchVideos(apiKey, offset, limit);
    const responseVideos = response.results.map(video => ({ id: video.id, name: video.name, show: show, url: getHighestQualityUrl(video) }));
    videos = videos.concat(responseVideos);
    if (responseVideos.length < limit) moreResults = false;
    console.log(`Pausing for rate limit...`);
    await sleep(19000);
  }
  return videos;
}

// async function makeVideosJson() {
//   const getVideos = async (apiKey, offset, limit) => await (await fetch(`https://www.giantbomb.com/api/videos/?api_key=${apiKey}&offset=${offset}&limit=${limit}&format=json&sort=id:asc`)).json();
//   let offset = 0;
//   const limit = 100;
//   let response = await getVideos(apiKey, offset, limit);

//   const stream = fs.createWriteStream('./videos.json', { encoding: 'utf8' });
//   stream.write('[\n');
//   for ( ; response.number_of_page_results === limit; offset += limit) {
//     await sleep(20000);
//     response = await (await getVideos(apiKey, offset, limit));
//     const videos = response.results;
//     console.log(videos.map(video => video.name));
    
//     videos.forEach((video) => stream.write(JSON.stringify(video, null, 2) + ',\n'));
//   }
//   stream.write(']');
//   stream.end();
// }
