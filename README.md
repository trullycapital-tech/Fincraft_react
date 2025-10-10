# FinCraft - Loan Document Retrieval Platform

![FinCraft Logo](https://via.placeholder.com/200x100/1E40AF/FFFFFF?text=FinCraft)

**FinCraft** is a comprehensive loan document retrieval platform that enables users to securely access their loan documents from multiple banks through CIBIL integration and bank APIs.

## 🚀 Features

- **PAN Number Validation** - Manual entry or OCR-based image upload
- **CIBIL Integration** - Secure consent-based access to credit reports
- **Multi-Bank Support** - Access documents from multiple banks
- **Document Retrieval** - Download loan statements, sanction letters, NOCs, and more
- **Bank-Grade Security** - End-to-end encryption with consent management
- **Real-time Processing** - Instant document access through secure APIs

## 🏗️ Architecture

### Frontend (React)

- **Technology**: React 19, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons
- **Routing**: React Router Dom
- **State Management**: React Hooks
- **Build Tool**: Create React App

### Backend (Node.js)

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **File Upload**: Multer with image processing
- **OCR**: Tesseract.js for PAN card recognition
- **Security**: Helmet, CORS, Rate limiting, Input validation

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (for frontend)
- **Database**: MongoDB 7.0
- **Caching**: Redis (optional)
- **SSL**: Let's Encrypt integration

## 📋 Prerequisites

- **Node.js** 18+
- **Docker** & Docker Compose
- **MongoDB** (handled by Docker)
- Domain name pointed to your server

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd FINCRAFT-PROJ
```

### 2. Environment Configuration

Create production environment file:

```bash
cp .env.example .env.production
```

Update `.env.production` with your values:

```env
NODE_ENV=production
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
DOMAIN_NAME=msmeloanconsultant.com
JWT_SECRET=your_super_secure_jwt_secret
```

### 3. Deploy with Docker

#### Option A: Using Deployment Script (Recommended)

**Windows:**

```cmd
cd scripts
deploy.bat
```

**Linux/Mac:**

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### Option B: Manual Docker Deployment

```bash
# Production deployment
docker-compose -f docker-compose.yml up -d --build

# Development deployment
docker-compose -f docker-compose.dev.yml up -d --build
```

### 4. Verify Deployment

- **Frontend**: http://localhost (or your domain)
- **Backend API**: http://localhost:8001
- **Health Check**: http://localhost:8001/health

## 🌐 GoDaddy Hosting Deployment

### Step 1: Server Setup

1. **Purchase VPS/Dedicated Server** from GoDaddy
2. **Install Docker** on your server:
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

### Step 2: Domain Configuration

1. **Point Domain** to your server IP:
   - Go to GoDaddy DNS Management
   - Add A record: `@` → `YOUR_SERVER_IP`
   - Add A record: `www` → `YOUR_SERVER_IP`

### Step 3: SSL Certificate Setup

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d msmeloanconsultant.com -d www.msmeloanconsultant.com

# Copy certificates
sudo cp /etc/letsencrypt/live/msmeloanconsultant.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/msmeloanconsultant.com/privkey.pem ./ssl/
```

### Step 4: Production Deployment

1. **Upload project** to your server
2. **Configure environment** variables
3. **Run deployment script**:
   ```bash
   ./scripts/deploy.sh
   ```

### Step 5: Nginx SSL Configuration

Update `frontend/nginx.conf` for SSL:

```nginx
server {
    listen 80;
    server_name msmeloanconsultant.com www.msmeloanconsultant.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name msmeloanconsultant.com www.msmeloanconsultant.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # ... rest of configuration
}
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)

```env
NODE_ENV=production
PORT=8001
MONGODB_URI=mongodb://admin:password@mongodb:27017/fincraft
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=24h
DEMO_MODE=true
CORS_ORIGIN=https://msmeloanconsultant.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env)

```env
REACT_APP_BACKEND_URL=https://msmeloanconsultant.com/api
```

### Database Configuration

MongoDB is automatically configured via Docker Compose with:

- **Database**: fincraft
- **Collections**: users, otps
- **Indexes**: Optimized for performance
- **Authentication**: admin/password

## 📊 API Documentation

### Authentication Endpoints

- `POST /api/validate-pan` - Validate PAN number
- `POST /api/upload-pan-image` - OCR PAN extraction
- `POST /api/request-cibil-consent` - Request CIBIL consent
- `POST /api/verify-cibil-consent` - Verify CIBIL OTP

### Data Endpoints

- `POST /api/cibil-report` - Fetch CIBIL report
- `GET /api/bank/supported-banks` - Get supported banks
- `POST /api/request-consent` - Request bank consent
- `POST /api/verify-bank-otp` - Verify bank OTP

### Document Endpoints

- `POST /api/retrieve-documents` - Retrieve loan documents
- `GET /api/documents/download/:id/:filename` - Download document
- `GET /api/documents/status/:requestId` - Check retrieval status

### User Management

- `GET /api/user/profile/:panNumber` - Get user profile
- `PUT /api/user/profile/:panNumber` - Update profile
- `GET /api/user/dashboard/:panNumber` - Dashboard data

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: Express-validator for all inputs
- **CORS Protection**: Configured for specific origins
- **Helmet.js**: Security headers
- **JWT Authentication**: Secure token-based auth
- **MongoDB Sanitization**: NoSQL injection prevention
- **File Upload Security**: Type and size validation
- **SSL/TLS**: HTTPS encryption

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Health Checks

```bash
# Backend health
curl http://localhost:8001/health

# Frontend health
curl http://localhost/health
```

## 📈 Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Monitor Resources

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## 🔄 Maintenance

### Backup Database

```bash
# Create backup
docker exec fincraft-mongodb mongodump --out /backup

# Restore backup
docker exec fincraft-mongodb mongorestore /backup
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### SSL Certificate Renewal

```bash
# Renew certificates
sudo certbot renew

# Restart nginx
docker-compose restart frontend
```

## 🐛 Troubleshooting

### Common Issues

**1. Port Already in Use**

```bash
# Kill processes on ports
sudo lsof -t -i:80 | xargs sudo kill
sudo lsof -t -i:8001 | xargs sudo kill
```

**2. MongoDB Connection Issues**

```bash
# Check MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

**3. SSL Certificate Issues**

```bash
# Test SSL
openssl s_client -connect msmeloanconsultant.com:443

# Check certificate expiry
echo | openssl s_client -connect msmeloanconsultant.com:443 2>/dev/null | openssl x509 -dates -noout
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support and questions:

- **Email**: support@msmeloanconsultant.com
- **Documentation**: [View Full Docs](./docs/)
- **Issues**: Create GitHub issue

## 🎯 Roadmap

- [ ] Real CIBIL API integration
- [ ] Additional bank APIs
- [ ] Mobile application
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] API rate limiting per user
- [ ] Document encryption at rest

---

**Made with ❤️ by FinCraft Team**
