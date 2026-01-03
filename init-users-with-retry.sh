#!/bin/bash
# Check and initialize admin users on production

set -e

DOMAIN="${1:-https://www.vhr-dashboard-site.com}"
MAX_RETRIES=3
RETRY_DELAY=5

echo "=========================================="
echo "VHR Dashboard - Admin User Initialization"
echo "=========================================="
echo ""
echo "Target: $DOMAIN"
echo ""

# Function to try initializing users
try_init() {
  local attempt=$1
  echo "[Attempt $attempt/$MAX_RETRIES] Initializing default users..."
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$DOMAIN/api/admin/init-users" \
    -H "Content-Type: application/json" \
    -d '{}')
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" == "200" ]; then
    echo "✓ Success (HTTP 200)"
    echo "Response: $body"
    return 0
  else
    echo "✗ Failed (HTTP $http_code)"
    echo "Response: $body"
    return 1
  fi
}

# Retry logic
for i in $(seq 1 $MAX_RETRIES); do
  if try_init $i; then
    echo ""
    echo "=========================================="
    echo "✓ Users initialized successfully!"
    echo "=========================================="
    echo ""
    echo "Default credentials:"
    echo "  Admin user: vhr"
    echo "  Password: [REDACTED]"
    echo ""
    echo "Try logging in at: $DOMAIN/account.html"
    echo ""
    exit 0
  fi
  
  if [ $i -lt $MAX_RETRIES ]; then
    echo "Waiting ${RETRY_DELAY}s before retry..."
    sleep $RETRY_DELAY
  fi
done

echo ""
echo "=========================================="
echo "✗ Failed to initialize users after $MAX_RETRIES attempts"
echo "=========================================="
echo ""
echo "Possible issues:"
echo "1. Service not deployed yet (wait 2-3 minutes)"
echo "2. Database connection failed"
echo "3. Check Render logs: https://dashboard.render.com"
echo ""
exit 1
