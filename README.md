# 🎵 Sumic - Music Streaming Platform

A modern, Spotify-like music streaming platform built with React, Node.js, and YouTube as the music source.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![React](https://img.shields.io/badge/react-19.2-blue.svg)

---

## ✨ Features

- 🎶 **Search & Play Music** - Search and play millions of songs from YouTube
- 🎨 **Modern UI** - Dark Spotify-like interface with smooth animations
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎵 **Queue Management** - Add to queue, play next, reorder tracks
- 🔀 **Shuffle & Repeat** - Full playback controls
- ❤️ **Liked Songs** - Save your favorite tracks
- 📋 **Playlists** - Create and manage custom playlists
- 📥 **Import Playlists** - Import from Spotify and YouTube
- 🎭 **Moods** - Discover music by mood
- 📊 **Trending** - Explore trending tracks
- ⚡ **Fast Playback** - Optimized streaming with <500ms track switching
- 🎤 **Lyrics** - View synced lyrics (when available)

---

## 🏗️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS 4** - Styling
- **Framer Motion** - Animations
- **Zustand** - State management
- **React Router** - Navigation
- **Axios** - HTTP client

### Backend
- **Node.js 18+** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **youtube-dl-exec** - YouTube stream extraction
- **ytsr** - YouTube search
- **Axios** - HTTP client
- **CORS** - Cross-origin support

---

## 🚀 Quick Start

### Local Development

#### Prerequisites
- Node.js 18 or higher
- npm or yarn

#### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend runs on `http://localhost:5000`

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## 🌐 Deployment

### Quick Deploy (10 minutes)

See **[DEPLOYMENT_QUICKSTART.md](./DEPLOYMENT_QUICKSTART.md)** for step-by-step instructions.

**Backend**: Deploy to Render (free tier)
**Frontend**: Deploy to Cloudflare Pages (free tier)

### Full Deployment Guide

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for comprehensive deployment instructions including:
- Custom domains
- Environment variables
- CORS configuration
- Monitoring and logs
- Performance optimization
- Troubleshooting

---

## 📁 Project Structure

```
sumic/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── lib/            # Utilities
│   │   └── server.ts       # Express server
│   ├── package.json
│   ├── .env.example
│   └── render.yaml         # Render config
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── stores/        # Zustand stores
│   │   ├── hooks/         # Custom hooks
│   │   └── types/         # TypeScript types
│   ├── package.json
│   ├── vite.config.ts
│   └── wrangler.toml      # Cloudflare config
│
├── .kiro/                 # Specs and requirements
├── DEPLOYMENT.md          # Full deployment guide
├── DEPLOYMENT_QUICKSTART.md  # Quick deploy guide
└── README.md             # This file
```

---

## 🎮 Usage

### Search for Music
1. Enter a song, artist, or album in the search bar
2. Click a track to play it
3. Similar songs will automatically queue up

### Manage Queue
- **Play Next**: Right-click track → "Play Next"
- **Add to Queue**: Right-click track → "Add to Queue"
- **Remove**: Right-click track in queue → "Remove"
- **Reorder**: Drag and drop tracks in queue

### Create Playlists
1. Go to "Playlists" tab
2. Click "Create Playlist"
3. Add tracks by right-clicking → "Add to Playlist"

### Import Playlists
1. Go to "Import Playlist" tab
2. Paste Spotify or YouTube playlist URL
3. Wait for import (5-minute timeout)
4. Save as new playlist

---

## ⚙️ Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
PORT=5000
ENABLE_YTDLP=true
DEBUG_YTSR=false
RANK_MIN_DURATION=30
RANK_MAX_DURATION=900
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables

**Development** (`frontend/.env.development`):
```env
VITE_API_BASE_URL=http://localhost:5000
```

**Production** (`frontend/.env.production`):
```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

---

## 🔧 Development

### Run Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Build for Production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Linting

```bash
# Frontend
cd frontend
npm run lint
```

---

## 🐛 Known Issues

### Render Free Tier Sleep
- Backend sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- **Solution**: Upgrade to Starter plan ($7/month) or implement wake-up ping

### YouTube Rate Limiting
- Occasional 429 errors during heavy usage
- **Solution**: Implement request throttling or upgrade to paid tier

### Spotify Import Timeout
- Large playlists (>100 songs) may timeout
- **Solution**: Import is sequential; consider batch processing

---

## 🛣️ Roadmap

- [ ] Autoplay recommendations system (spec in progress)
- [ ] User authentication with profiles
- [ ] Social features (share playlists, follow users)
- [ ] Mobile app (React Native)
- [ ] Offline mode with downloads
- [ ] Advanced audio equalizer
- [ ] Podcast support
- [ ] Concert discovery
- [ ] Artist profiles and bios

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **YouTube** - Music source
- **Piped** - Audio stream proxies
- **Invidious** - Alternative YouTube API
- **yt-dlp** - YouTube downloader
- **Tailwind CSS** - Styling framework
- **Framer Motion** - Animation library
- **Zustand** - State management

---

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for troubleshooting

---

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

---

**Built with ❤️ by the Sumic team**

**Live Demo**: https://sumic.pages.dev (coming soon)
