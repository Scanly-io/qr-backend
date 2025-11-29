# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/common/package.json ./packages/common/
COPY services/microsite-service/package.json ./services/microsite-service/

# Install dependencies
RUN npm ci --workspace=@qr/microsite-service --workspace=@qr/common

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/common/node_modules ./packages/common/node_modules
COPY --from=deps /app/services/microsite-service/node_modules ./services/microsite-service/node_modules

# Copy source code
COPY tsconfig.json ./
COPY packages/common ./packages/common
COPY services/microsite-service ./services/microsite-service

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/common/package.json ./packages/common/
COPY services/microsite-service/package.json ./services/microsite-service/

RUN npm ci --workspace=@qr/microsite-service --workspace=@qr/common --omit=dev

# Copy built application
COPY --from=builder /app/packages/common ./packages/common
COPY --from=builder /app/services/microsite-service ./services/microsite-service

# Set working directory to service
WORKDIR /app/services/microsite-service

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3005

CMD ["node", "--loader", "tsx", "src/index.ts"]
