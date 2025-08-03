# Use Node.js 18 LTS as base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies needed for building native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files and yarn.lock
COPY package.json yarn.lock ./
COPY tsconfig.json ./

# Install all dependencies using yarn
RUN yarn install --frozen-lockfile

# Development stage
FROM base AS development
COPY . .
EXPOSE 6759
CMD ["yarn", "dev"]

# Build stage
FROM base AS build
COPY . .
RUN yarn build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S ckbfs -u 1001

# Set working directory
WORKDIR /app

# Copy package files and yarn.lock
COPY package.json yarn.lock ./

# Install only production dependencies using yarn
RUN yarn install --production --frozen-lockfile

# Copy built application
COPY --from=build --chown=ckbfs:nodejs /app/dist ./dist

# Copy environment example
COPY --chown=ckbfs:nodejs .env.example ./.env.example

# Create logs directory
RUN mkdir -p /app/logs && chown -R ckbfs:nodejs /app/logs

# Switch to non-root user
USER ckbfs

# Expose port
EXPOSE 6759

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:6759/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]
