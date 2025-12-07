FROM node:18-bullseye

ENV NODE_ENV=production
ENV PORT=3000
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH
ENV GRADLE_HOME=/opt/gradle/gradle-8.7
ENV PATH=$GRADLE_HOME/bin:$PATH

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  adb \
  ffmpeg \
  scrcpy \
  openjdk-11-jdk-headless \
  wget \
  unzip \
  && rm -rf /var/lib/apt/lists/*

# Install Gradle 8.7
RUN mkdir -p /opt/gradle && \
  cd /opt/gradle && \
  wget -q https://services.gradle.org/distributions/gradle-8.7-bin.zip && \
  unzip -q gradle-8.7-bin.zip && \
  rm gradle-8.7-bin.zip && \
  ln -s gradle-8.7 current

WORKDIR /usr/src/app

COPY package*.json ./
RUN node -v && npm -v
# Preferred: --omit=dev (newer npm). Fallback to --only=production for older npm to avoid EUSAGE errors
RUN sh -lc 'npm ci --omit=dev || npm ci --only=production'

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
