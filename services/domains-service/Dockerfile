# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/common/package.json ./packages/common/
COPY services/domains-service/package.json ./services/domains-service/

# Install dependencies (workspaces hoist to root node_modules)
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage (only root node_modules exists)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY tsconfig.json ./
COPY packages/common ./packages/common
COPY services/domains-service ./services/domains-service

# Build TypeScript (if needed in future)
# RUN npm run build --workspace=@qr/domains-service

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy all dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/packages/common ./packages/common
COPY --from=builder /app/services/domains-service ./services/domains-service

# Set working directory to service
WORKDIR /app/services/domains-service

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3010

CMD ["node", "--import", "tsx", "src/index.ts"]
