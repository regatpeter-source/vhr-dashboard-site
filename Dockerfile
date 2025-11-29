FROM node:18-bullseye

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update && apt-get install -y --no-install-recommends \
  adb \
  ffmpeg \
  scrcpy \
  build-essential \
  python3 \
  libsqlite3-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
# Try `npm ci` first for reproducible builds; if `npm ci` fails (lockfile mismatch),
# fall back to `npm install --production` so build doesn't fail on Render where
# package-lock.json may be out-of-sync. This avoids hard failures in CI builds.
RUN npm ci --omit=dev || npm install --production --omit=dev --unsafe-perm

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
