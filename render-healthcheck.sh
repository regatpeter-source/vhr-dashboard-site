#!/usr/bin/env bash
set -euo pipefail

# Simple health check script used by CI/Render to verify the server is up
# Usage: HEALTH_CHECK_URL=http://localhost:4000/_status ./scripts/render-healthcheck.sh

if [ -z "${HEALTH_CHECK_URL:-}" ]; then
  if [ -z "${PORT:-}" ]; then
    PORT=4000
  fi
  HEALTH_CHECK_URL="http://localhost:${PORT}/_status"
fi

echo "Checking health at ${HEALTH_CHECK_URL}..."
curl --fail --show-error --silent "${HEALTH_CHECK_URL}" | head -c 8192 >/dev/null
echo "Health check success"
