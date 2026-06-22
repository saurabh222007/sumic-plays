const { exec } = require('child_process');

function test() {
  console.time('yt-dlp-g');
  exec('.\\yt-dlp.exe "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -g -f bestaudio[ext=m4a]/bestaudio/best --no-playlist --no-warnings', (err, stdout, stderr) => {
    console.timeEnd('yt-dlp-g');
    if (err) console.error(err);
    console.log('URL:', stdout.trim().substring(0, 50) + '...');
  });
}

test();
