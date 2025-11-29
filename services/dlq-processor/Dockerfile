# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/common/package.json ./packages/common/
COPY services/dlq-processor/package.json ./services/dlq-processor/

# Install dependencies
RUN npm ci --workspace=@qr/dlq-processor --workspace=@qr/common

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/common/node_modules ./packages/common/node_modules
COPY --from=deps /app/services/dlq-processor/node_modules ./services/dlq-processor/node_modules

# Copy source code
COPY tsconfig.json ./
COPY packages/common ./packages/common
COPY services/dlq-processor ./services/dlq-processor

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/common/package.json ./packages/common/
COPY services/dlq-processor/package.json ./services/dlq-processor/

RUN npm ci --workspace=@qr/dlq-processor --workspace=@qr/common --omit=dev

# Copy built application
COPY --from=builder /app/packages/common ./packages/common
COPY --from=builder /app/services/dlq-processor ./services/dlq-processor

# Set working directory to service
WORKDIR /app/services/dlq-processor

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "--loader", "tsx", "src/index.ts"]
