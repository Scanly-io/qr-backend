# ML Service Dockerfile
# Builds the ML/AI service container

# Use playwright base image which includes browser dependencies
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy workspace package.json and install root dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy shared dependencies if any
COPY services/ml-service/package*.json ./services/ml-service/
WORKDIR /app/services/ml-service

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Install playwright browsers
RUN npx playwright install chromium

# Copy service source code
COPY services/ml-service/src ./src
COPY services/ml-service/tsconfig.json ./
COPY services/ml-service/drizzle.config.ts ./

# Install tsx to run TypeScript directly without compilation
RUN npm install -g tsx

# Remove dev dependencies after installing tsx
RUN npm prune --production

# Expose port
EXPOSE 3016

# Set environment
ENV NODE_ENV=production
ENV PORT=3016

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3016/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service with tsx (runs TypeScript directly)
CMD ["tsx", "src/index.ts"]
