FROM node:18-bullseye

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update && apt-get install -y --no-install-recommends \
  adb \
  ffmpeg \
  scrcpy \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN node -v && npm -v
# Preferred: --omit=dev (newer npm). Fallback to --only=production for older npm to avoid EUSAGE errors
RUN sh -lc 'npm ci --omit=dev || npm ci --only=production'

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
