#!/usr/bin/env bash

# Health Check Script for PI UI Deployment
# This script verifies that the deployment is consistent and working

set -e

KEY_FILE="$HOME/Downloads/LightsailDefaultKey-ap-south-1.pem"
REMOTE_USER="ubuntu"
REMOTE_HOST="13.204.38.128"

echo "🔍 Running PI UI Health Check..."

# Function to check remote deployment
check_remote_deployment() {
    ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
set -e

echo "📋 Checking file consistency..."

# Get the main files
MAIN_FILE=$(ls /var/www/html/main-*.js 2>/dev/null | head -1 | xargs basename)
CSS_FILE=$(ls /var/www/html/styles-*.css 2>/dev/null | head -1 | xargs basename)

if [ -z "$MAIN_FILE" ] || [ -z "$CSS_FILE" ]; then
    echo "❌ ISSUE: Missing main files in nginx directory!"
    exit 1
fi

echo "🔍 Found files:"
echo "   - Main: $MAIN_FILE"
echo "   - CSS: $CSS_FILE"

# Check SSR directory
if [ ! -f "/home/ubuntu/pi-ui/dist/pi/browser/$MAIN_FILE" ]; then
    echo "❌ ISSUE: $MAIN_FILE missing from SSR directory!"
    exit 1
fi

if [ ! -f "/home/ubuntu/pi-ui/dist/pi/browser/$CSS_FILE" ]; then
    echo "❌ ISSUE: $CSS_FILE missing from SSR directory!"
    exit 1
fi

# Check index.html consistency
NGINX_MAIN=$(grep -o 'main-[^"]*\.js' /var/www/html/index.html)
SSR_MAIN=$(grep -o 'main-[^"]*\.js' /home/ubuntu/pi-ui/dist/pi/browser/index.html)

if [ "$NGINX_MAIN" != "$SSR_MAIN" ]; then
    echo "❌ ISSUE: index.html files reference different main files!"
    echo "   - Nginx: $NGINX_MAIN"
    echo "   - SSR: $SSR_MAIN"
    exit 1
fi

# Check services
echo "🔍 Checking services..."
if ! pm2 show angular-ssr > /dev/null 2>&1; then
    echo "❌ ISSUE: Angular SSR service not running!"
    exit 1
fi

if ! pm2 show backend > /dev/null 2>&1; then
    echo "❌ ISSUE: Backend service not running!"
    exit 1
fi

# Test HTTP access
echo "🔍 Testing HTTP access..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app.poemsindia.in/$MAIN_FILE")
if [ "$HTTP_STATUS" != "200" ]; then
    echo "❌ ISSUE: $MAIN_FILE not accessible (HTTP $HTTP_STATUS)!"
    exit 1
fi

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app.poemsindia.in/$CSS_FILE")
if [ "$HTTP_STATUS" != "200" ]; then
    echo "❌ ISSUE: $CSS_FILE not accessible (HTTP $HTTP_STATUS)!"
    exit 1
fi

# Test API
echo "🔍 Testing API..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app.poemsindia.in/api/health" || echo "000")
if [ "$API_STATUS" != "200" ] && [ "$API_STATUS" != "404" ]; then
    echo "⚠️  WARNING: API may have issues (HTTP $API_STATUS)"
fi

echo "✅ All health checks passed!"
echo "📊 Service status:"
pm2 list

ENDSSH
}

# Function to test from external
test_external_access() {
    echo "🔍 Testing external access..."
    
    # Test main page (follow redirects)
    HTTP_STATUS=$(curl -s -L -o /dev/null -w "%{http_code}" "https://app.poemsindia.in/")
    if [ "$HTTP_STATUS" != "200" ]; then
        echo "❌ ISSUE: Main page not accessible (HTTP $HTTP_STATUS)!"
        return 1
    fi
    
    # Test explore page (follow redirects)
    HTTP_STATUS=$(curl -s -L -o /dev/null -w "%{http_code}" "https://app.poemsindia.in/explore")
    if [ "$HTTP_STATUS" != "200" ]; then
        echo "❌ ISSUE: Explore page not accessible (HTTP $HTTP_STATUS)!"
        return 1
    fi
    
    echo "✅ External access working!"
}

# Run checks
check_remote_deployment
test_external_access

echo ""
echo "🎉 Health check completed successfully!"
echo "🌐 Website: https://app.poemsindia.in"
echo "📅 Check time: $(date)"