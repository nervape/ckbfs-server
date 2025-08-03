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

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Copy yarn.lock if it exists, otherwise generate it
COPY yarn.loc[k] ./
RUN if [ ! -f yarn.lock ]; then \
    echo "yarn.lock not found, generating..."; \
    yarn install; \
    else \
    echo "yarn.lock found, installing with frozen lockfile..."; \
    yarn install --frozen-lockfile; \
    fi

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

# Copy package files
COPY package.json ./

# Copy yarn.lock if it exists, otherwise generate it for production
COPY yarn.loc[k] ./
RUN if [ ! -f yarn.lock ]; then \
    echo "yarn.lock not found, generating for production..."; \
    yarn install --production; \
    else \
    echo "yarn.lock found, installing production dependencies with frozen lockfile..."; \
    yarn install --production --frozen-lockfile; \
    fi

# Copy built application
COPY --from=build --chown=ckbfs:nodejs /app/dist ./dist

# Copy environment example and template
COPY --chown=ckbfs:nodejs .env.example ./.env.example
COPY --chown=ckbfs:nodejs .env.template ./.env.template

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
