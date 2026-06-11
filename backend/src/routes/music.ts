import { Router } from 'express';
import { create } from 'youtube-dl-exec';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const router = Router();
const ytdl = create('yt-dlp'); // Using global yt-dlp or the one installed

router.get('/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  try {
    const { stdout } = await execPromise(`.\\yt-dlp.exe "ytsearch10:${query}" --dump-json --no-playlist --ignore-errors --no-warnings`, { maxBuffer: 1024 * 1024 * 10 });
    const results = stdout.split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean)
      .map((video: any) => ({
        id: video.id,
        title: video.title,
        artist: video.uploader || video.channel,
        thumbnail: video.thumbnail,
        duration: video.duration,
        url: video.webpage_url
      }));

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

router.get('/stream/:id', async (req, res) => {
  const { id } = req.params;
  const url = `https://www.youtube.com/watch?v=${id}`;

  try {
    const { stdout } = await execPromise(`.\\yt-dlp.exe ${url} -f "bestaudio[ext=m4a]/bestaudio/best" --dump-json --no-warnings`, { maxBuffer: 1024 * 1024 * 10 });
    const streamInfo = JSON.parse(stdout);
    const streamUrl = streamInfo.url;
    
    if (!streamUrl) {
      throw new Error('No stream URL found');
    }

    res.json({ url: streamUrl });
  } catch (error) {
    console.error('Stream info error:', error);
    res.status(500).json({ error: 'Failed to get stream URL' });
  }
});

export default router;
