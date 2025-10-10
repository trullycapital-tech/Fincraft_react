# GoDaddy Hosting Deployment Guide

This guide provides step-by-step instructions for deploying the FinCraft application on GoDaddy hosting with the domain `msmeloanconsultant.com`.

## 🏢 GoDaddy Hosting Options

### Option 1: VPS Hosting (Recommended)

- **Full control** over server configuration
- **Docker support** available
- **Root access** for installation
- **Custom software** installation allowed

### Option 2: Dedicated Server

- **Maximum performance** and control
- **Highest resource** allocation
- **Best for high traffic** applications

### ❌ Shared Hosting Limitations

Shared hosting **cannot run** this application because:

- No Docker support
- No Node.js runtime control
- Limited database access
- No custom software installation

## 🚀 Deployment Steps

### Step 1: Purchase GoDaddy VPS/Dedicated Server

1. Go to [GoDaddy VPS Hosting](https://www.godaddy.com/hosting/vps-hosting)
2. Select a plan with minimum:
   - **2 CPU cores**
   - **4GB RAM**
   - **40GB SSD storage**
   - **Ubuntu 20.04 LTS** OS
3. Complete purchase and note server details

### Step 2: Server Initial Setup

#### Connect to Your Server

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y
```

#### Install Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
apt install git -y

# Install other tools
apt install curl wget nano htop -y
```

#### Create Application User

```bash
# Create fincraft user
useradd -m -s /bin/bash fincraft
usermod -aG docker fincraft
su - fincraft
```

### Step 3: Domain Configuration

#### GoDaddy DNS Settings

1. Login to [GoDaddy Domain Management](https://dcc.godaddy.com/)
2. Find your domain `msmeloanconsultant.com`
3. Click **DNS** → **Manage Zones**
4. Add/Update these records:

| Type  | Name | Value                  | TTL    |
| ----- | ---- | ---------------------- | ------ |
| A     | @    | YOUR_SERVER_IP         | 1 Hour |
| A     | www  | YOUR_SERVER_IP         | 1 Hour |
| CNAME | api  | msmeloanconsultant.com | 1 Hour |

#### Verify DNS Propagation

```bash
# Check DNS propagation
nslookup msmeloanconsultant.com
dig msmeloanconsultant.com

# Wait for propagation (can take 24-48 hours)
```

### Step 4: Deploy Application

#### Clone Repository

```bash
# As fincraft user
cd /home/fincraft
git clone <YOUR_REPOSITORY_URL> fincraft-app
cd fincraft-app
```

#### Configure Environment

```bash
# Create production environment
cp .env.example .env.production

# Edit with your values
nano .env.production
```

**Environment Configuration:**

```env
NODE_ENV=production
PORT=8001
MONGODB_URI=mongodb://admin:fincraft123@mongodb:27017/fincraft?authSource=admin
JWT_SECRET=your_super_secure_jwt_secret_change_this_in_production
JWT_EXPIRE=24h
DEMO_MODE=false
CORS_ORIGIN=https://msmeloanconsultant.com,https://www.msmeloanconsultant.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_SALT_ROUNDS=12
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
DOMAIN_NAME=msmeloanconsultant.com
```

#### Deploy with Docker

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

### Step 5: SSL Certificate Setup

#### Install Certbot

```bash
# Install Certbot
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

#### Generate SSL Certificate

```bash
# Stop nginx temporarily
docker-compose down

# Generate certificate
sudo certbot certonly --standalone \
  -d msmeloanconsultant.com \
  -d www.msmeloanconsultant.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Create SSL directory
mkdir -p ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/msmeloanconsultant.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/msmeloanconsultant.com/privkey.pem ./ssl/
sudo chown fincraft:fincraft ssl/*
```

#### Update Nginx Configuration

Create `frontend/nginx-ssl.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=main:10m rate=10r/s;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name msmeloanconsultant.com www.msmeloanconsultant.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name msmeloanconsultant.com www.msmeloanconsultant.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;

        # Apply rate limiting
        limit_req zone=main burst=20 nodelay;

        root /usr/share/nginx/html;
        index index.html index.htm;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # React app routing
        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }

        # Proxy API requests to backend
        location /api/ {
            proxy_pass http://backend:8001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeout settings
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Security: hide nginx version
        server_tokens off;

        # Deny access to hidden files
        location ~ /\. {
            deny all;
        }
    }
}
```

#### Update Docker Compose for SSL

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  mongodb:
    image: mongo:7.0
    container_name: fincraft-mongodb-prod
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: fincraft123
      MONGO_INITDB_DATABASE: fincraft
    volumes:
      - mongodb_data_prod:/data/db
      - ./backend/scripts/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    networks:
      - fincraft-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: fincraft-backend-prod
    restart: unless-stopped
    env_file:
      - .env.production
    environment:
      MONGODB_URI: mongodb://admin:fincraft123@mongodb:27017/fincraft?authSource=admin
    volumes:
      - backend_uploads_prod:/app/uploads
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - fincraft-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: fincraft-frontend-prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
      - ./frontend/nginx-ssl.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
    networks:
      - fincraft-network

volumes:
  mongodb_data_prod:
  backend_uploads_prod:

networks:
  fincraft-network:
    driver: bridge
```

### Step 6: Start Production Application

```bash
# Start with SSL configuration
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 7: Configure Automatic SSL Renewal

```bash
# Add cron job for SSL renewal
sudo crontab -e

# Add this line to run renewal twice daily
0 */12 * * * /usr/bin/certbot renew --quiet && /usr/local/bin/docker-compose -f /home/fincraft/fincraft-app/docker-compose.prod.yml restart frontend
```

### Step 8: Configure Firewall

```bash
# Install UFW firewall
sudo ufw enable

# Allow necessary ports
sudo ufw allow 22   # SSH
sudo ufw allow 80   # HTTP
sudo ufw allow 443  # HTTPS

# Check status
sudo ufw status
```

## 🔍 Verification

### Test Your Deployment

1. **Domain Access**: https://msmeloanconsultant.com
2. **API Health**: https://msmeloanconsultant.com/api/health
3. **SSL Certificate**: Check browser security indicator

### Monitoring Commands

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Monitor resources
docker stats

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service_name]

# Check SSL certificate
echo | openssl s_client -connect msmeloanconsultant.com:443 2>/dev/null | openssl x509 -dates -noout
```

## 🛠️ Maintenance

### Regular Tasks

#### Weekly

- Check SSL certificate expiry
- Monitor disk space
- Review application logs
- Check for security updates

#### Monthly

- Update Docker images
- Backup database
- Review performance metrics
- Update dependencies

### Backup Strategy

```bash
# Database backup
docker exec fincraft-mongodb-prod mongodump --out /backup/$(date +%Y%m%d)

# Application backup
tar -czf /backup/fincraft-app-$(date +%Y%m%d).tar.gz /home/fincraft/fincraft-app

# Upload to cloud storage (optional)
# aws s3 cp /backup/ s3://your-backup-bucket/ --recursive
```

## 🚨 Troubleshooting

### Common Issues

**SSL Certificate Problems**

```bash
# Check certificate files
ls -la ssl/
sudo certbot certificates

# Regenerate if needed
sudo certbot delete --cert-name msmeloanconsultant.com
sudo certbot certonly --standalone -d msmeloanconsultant.com -d www.msmeloanconsultant.com
```

**Domain Not Resolving**

```bash
# Check DNS
nslookup msmeloanconsultant.com
dig msmeloanconsultant.com

# Check GoDaddy DNS settings
# Verify A records point to correct IP
```

**Application Not Starting**

```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs

# Check port conflicts
netstat -tulpn | grep :80
netstat -tulpn | grep :443

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

## 📞 Support

For deployment issues:

1. Check logs first: `docker-compose logs`
2. Verify DNS propagation
3. Confirm SSL certificate validity
4. Contact GoDaddy support for server issues

---

**Deployment Complete! 🎉**

Your FinCraft application should now be running at:

- **https://msmeloanconsultant.com**
