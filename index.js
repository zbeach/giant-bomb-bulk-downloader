const fetch = require('node-fetch');
const { sleep } = require('./util');
const filenamify = require('filenamify');
const fs = require('fs');

const apiKey = 'API_KEY';
const destination = '/mnt/d/Giant Bomb Archive';

let execSync = require("child_process").execSync;

(
  async () => {
    console.log(`Getting shows...`);
    const shows = await getShows();

    for (show of shows) {
      console.log(`Getting videos for show "${show.title}"...`);
      const videos = await getVideos(show.id);
      console.log(`Downloading videos for show "${show.title}"...`);
      downloadVideos(show);
    }
  }
)();

function downloadVideos(show) {
  // Make show directory if it doesn't already exist
  if (!fs.existsSync(`${destination}/${filenamify(show.title)}`)) {
    console.log(`Making directory ${`${destination}/${filenamify(show.title)}`}`)
    fs.mkdirSync(`${destination}/${filenamify(show.title)}`);
  }
  for (let i = 0, moreResults = true; moreResults; i++) {
    try {
      execSync(
        `npx gb-dl --api-key ${apiKey} --archive --show-name "${show.title}" --video-number ${i} --out-dir "${destination}/${filenamify(show.title)}"`,
        { stdio: "inherit" } // this will allow us to see the console output as it downloads
      );
    } catch (error) {
      console.error(error);
      moreResults = false;
    }
  }
}

async function getShows() {
  const fetchShows = async (apiKey, offset, limit) => await (await fetch(`https://www.giantbomb.com/api/video_shows/?api_key=${apiKey}&offset=${offset}&limit=${limit}&format=json&sort=id:asc`)).json();
  let offset = 0;
  const limit = 100;
  return (await fetchShows(apiKey, offset, limit)).results.map(show => ({ id: show.id, title: show.title }));
}

async function getVideos(showId) {
  const fetchVideos = async (apiKey, offset, limit) => await (await fetch(`https://www.giantbomb.com/api/videos/?api_key=${apiKey}&filter=video_show:${showId},premium:true&offset=${offset}&limit=${limit}&format=json&sort=id:asc`)).json();
  const limit = 100;
  let videos = [];
  for (let moreResults = true, offset = 0; moreResults; offset += limit) {
    console.log(`Getting results starting at index ${offset}...`);
    const response = await fetchVideos(apiKey, offset, limit);
    const responseVideos = response.results.map(video => ({ id: video.id, name: video.name }));
    videos = videos.concat(responseVideos);
    if (responseVideos.length < limit) moreResults = false;
    console.log(`Pausing for rate limit...`);
    await sleep(5);
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
