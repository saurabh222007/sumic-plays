const youtubedl = require('youtube-dl-exec');

async function test() {
  console.log("Testing search...");
  try {
    const output = await youtubedl(`ytsearch1:hello`, {
      dumpSingleJson: true,
      flatPlaylist: true,
      noWarnings: true,
      noCallHome: true,
      noCheckFormats: true,
      youtubeSkipDashManifest: true,
    });
    console.log("Search Output length:", output?.entries?.length || output ? "Success" : "Empty");
  } catch(e) {
    console.error("Search Error:", e.message);
  }

  console.log("Testing stream...");
  try {
    const info = await youtubedl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      format: 'bestaudio[ext=m4a]/bestaudio/best',
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckFormats: true,
      youtubeSkipDashManifest: true,
    });
    console.log("Stream URL:", info.url ? "Found" : "Missing");
  } catch(e) {
    console.error("Stream Error:", e.message);
  }
}

test();
