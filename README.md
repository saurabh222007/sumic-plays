<div align="center">
  <img src="fastlane/metadata/android/en-US/images/icon.png" width="120" alt="Sumic Logo" />
  
  <h3>🎧 The YouTube Music client you always wanted</h3>
  <p>🚫 No Ads • 💰 No Subscription • ⚡ Full Control</p>

  [![GitHub Release](https://img.shields.io/github/v/release/saurabh222007/Sumic?style=for-the-badge&logo=github&logoColor=white&labelColor=18181B&color=3B82F6)](https://github.com/saurabh222007/Sumic/releases)
  [![Stars](https://img.shields.io/github/stars/saurabh222007/Sumic?style=for-the-badge&logo=github&logoColor=white&labelColor=18181B&color=F59E0B)](https://github.com/saurabh222007/Sumic/stargazers)
  [![License](https://img.shields.io/github/license/saurabh222007/Sumic?style=for-the-badge&labelColor=18181B&color=EF4444)](LICENSE)
</div>

---

## 🚀 Overview

Sumic is a fast, offline-first YouTube Music client built for Android. It is fully open-source, features a stunning Material You interface, and supports high-fidelity audio playback, custom theme creation, playlist tagging, and playlist imports from Spotify, YouTube Music, M3U, and CSV formats.

---

## 📸 Preview

<div align="center">
  <img src="screenshots/Home.png" width="140" alt="Home Screen"/>
  <img src="screenshots/Now Playing.png" width="140" alt="Now Playing"/>
  <img src="screenshots/History.png" width="140" alt="History"/>
  <img src="screenshots/Stats.png" width="140" alt="Stats"/>
  <br/>
  <img src="screenshots/Library.png" width="140" alt="Library"/>
  <img src="screenshots/Settings.png" width="140" alt="Settings"/>
  <img src="screenshots/About.png" width="140" alt="About"/>
</div>

---

## ✨ Features

### 🎵 Core Experience
- **Ad-Free Playback** – Enjoy uninterrupted music.
- **Full Library Sync** – Keep your playlists and library updated.
- **Encrypted Offline Caching** – Save music securely for offline listening.
- **Background Playback** – Listen while using other apps or with your screen off.

### 📥 Import & Playlist Management
- **Spotify Playlist Importer** – Paste any public Spotify playlist share link to automatically search, match, and import songs into a new local playlist in the background.
- **M3U & CSV Playlist Support** – Import playlists directly from standard `.m3u` and `.csv` files.
- **YouTube Music Import** – Synchronize and import remote YouTube Music playlists to editable local playlists.
- **Playlist Tags & Organization** – Group, filter, and organize your music library by tagging playlists with custom names and colors.

### 🔊 Audio Engine
- **Gapless Playback** – Seamless transitions between tracks.
- **Crossfade Engine** – Smooth fade-in/fade-out between songs.
- **Silence Skipping** – Auto-skip silent segments.
- **Loudness Normalization** – Consistent volume using EBU R128 standards.
- **Tempo & Pitch Control** – Adjust audio speed and key.
- **System EQ Integration** – Work with system equalizers.

### 🎨 Themes & Customization
- **Material You** – Dynamic color themes matching your wallpaper.
- **Theme Creator** – Design your own dynamic color palette using seed colors (Primary, Secondary, Tertiary, Neutral) and export/import your themes.
- **Curated Presets** – Select from premium color palettes (like Spotify Green).
- **Multiple Player Layouts** – Select from Classic, Modern, Minimal, Cinematic, and Metro interfaces.
- **Interactive Visuals** – Enable the modern squiggly progress bar and swipe gestures to skip songs.

### 🎤 Lyrics & Sharing
- **Synced Lyrics V2** – Immersive, word-by-word real-time synced lyrics with translation support, Japanese/Korean romanization, and custom text sizes.
- **Lyrics Sharing** – Share lyrics as text or generate premium image cards for social sharing.

### 🔌 Integrations
- **Discord Rich Presence** – Show off what you're listening to on Discord in real-time.
- **Last.fm Scrobbling** – Sync your listening history automatically to Last.fm.
- **Update Checker** – Receive notifications when a new version of the app is available.

---

## 🧠 Architecture

Built using modern Android engineering principles:
- **MVVM + Clean Architecture** for clear separation of concerns.
- **Unidirectional Data Flow (UDF)** for predictable state management.
- **Modular Design** to keep the codebase maintainable and scalable.

---

## 🛠 Tech Stack

| Layer | Stack |
|:---|:---|
| **Language** | Kotlin |
| **UI** | Jetpack Compose + Material 3 |
| **Audio** | Media3 / ExoPlayer |
| **Dependency Injection** | Hilt |
| **Database** | Room (Encrypted) |
| **Networking** | Ktor + Retrofit |
| **Concurrency** | Coroutines + Flow |
| **Build Tool** | Gradle KTS |

---

## 📂 Project Structure

```bash
sumic/
├── app/          # Main application module (UI, state, player service)
├── innertube/    # YouTube Music API client
├── lrclib/       # Real-time synced lyrics integration
├── kizzy/        # Discord Rich Presence module
├── canvas/       # Ambient visualization canvas
├── lastfm/       # Last.fm integration for scrobbling
└── kugou/        # Kugou Music client (fallback lyrics)
```

---

## 🛠 Getting Started

### Requirements
- **IDE**: Android Studio Ladybug+
- **JDK**: JDK 17
- **SDK**: Android SDK 34+

### Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/saurabh222007/Sumic.git
   cd Sumic
   ```
2. Open the project in Android Studio.
3. Sync Gradle and build the project.
4. Click **Run** ▶ to deploy to your device.

---

## ⚖️ License & Legal

- Sumic is an independent client and is not affiliated with YouTube or Google.
- Licensed under the **GPL-3.0 License**.

---

## 👤 Author

Developed and maintained by **someone** ([@saurabh222007](https://github.com/saurabh222007)).
