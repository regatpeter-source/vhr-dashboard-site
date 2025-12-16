#!/bin/bash
# Initialize default admin users on production

# Configuration
DOMAIN="${1:-https://vhr-dashboard-site.onrender.com}"

echo "🔧 Initializing default admin users on: $DOMAIN"
echo ""

# Call the initialization endpoint
response=$(curl -s -X POST "$DOMAIN/api/admin/init-users" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$response" | jq . 2>/dev/null || echo "$response"

echo ""
echo "✓ Done!"
echo ""
echo "🔑 Default login credentials:"
echo "   Username: vhr"
echo "   Password: VHR@Render#2025!SecureAdmin789"
echo ""
echo "Try logging in at: $DOMAIN/account.html"
