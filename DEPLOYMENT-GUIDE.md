# PI UI Deployment Guide

## 🚨 Why Deployments Keep Breaking

### Root Causes:
1. **Dual Server Architecture**: nginx + Angular SSR serve from different directories
2. **Hash-based Assets**: Angular generates unique filenames (main-ABCD1234.js)
3. **Cache Layers**: Browser + nginx + PM2 process caching
4. **File Sync Issues**: `/var/www/html/` vs `/home/ubuntu/pi-ui/dist/pi/browser/`

## 🛡️ Prevention Measures Implemented

### 1. Enhanced Deployment Script
- **File syncing**: Ensures both directories have identical files
- **Validation checks**: Verifies deployment integrity before completion
- **HTTP testing**: Confirms files are accessible via web

### 2. Health Check Script
- **Usage**: `./health-check.sh`
- **Purpose**: Detect issues before they affect users
- **Frequency**: Run after any changes or weekly

### 3. Improved nginx Configuration
- **Proper caching**: Static assets cached for 1 year
- **Cache busting**: index.html cached for 5 minutes only
- **Security headers**: Added for better protection

## 📋 Deployment Process

### Standard Deployment:
```bash
./build-and-deploy.sh
```

### What it does:
1. ✅ Builds locally with latest code
2. ✅ Transfers to server
3. ✅ Extracts to both nginx and SSR directories
4. ✅ Restarts services
5. ✅ Validates deployment integrity
6. ✅ Tests HTTP accessibility

### If deployment fails:
- Script will exit with error message
- Check the specific error and fix the issue
- Re-run deployment

## 🔍 Health Monitoring

### Run health check:
```bash
./health-check.sh
```

### What it checks:
- ✅ File consistency between directories
- ✅ Service status (PM2)
- ✅ HTTP accessibility
- ✅ API functionality
- ✅ External access testing

### Warning signs to watch for:
- 404 errors for CSS/JS files
- Authentication errors on public pages
- Services showing as stopped in PM2
- Inconsistent file versions

## 🚨 Emergency Recovery

### If site is broken:

1. **Check services:**
   ```bash
   ssh -i ~/Downloads/LightsailDefaultKey-ap-south-1.pem ubuntu@13.204.38.128
   pm2 list
   pm2 restart all
   ```

2. **Run health check:**
   ```bash
   ./health-check.sh
   ```

3. **Force re-deployment:**
   ```bash
   ./build-and-deploy.sh
   ```

4. **Manual file sync if needed:**
   ```bash
   ssh -i ~/Downloads/LightsailDefaultKey-ap-south-1.pem ubuntu@13.204.38.128
   sudo cp /var/www/html/* /home/ubuntu/pi-ui/dist/pi/browser/
   pm2 restart angular-ssr
   ```

## 📊 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   Nginx         │
│                 │◄──►│   /var/www/html/│
└─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Angular SSR   │
                       │   /home/ubuntu/ │
                       │   pi-ui/dist/   │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Backend API   │
                       │   PM2 Process   │
                       └─────────────────┘
```

### Key Files:
- **nginx**: `/var/www/html/index.html`, `main-*.js`, `styles-*.css`
- **SSR**: `/home/ubuntu/pi-ui/dist/pi/browser/` (same files)
- **Backend**: `/home/ubuntu/pi-backend/`

## 🔧 Troubleshooting

### Common Issues:

1. **CSS 404 errors:**
   - Run `./health-check.sh`
   - Check if files exist in both directories
   - Re-run deployment if needed

2. **Authentication errors on public pages:**
   - Check backend service: `pm2 logs backend`
   - Restart if needed: `pm2 restart backend`

3. **Mobile refresh not working:**
   - Clear browser cache
   - Check nginx cache headers

4. **File version mismatches:**
   - Run `./build-and-deploy.sh` for fresh deployment
   - Validation will catch and fix inconsistencies

## 🎯 Best Practices

1. **Always run health check after deployment**
2. **Monitor PM2 processes regularly**
3. **Keep deployment script up to date**
4. **Don't manually edit server files**
5. **Use the deployment script for all updates**

## 📞 Support

If issues persist:
1. Run `./health-check.sh` and share output
2. Check PM2 logs: `pm2 logs`
3. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Provide specific error messages and browser console logs