const ytdl = require('ytdl-core');

async function test() {
  console.time('ytdl-core');
  try {
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
    console.timeEnd('ytdl-core');
    console.log('Stream URL:', format.url.substring(0, 50) + '...');
  } catch(e) {
    console.timeEnd('ytdl-core');
    console.error('Error:', e.message);
  }
}

test();
