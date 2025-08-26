#!/usr/bin/env bash

# Deployment script - deploys both frontend and backend
set -e

# Configuration
KEY_FILE="$HOME/Downloads/LightsailDefaultKey-ap-south-1.pem"
REMOTE_USER="ubuntu"
REMOTE_HOST="13.204.38.128"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Deploying frontend and backend..."

# 1. Build frontend with SSR if needed
if [ ! -f "dist.tar.gz" ] || [ "dist.tar.gz" -ot "src/" ]; then
    echo "🏗️  Building frontend with SSR..."
    cd "$SCRIPT_DIR"
    npm run build:ssr:prod
    tar -czf dist.tar.gz dist/
fi

# 2. Transfer frontend
echo "📤 Transferring frontend..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no -C dist.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/"

# 3. Deploy both
echo "🚀 Deploying frontend and backend..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "
    # Deploy frontend
    cd /tmp
    echo 'Extracting frontend...'
    tar -xzf dist.tar.gz
    
    echo 'Backing up current frontend deployment...'
    mv /home/ubuntu/pi-ui/dist /home/ubuntu/pi-ui/dist.backup.\$(date +%s) 2>/dev/null || true
    
    echo 'Installing new frontend deployment...'
    mkdir -p /home/ubuntu/pi-ui
    cp -r dist /home/ubuntu/pi-ui/
    chown -R ubuntu:ubuntu /home/ubuntu/pi-ui/dist/
    
    # Update backend code
    echo 'Updating backend code with git pull...'
    cd /home/ubuntu/pi-backend
    git stash
    git pull origin main
    
    echo 'Restarting services...'
    pm2 restart backend
    pm2 restart ui-ssr
    
    echo 'Cleaning up...'
    rm -rf /tmp/dist*
    
    echo '✅ Deployment completed!'
    echo 'Frontend:'
    ls -la /home/ubuntu/pi-ui/dist/browser/ | head -3
    echo 'Backend:'
    ls -la /home/ubuntu/pi-backend/routes/ | head -3
"

echo "🎉 Deployment successful!"
echo "🌐 Frontend: https://app.poemsindia.in"
echo "🔧 Backend: API updated and restarted"