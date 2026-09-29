# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production Run
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled source and essential files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Ensure uploads directory exists (in production you would ideally use object storage)
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Set unprivileged user for security
USER node

# Expose the configurable port (default 4000)
EXPOSE 4000

# Start the Node process
CMD ["npm", "start"]
