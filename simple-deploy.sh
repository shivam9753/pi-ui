#!/usr/bin/env bash

# Simplified deployment script - only deploys to pi-ui directory
# No more dual location deployment!

set -e

# Configuration
KEY_FILE="$HOME/Downloads/LightsailDefaultKey-ap-south-1.pem"
REMOTE_USER="ubuntu"
REMOTE_HOST="13.204.38.128"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Simple deployment to pi-ui directory only..."

# 1. Build if needed
if [ ! -f "dist.tar.gz" ] || [ "dist.tar.gz" -ot "src/" ]; then
    echo "🏗️  Building..."
    cd "$SCRIPT_DIR"
    npm run build:prod
    tar -czf dist.tar.gz dist/
fi

# 2. Transfer
echo "📤 Transferring..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no -C dist.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/"

# 3. Deploy
echo "🚀 Deploying..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "
    cd /tmp
    echo 'Extracting...'
    tar -xzf dist.tar.gz
    
    echo 'Backing up current deployment...'
    mv /home/ubuntu/pi-ui/dist /home/ubuntu/pi-ui/dist.backup.\$(date +%s) 2>/dev/null || true
    
    echo 'Installing new deployment...'
    cp -r dist/pi /home/ubuntu/pi-ui/dist
    chown -R ubuntu:ubuntu /home/ubuntu/pi-ui/dist/
    
    echo 'Restarting Angular SSR...'
    pm2 restart ui-ssr
    
    echo 'Cleaning up...'
    rm -rf /tmp/dist*
    
    echo '✅ Deployment completed!'
    ls -la /home/ubuntu/pi-ui/dist/pi/browser/ | head -5
"

echo "🎉 Simple deployment successful!"
echo "🌐 Check: https://app.poemsindia.in"