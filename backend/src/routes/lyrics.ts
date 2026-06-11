import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.get('/', async (req, res) => {
  const { track_name, artist_name } = req.query;
  
  if (!track_name) {
    return res.status(400).json({ error: 'track_name is required' });
  }

  try {
    const response = await axios.get('https://lrclib.net/api/search', {
      params: {
        track_name,
        artist_name
      }
    });

    if (response.data && response.data.length > 0) {
      const bestMatch = response.data[0];
      res.json(bestMatch);
    } else {
      res.status(404).json({ error: 'Lyrics not found' });
    }
  } catch (error) {
    console.error('Lyrics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
});

export default router;
