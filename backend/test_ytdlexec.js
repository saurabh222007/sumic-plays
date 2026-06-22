const youtubedl = require('youtube-dl-exec');

async function test() {
  console.time('yt-dl-exec-g');
  try {
    const output = await youtubedl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      getUrl: true,
      format: 'bestaudio[ext=m4a]/bestaudio/best',
      noWarnings: true,
      noPlaylist: true,
    });
    console.timeEnd('yt-dl-exec-g');
    console.log('Stream URL:', output.substring(0, 50) + '...');
  } catch(e) {
    console.timeEnd('yt-dl-exec-g');
    console.error('Error:', e.message);
  }
}

test();
