const ytSearch = require('yt-search');

async function test() {
  console.time('yt-search');
  const r = await ytSearch('shesha');
  const videos = r.videos.slice(0, 10);
  console.timeEnd('yt-search');
  console.log('Results:', videos.length);
  if (videos.length > 0) {
    console.log(videos[0].title, videos[0].videoId, videos[0].url);
  }
}

test();
