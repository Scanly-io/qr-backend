FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/common/package.json ./packages/common/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/common ./packages/common
COPY services/experiments-service ./services/experiments-service

# Build the service
WORKDIR /app/services/experiments-service
RUN npm run build

EXPOSE 3013

CMD ["npm", "start"]
