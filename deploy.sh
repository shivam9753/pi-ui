#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Resolve the script directory (so you can run from anywhere)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Paths
KEY_FILE="$HOME/Downloads/LightsailDefaultKey-ap-south-1.pem"
REMOTE_USER="ubuntu"
REMOTE_HOST="13.204.38.128"

# 1) Remove old dist and tar.gz
echo "Removing old dist and dist.tar.gz..."
rm -rf "$SCRIPT_DIR/dist"
rm -f "$SCRIPT_DIR/dist.tar.gz"

# 2) Build the project
echo "Running production build..."
cd "$SCRIPT_DIR"
npm run build:prod

# 3) Create a tarball
echo "Creating dist.tar.gz..."
tar -czf dist.tar.gz dist

# 4) Upload to Lightsail
echo "Uploading to Lightsail..."
scp -i "$KEY_FILE" "$SCRIPT_DIR/dist.tar.gz" "$REMOTE_USER@$REMOTE_HOST:"

echo "✅ All done! dist.tar.gz deployed to $REMOTE_HOST"
