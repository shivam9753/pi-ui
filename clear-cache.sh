#!/usr/bin/env bash

# Clear all SSR caches on production server
# Use this script when you need to force-clear caches without a full deployment

set -e

KEY_FILE="$HOME/Downloads/LightsailDefaultKey-ap-south-1.pem"
REMOTE_USER="ubuntu"
REMOTE_HOST="13.204.38.128"

echo "🧹 Clearing all SSR caches on production..."

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
set -e

echo "🔄 Clearing caches..."

# Clear nginx proxy cache
echo "   - Clearing nginx proxy cache..."
if [ -d "/var/lib/nginx/proxy" ]; then
    sudo rm -rf /var/lib/nginx/proxy/*
    echo "     ✓ Nginx proxy cache cleared (/var/lib/nginx/proxy)"
fi
if [ -d "/var/cache/nginx" ]; then
    sudo rm -rf /var/cache/nginx/*
    echo "     ✓ Nginx cache cleared (/var/cache/nginx)"
fi

# Restart SSR server to clear in-memory application cache
echo "   - Restarting SSR server (clears in-memory cache)..."
pm2 restart ui-ssr

# Reload nginx
echo "   - Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ All caches cleared!"
echo ""
echo "Note: Browser caches and CDN caches may still persist."
echo "Users may need to hard-refresh (Ctrl+Shift+R) to see changes immediately."

ENDSSH

echo ""
echo "🎉 Cache clearing completed!"
echo ""
echo "To verify cache is cleared, check the X-Cache-Status header:"
echo "  curl -I https://poemsindia.in/post/the-weight-of-august-by-ridhi-bhutani"
