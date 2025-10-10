#!/bin/bash

# FinCraft Deployment Script
# This script helps deploy the FinCraft application

set -e  # Exit on any error

echo "🚀 Starting FinCraft Deployment Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed."
}

# Create environment file
create_env_file() {
    print_status "Creating production environment file..."
    
    if [ ! -f ".env.production" ]; then
        cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
DOMAIN_NAME=msmeloanconsultant.com
EOF
        print_success "Environment file created: .env.production"
        print_warning "Please update .env.production with your actual values before deployment"
    else
        print_warning ".env.production already exists. Skipping creation."
    fi
}

# Setup directories
setup_directories() {
    print_status "Setting up required directories..."
    
    mkdir -p backend/uploads/pan-images
    mkdir -p backend/uploads/documents
    mkdir -p data/mongodb
    mkdir -p data/redis
    mkdir -p logs
    
    print_success "Directories created successfully."
}

# Build and start services
deploy_application() {
    print_status "Building and starting FinCraft application..."
    
    # Load environment variables
    if [ -f ".env.production" ]; then
        export $(cat .env.production | grep -v '^#' | xargs)
    fi
    
    # Build and start containers
    docker-compose -f docker-compose.yml down
    docker-compose -f docker-compose.yml build --no-cache
    docker-compose -f docker-compose.yml up -d
    
    print_success "Application deployed successfully!"
}

# Setup SSL certificates (using Let's Encrypt)
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    if [ -z "$DOMAIN_NAME" ]; then
        print_warning "DOMAIN_NAME not set in environment. Skipping SSL setup."
        return
    fi
    
    # Create directory for SSL certificates
    mkdir -p ssl
    
    print_warning "SSL setup requires manual configuration."
    print_status "Please follow these steps:"
    echo "1. Point your domain $DOMAIN_NAME to this server's IP address"
    echo "2. Install certbot: sudo apt-get install certbot"
    echo "3. Generate certificate: sudo certbot certonly --standalone -d $DOMAIN_NAME"
    echo "4. Copy certificates to ssl/ directory"
    echo "5. Update nginx configuration to use SSL"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    sleep 10  # Wait for services to start
    
    # Check backend health
    if curl -f http://localhost:8001/health &> /dev/null; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend health
    if curl -f http://localhost/health &> /dev/null; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    print_success "All services are healthy!"
}

# Show deployment information
show_deployment_info() {
    print_success "Deployment completed successfully! 🎉"
    echo ""
    echo "Application URLs:"
    echo "  Frontend: http://localhost (or your domain)"
    echo "  Backend API: http://localhost:8001"
    echo "  Health Check: http://localhost:8001/health"
    echo ""
    echo "Docker containers:"
    docker-compose ps
    echo ""
    echo "To view logs:"
    echo "  docker-compose logs -f"
    echo ""
    echo "To stop the application:"
    echo "  docker-compose down"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up old containers and images..."
    docker system prune -f
    print_success "Cleanup completed."
}

# Main deployment process
main() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    FinCraft Deployment                        ║"
    echo "║                Loan Document Retrieval Platform               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_docker
    create_env_file
    setup_directories
    
    read -p "Do you want to proceed with deployment? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_application
        health_check
        setup_ssl
        show_deployment_info
    else
        print_status "Deployment cancelled."
    fi
}

# Handle script arguments
case "${1:-}" in
    "cleanup")
        cleanup
        ;;
    "health")
        health_check
        ;;
    "ssl")
        setup_ssl
        ;;
    *)
        main
        ;;
esac