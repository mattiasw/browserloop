# Multi-stage build for optimized Docker image size

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./
COPY tsconfig.json ./
COPY biome.json ./

# Install all dependencies for build
RUN npm ci --frozen-lockfile

# Copy source code
COPY src/ ./src/

# Build the project
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime dependencies for Playwright Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --frozen-lockfile --ignore-scripts && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S playwright && \
    adduser -S playwright -u 1001 -G playwright && \
    mkdir -p /home/playwright && \
    chown -R playwright:playwright /home/playwright && \
    chown -R playwright:playwright /app

# Switch to non-root user
USER playwright

# Set environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check')" || exit 1

# Set entrypoint
ENTRYPOINT ["node", "dist/src/index.js"]
