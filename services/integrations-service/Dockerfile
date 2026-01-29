FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY services/integrations-service/package.json ./services/integrations-service/

# Install root and service dependencies
RUN npm install --legacy-peer-deps 2>/dev/null || npm install
WORKDIR /app/services/integrations-service
RUN npm install --legacy-peer-deps 2>/dev/null || npm install

# Copy shared packages
WORKDIR /app
COPY packages ./packages

# Copy service source
COPY services/integrations-service ./services/integrations-service

WORKDIR /app/services/integrations-service

# Build TypeScript
RUN npx tsc --skipLibCheck 2>/dev/null || true

EXPOSE 3007

CMD ["npx", "tsx", "src/index.ts"]
