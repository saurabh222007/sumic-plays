import express from 'express';
import cors from 'cors';
import musicRoutes from './routes/music';
import lyricsRoutes from './routes/lyrics';
import importRoutes from './routes/import';
import dotenv from 'dotenv';

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
