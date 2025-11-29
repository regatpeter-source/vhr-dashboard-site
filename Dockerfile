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
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
