# FinCraft Project - Hostinger Subdomain Deployment Guide

## 📁 Production Build Location

Your production files are located in: `d:\PROJECT\fincrafter\1\FINCRAFT-PROJ\frontend\build\`

## 🚀 Deployment Steps for Hostinger Subdomain

### Step 1: Prepare Your Backend Environment

1. **Update the production environment file**:

   - Edit `frontend\.env.production`
   - Change `REACT_APP_BACKEND_URL=https://your-backend-subdomain.hostinger-domain.com`
   - Replace with your actual backend URL on Hostinger

2. **Rebuild with production environment** (if you changed the backend URL):
   ```bash
   cd "d:\PROJECT\fincrafter\1\FINCRAFT-PROJ\frontend"
   npm run build
   ```

### Step 2: Access Hostinger Control Panel

1. Login to your Hostinger account
2. Go to **Hosting** → **Manage** for your domain
3. Navigate to **Subdomains** section

### Step 3: Create Subdomain (if not already created)

1. Click **Create Subdomain**
2. Enter subdomain name (e.g., `app`, `fincraft`, `app.yourdomain.com`)
3. Choose the domain you want to use
4. Click **Create**

### Step 4: Upload Files via File Manager

1. In Hostinger control panel, go to **Files** → **File Manager**
2. Navigate to your subdomain folder (usually `/public_html/subdomain_name/`)
3. Delete any default files (like `index.html` if present)
4. Upload ALL contents from your `build` folder:

#### Method A: Via File Manager (Web Interface)

1. Select all files from `d:\PROJECT\fincrafter\1\FINCRAFT-PROJ\frontend\build\`
2. Drag and drop or use the upload button
3. Files to upload:
   - `index.html`
   - `asset-manifest.json`
   - `static/` folder (containing CSS and JS files)

#### Method B: Via FTP Client (Recommended for large files)

1. Download an FTP client like FileZilla
2. Use your Hostinger FTP credentials:
   - Host: Your domain or IP
   - Username: Your hosting username
   - Password: Your hosting password
   - Port: 21 (or as provided by Hostinger)
3. Navigate to subdomain folder
4. Upload build folder contents

### Step 5: Configure .htaccess for React Router

Create a `.htaccess` file in your subdomain root directory with this content:

```apache
RewriteEngine On

# Handle Angular and React Router
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security Headers
Header always set X-Frame-Options DENY
Header always set X-Content-Type-Options nosniff
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache control
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

### Step 6: Test Your Deployment

1. Visit your subdomain URL: `https://your-subdomain.your-domain.com`
2. Test all routes:
   - `/` (Landing Page)
   - `/pan-entry`
   - `/consent`
   - `/dashboard`
   - `/documents`
3. Check browser console for any errors
4. Verify API calls are working with your backend

### Step 7: SSL Certificate (if not auto-enabled)

1. In Hostinger control panel, go to **SSL** section
2. Enable SSL for your subdomain
3. Wait for propagation (up to 24 hours)

## 📋 File Structure on Server

Your subdomain folder should look like this:

```
/public_html/your-subdomain/
├── index.html
├── asset-manifest.json
├── .htaccess
└── static/
    ├── css/
    │   └── main.be27aad8.css
    └── js/
        └── main.eb6b149b.js
```

## 🔧 Troubleshooting

### Issue: Blank page or 404 errors on refresh

**Solution**: Ensure `.htaccess` file is properly configured (Step 5)

### Issue: API calls failing

**Solution**:

1. Check `.env.production` has correct backend URL
2. Ensure backend is deployed and accessible
3. Check CORS settings on backend

### Issue: Files not loading

**Solution**:

1. Verify all files uploaded correctly
2. Check file permissions (755 for folders, 644 for files)
3. Clear browser cache

### Issue: Styling not applied

**Solution**:

1. Check CSS files are in `/static/css/` folder
2. Verify `.htaccess` compression settings
3. Check browser developer tools for 404 errors

## 🔄 Re-deployment Process

When you make changes to your React app:

1. Update your code
2. Rebuild the project:
   ```bash
   cd "d:\PROJECT\fincrafter\1\FINCRAFT-PROJ\frontend"
   npm run build
   ```
3. Upload the new build files to replace the old ones
4. Clear browser cache or use hard refresh (Ctrl+F5)

## 📊 Performance Optimization Tips

1. Enable Gzip compression (included in .htaccess)
2. Use Hostinger's CDN if available
3. Optimize images before deployment
4. Monitor loading times using browser dev tools

## 🔐 Security Considerations

1. Never upload `.env` files with sensitive data
2. Use HTTPS (SSL) for all communications
3. Keep your backend API secure
4. Regularly update dependencies

Your FinCraft application is now ready for production deployment on Hostinger! 🎉
