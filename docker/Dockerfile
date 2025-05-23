# Use Node.js LTS with Ubuntu base for better Playwright compatibility
FROM node:20-bullseye

# Install system dependencies required by Playwright browsers
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY biome.json ./

# Install all dependencies (including dev) for build
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium

# Copy source code
COPY src/ ./src/

# Build the project
RUN npm run build

# Clean up dev dependencies to reduce image size
RUN npm ci --omit=dev && npm cache clean --force

# Create non-root user for security
RUN groupadd -r playwright && useradd -r -g playwright -G audio,video playwright \
    && mkdir -p /home/playwright \
    && chown -R playwright:playwright /home/playwright \
    && chown -R playwright:playwright /app

# Switch to non-root user
USER playwright

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/home/playwright/.cache/ms-playwright

# Expose port (if needed for health checks)
EXPOSE 3000

# Set entrypoint
ENTRYPOINT ["node", "dist/index.js"]
