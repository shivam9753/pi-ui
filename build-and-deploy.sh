#!/usr/bin/env bash

# Complete Build and Deploy Script for PI UI
# This script builds locally, deploys to Lightsail, updates repos, and restarts services

set -e

# Configuration
KEY_FILE="$HOME/Downloads/LightsailDefaultKey-ap-south-1.pem"
REMOTE_USER="ubuntu"
REMOTE_HOST="13.204.38.128"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Starting complete build and deploy process..."

# 1. Clean up old files
echo "🧹 Cleaning up old local files..."
cd "$SCRIPT_DIR"
rm -rf dist/
rm -f dist.tar.gz

# 2. Build the project locally
echo "🏗️  Building project locally..."
npm run build:prod

# 3. Create tarball
echo "📦 Creating tarball..."
tar -czf dist.tar.gz dist/

# 4. Transfer to Lightsail
echo "📤 Transferring to Lightsail..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no dist.tar.gz "$REMOTE_USER@$REMOTE_HOST:/home/ubuntu/"

# 5. Execute comprehensive remote deployment
echo "🚀 Executing remote deployment..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
set -e

echo "📥 Starting remote deployment process..."

# Pull latest changes for both repositories
echo "🔄 Pulling latest changes for pi-ui..."
cd /home/ubuntu/pi-ui
git pull origin main || echo "⚠️  Git pull failed or no changes for pi-ui"

echo "🔄 Pulling latest changes for pi-backend..."
cd /home/ubuntu/pi-backend
git pull origin main || echo "⚠️  Git pull failed or no changes for pi-backend"

# Extract new build files
echo "📂 Extracting new build files..."
cd /home/ubuntu

# Extract to pi-ui directory (for SSR server)
echo "   - Extracting to pi-ui directory..."
sudo tar -xzf dist.tar.gz --strip-components=1 -C /home/ubuntu/pi-ui/ --exclude='**/._*'

# Extract browser files to nginx directory  
echo "   - Extracting browser files to nginx directory..."
sudo tar -xzf dist.tar.gz dist/pi/browser/ --exclude='**/._*'
sudo cp -r dist/pi/browser/* /var/www/html/

# Also copy all browser files to SSR directory to ensure consistency
echo "   - Syncing browser files to SSR directory..."
sudo cp -r dist/pi/browser/* /home/ubuntu/pi-ui/dist/pi/browser/
sudo rm -rf dist/

# Set proper permissions
echo "🔐 Setting proper permissions..."
sudo chown -R ubuntu:ubuntu /home/ubuntu/pi-ui/dist/
sudo chown -R www-data:www-data /var/www/html/

# Restart services
echo "🔄 Restarting services..."

# Restart Angular SSR server
echo "   - Restarting Angular SSR server..."
pm2 restart angular-ssr

# Restart backend if needed
echo "   - Restarting backend server..."
pm2 restart backend

# Reload nginx
echo "   - Reloading nginx..."
sudo systemctl reload nginx

# Check service status
echo "📊 Checking service status..."
pm2 list

# Clean up uploaded tar file
echo "🧹 Cleaning up remote files..."
rm -f /home/ubuntu/dist.tar.gz

echo "✅ Remote deployment completed successfully!"
ENDSSH

# 6. Clean up local tarball
echo "🧹 Cleaning up local files..."
rm -f dist.tar.gz

echo ""
echo "🎉 Complete deployment finished successfully!"
echo "🌐 Website: https://app.poemsindia.in"
echo "📱 Frontend served by nginx from: /var/www/html/"
echo "⚙️  SSR server running from: /home/ubuntu/pi-ui/dist/pi/server/"
echo "🔧 Backend API running from: /home/ubuntu/pi-backend/"
echo ""
echo "🔍 To check logs:"
echo "   pm2 logs angular-ssr"
echo "   pm2 logs backend"
echo "   sudo tail -f /var/log/nginx/error.log"