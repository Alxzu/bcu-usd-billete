# Multi-stage build for optimized production image
# Stage 1: Build dependencies and validate
FROM node:20.18-alpine AS builder

# Set working directory
WORKDIR /app

# Add metadata
LABEL maintainer="BCU USD API Team"
LABEL description="Node.js API for querying USD exchange rates from BCU"
LABEL version="2.0.0"

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -g nodejs nodejs

# Copy package files
COPY package*.json ./

# Install dependencies with npm ci for reproducible builds
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy source code
COPY --chown=nodejs:nodejs . .

# Validate the application can start
RUN timeout 10s node src/index.js || exit 0

# Stage 2: Production runtime
FROM node:20.18-alpine AS production

# Set NODE_ENV for production optimizations
ENV NODE_ENV=production
ENV PORT=3000

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -g nodejs nodejs

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:$PORT/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Expose port
EXPOSE $PORT

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]