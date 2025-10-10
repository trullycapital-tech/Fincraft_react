# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/pan-images uploads/documents

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S fincraft -u 1001

# Change ownership of uploads directory
RUN chown -R fincraft:nodejs uploads

# Switch to non-root user
USER fincraft

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]