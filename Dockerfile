FROM node:18-slim

# Install runtime deps required by yt-dlp (python3) and optional ffmpeg
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend dependencies only to keep image small
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy the rest of the repo
COPY . .

EXPOSE 5000

# Start the backend service
CMD ["sh", "-c", "cd backend && npm run start"]
