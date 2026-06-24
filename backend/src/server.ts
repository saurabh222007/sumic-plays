import express from 'express';
import cors from 'cors';
import musicRoutes from './routes/music';
import lyricsRoutes from './routes/lyrics';
import importRoutes from './routes/import';
import dotenv from 'dotenv';

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allow the frontend origin (set FRONTEND_URL in production)
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors({
  origin: FRONTEND_URL
    ? [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000']
    : true, // allow all origins in development
  credentials: true,
}));
app.use(express.json());

app.use('/api/music', musicRoutes);
app.use('/api/music', importRoutes);
app.use('/api/lyrics', lyricsRoutes);

// Legacy health route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API health route (used by deployments)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Temporary debug endpoint to verify yt-dlp / youtube-dl-exec availability in production
app.get('/debug/yt-dlp-check', async (_req, res) => {
  const results: any = { programmatic: null, cli: null };
  try {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ytdl = require('youtube-dl-exec');
      results.programmatic = { available: Boolean(typeof ytdl === 'function') };
    } catch (e) {
      results.programmatic = { available: false, error: String(e) };
    }

    // CLI check
    try {
      const base = path.resolve(__dirname, '../node_modules/youtube-dl-exec/bin');
      const candidates = [
        path.join(base, 'yt-dlp'),
        path.join(base, 'yt-dlp.exe'),
        path.join(base, 'yt-dlp.cmd'),
      ];
      let binary: string | null = null;
      for (const c of candidates) if (fs.existsSync(c)) { binary = c; break; }
      if (!binary) binary = candidates[1];

      const { stdout, stderr } = await execPromise(`"${binary}" --version`, { timeout: 5000 });
      results.cli = { foundBinary: binary, stdout: String(stdout).trim(), stderr: String(stderr).trim() };
    } catch (cliErr: any) {
      results.cli = { error: cliErr && cliErr.message, stdout: String(cliErr?.stdout || ''), stderr: String(cliErr?.stderr || '') };
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, async () => {

  // Startup diagnostics: check yt-dlp binary and ffmpeg availability
  try {
    const base = path.resolve(__dirname, '../node_modules/youtube-dl-exec/bin');
    const candidates = [
      path.join(base, 'yt-dlp'),
      path.join(base, 'yt-dlp.exe'),
      path.join(base, 'yt-dlp.cmd'),
    ];

    let found = false;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        console.log(`Startup check: found yt-dlp binary at ${c}`);
        found = true;
        break;
      }
    }
    if (!found) console.warn('Startup check: yt-dlp binary not found in node_modules/youtube-dl-exec/bin');

    // Check ffmpeg in PATH
    try {
      const { stdout } = await execPromise('ffmpeg -version', { timeout: 3000 });
      console.log('Startup check: ffmpeg available:', String(stdout).split('\n')[0]);
    } catch (ffErr: any) {
      console.warn('Startup check: ffmpeg not available in PATH or failed to execute:', ffErr && ffErr.message);
    }
  } catch (err) {
    console.warn('Startup diagnostics failed:', err);
  }
  console.log(`Server is running on port ${PORT}`);
});
