#!/usr/bin/env bash
set -euo pipefail

# Build a demo APK locally using the saket/Hello-World-Android sample.
# Steps:
# - clone sample (or update)
# - build assembleDebug
# - copy resulting APK to downloads/public
# - recreate vhr-dashboard-demo.zip in downloads

SAMPLE_REPO=${1:-https://github.com/saket/Hello-World-Android.git}
SAMPLE_DIR=${2:-sample-android}
CLONE_ONLY=${3:-false}
SKIP_PREREQ_CHECK=${4:-false}

echo "[INFO] Running build-demo-apk.sh"

if [ "$SKIP_PREREQ_CHECK" != "true" ]; then
  echo "[INFO] Checking Java..."
  if ! command -v java >/dev/null 2>&1; then
    echo "[ERROR] Java not found in PATH. Install JDK (17+) first. Use SKIP_PREREQ_CHECK=true to skip checks or pass CLONE_ONLY=true to only clone the sample." >&2
    if [ "$CLONE_ONLY" = "true" ]; then
      echo "[INFO] CLONE_ONLY requested: skipping build prerequisites check and exiting with success after clone.";
    else
      exit 1
    fi
  fi
  java -version | head -n 1
fi
java -version | head -n 1

if ! command -v git >/dev/null 2>&1; then
  echo "[ERROR] Git not found in PATH. Install Git CLI." >&2
  exit 1
fi

if [ ! -d "$SAMPLE_DIR" ]; then
  echo "[INFO] Cloning sample repo: $SAMPLE_REPO into $SAMPLE_DIR"
  git clone "$SAMPLE_REPO" "$SAMPLE_DIR"
else
  echo "[INFO] Sample dir exists. Updating..."
  (cd "$SAMPLE_DIR" && git pull --ff-only || true)
fi

cd "$SAMPLE_DIR"
if [ "$CLONE_ONLY" = "true" ]; then
  echo "[INFO] CLONE_ONLY set: skipping build step.";
else
  if [ -f gradlew ]; then
  echo "[INFO] Found gradlew wrapper. Using it to build..."
  chmod +x ./gradlew
  ./gradlew assembleDebug
elif [ -f gradlew.bat ]; then
  echo "[INFO] Found gradlew.bat. Using it to build on Windows under bash (requires Wine or cmd available)."
  ./gradlew.bat assembleDebug
else
  echo "[ERROR] gradlew wrapper not found in sample. Please run gradle build manually." >&2
  exit 2
  fi
fi

cd - >/dev/null
# find the APK built in sample-android/app/build/outputs/apk/debug
APK_PATH=$(find "$SAMPLE_DIR" -type f -name "*-debug.apk" | head -n 1 || true)
if [ -z "$APK_PATH" ]; then
  echo "[ERROR] Could not find built debug APK in sample project. Build may have failed." >&2
  exit 3
fi

mkdir -p downloads public
cp "$APK_PATH" downloads/vhr-dashboard-demo.apk
cp "$APK_PATH" public/vhr-dashboard-demo.apk

if [ ! -f downloads/demo_readme.txt ]; then
  cat > downloads/demo_readme.txt <<'EOF'
Ce fichier est un exemple de demo zip contenant un petit fichier README et un fichier APK placeholder pour les tests.
EOF
fi

ZIP_PATH=downloads/vhr-dashboard-demo.zip
if [ -f "$ZIP_PATH" ]; then rm -f "$ZIP_PATH"; fi
zip -j "$ZIP_PATH" downloads/vhr-dashboard-demo.apk downloads/demo_readme.txt || true

# Validate APK with Node script if present
if command -v node >/dev/null 2>&1 && [ -f scripts/check-apk.js ]; then
  node scripts/check-apk.js downloads/vhr-dashboard-demo.apk || true
fi

echo "[INFO] Build complete. APK saved at downloads/vhr-dashboard-demo.apk and public/vhr-dashboard-demo.apk"
echo "[INFO] ZIP path: $ZIP_PATH"
echo "[INFO] Run 'node server.js' to serve the APK or open the downloads folder to verify it is downloadable."
