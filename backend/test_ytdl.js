const ytdl = require('@distube/ytdl-core');

async function test() {
  console.time('ytdl-core-1');
  const info1 = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const format1 = ytdl.chooseFormat(info1.formats, { filter: 'audioonly' });
  console.timeEnd('ytdl-core-1');

  console.time('ytdl-core-2');
  const info2 = await ytdl.getInfo('https://www.youtube.com/watch?v=aRNfSqsgrgE');
  const format2 = ytdl.chooseFormat(info2.formats, { filter: 'audioonly' });
  console.timeEnd('ytdl-core-2');
}

test();
