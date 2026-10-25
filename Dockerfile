FROM node:18-bullseye@sha256:3a933e69ff5df3650c76226e3563d9d193513e9987325d2edf2e41bbd235daec

ENV NODE_ENV=production
ENV PORT=3000
ENV VHR_RUNTIME=web
ENV NO_ADB=1
ENV SMTP_DEBUG=0

WORKDIR /usr/src/app

COPY package*.json ./
RUN node -v && npm -v
# Preferred: --omit=dev (newer npm). Fallback to --only=production for older npm to avoid EUSAGE errors
RUN sh -lc 'npm ci --omit=dev || npm ci --only=production'

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
