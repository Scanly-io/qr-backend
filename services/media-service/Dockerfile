# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./

# Copy common package
COPY packages/common ./packages/common

# Copy service package.json
COPY services/media-service/package.json ./services/media-service/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy service source
COPY services/media-service ./services/media-service

# Build
WORKDIR /app/services/media-service
RUN pnpm build || echo "Build not needed for tsx"

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install sharp dependencies for alpine
RUN apk add --no-cache vips-dev build-base python3

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./

# Copy common package
COPY packages/common ./packages/common

# Copy service
COPY services/media-service ./services/media-service

# Install production dependencies
RUN pnpm install --prod || pnpm install

# Create uploads directory
RUN mkdir -p /uploads/images

WORKDIR /app/services/media-service

EXPOSE 3025

CMD ["pnpm", "dev"]
