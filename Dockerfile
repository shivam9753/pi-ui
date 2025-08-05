# Multi-stage build for Angular frontend
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist/pi /usr/share/nginx/html

# Add non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Change ownership of nginx directories
RUN chown -R nodeuser:nodejs /usr/share/nginx/html
RUN chown -R nodeuser:nodejs /var/cache/nginx
RUN chown -R nodeuser:nodejs /var/log/nginx
RUN chown -R nodeuser:nodejs /etc/nginx/conf.d

# Create nginx run directory and change ownership
RUN mkdir -p /var/run/nginx
RUN chown -R nodeuser:nodejs /var/run/nginx

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]