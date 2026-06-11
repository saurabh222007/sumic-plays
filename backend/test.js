const { exec } = require('child_process');

exec('.\\yt-dlp.exe "ytsearch2:shesha" --dump-json --no-playlist --ignore-errors --no-warnings', { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
  if (err) {
    console.log('ERROR:', err.message);
    return;
  }
  console.log('STDOUT LENGTH:', stdout.length);
  console.log('STDERR:', stderr);
});
