@echo off
REM FinCraft Deployment Script for Windows
REM This script helps deploy the FinCraft application on Windows

echo.
echo ================================================
echo           FinCraft Deployment
echo     Loan Document Retrieval Platform
echo ================================================
echo.

REM Check if Docker is installed
echo [INFO] Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

echo [SUCCESS] Docker and Docker Compose are installed.
echo.

REM Create environment file
echo [INFO] Creating production environment file...
if not exist ".env.production" (
    (
        echo # Production Environment Variables
        echo NODE_ENV=production
        echo EMAIL_USER=your_email@gmail.com
        echo EMAIL_PASS=your_app_password
        echo DOMAIN_NAME=msmeloanconsultant.com
    ) > .env.production
    echo [SUCCESS] Environment file created: .env.production
    echo [WARNING] Please update .env.production with your actual values before deployment
    echo.
) else (
    echo [WARNING] .env.production already exists. Skipping creation.
    echo.
)

REM Setup directories
echo [INFO] Setting up required directories...
if not exist "backend\uploads\pan-images" mkdir backend\uploads\pan-images
if not exist "backend\uploads\documents" mkdir backend\uploads\documents
if not exist "data\mongodb" mkdir data\mongodb
if not exist "data\redis" mkdir data\redis
if not exist "logs" mkdir logs
echo [SUCCESS] Directories created successfully.
echo.

REM Ask for confirmation
set /p "deploy=Do you want to proceed with deployment? (y/N): "
if /i not "%deploy%"=="y" (
    echo [INFO] Deployment cancelled.
    pause
    exit /b 0
)

REM Deploy application
echo [INFO] Building and starting FinCraft application...
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.yml build --no-cache
docker-compose -f docker-compose.yml up -d

echo [SUCCESS] Application deployed successfully!
echo.

REM Wait for services to start
echo [INFO] Waiting for services to start...
timeout /t 15 /nobreak >nul

REM Health check
echo [INFO] Performing health check...
curl -f http://localhost:8001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Backend is healthy
) else (
    echo [ERROR] Backend health check failed
)

curl -f http://localhost/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Frontend is healthy
) else (
    echo [ERROR] Frontend health check failed
)

echo.
echo [SUCCESS] Deployment completed successfully!
echo.
echo Application URLs:
echo   Frontend: http://localhost (or your domain)
echo   Backend API: http://localhost:8001
echo   Health Check: http://localhost:8001/health
echo.
echo Docker containers:
docker-compose ps
echo.
echo To view logs:
echo   docker-compose logs -f
echo.
echo To stop the application:
echo   docker-compose down
echo.

echo [INFO] SSL Setup Information:
echo 1. Point your domain msmeloanconsultant.com to this server's IP address
echo 2. For SSL certificates on Windows, consider using:
echo    - Cloudflare SSL (free)
echo    - Let's Encrypt with win-acme
echo    - Commercial SSL certificate
echo.

pause