const play = require('play-dl');

async function test() {
  console.time('play-dl-stream');
  try {
    const stream = await play.stream('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.timeEnd('play-dl-stream');
    console.log('Stream URL:', stream.url.substring(0, 50) + '...');
  } catch(e) {
    console.timeEnd('play-dl-stream');
    console.error('Error:', e.message);
  }
}

test();
