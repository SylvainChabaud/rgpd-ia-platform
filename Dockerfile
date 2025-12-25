# ============================================================================
# Production Dockerfile - Multi-stage build
# LOT 6.0 - Stack IA Docker RGPD-ready
# ============================================================================
#
# SECURITY FEATURES:
# - Multi-stage build (minimal final image)
# - Non-root user (nextjs:1001)
# - No source code in final image
# - Production dependencies only
# - Alpine-based (smaller attack surface)
#
# BUILD:
#   docker build -t rgpd-platform:latest .
#
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Dependencies (cacheable layer)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    libc6-compat \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
# --omit=dev: skip devDependencies
# --ignore-scripts: prevent malicious scripts
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# ----------------------------------------------------------------------------
# Stage 2: Builder (build Next.js app)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Build Next.js application
# Environment variables for build-time optimization
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build && \
    # Remove devDependencies after build
    npm prune --production

# ----------------------------------------------------------------------------
# Stage 3: Runner (final production image)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy production node_modules
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy migrations for runtime access
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations

# Security: Switch to non-root user
USER nextjs

# Expose port (internal only - not published to host)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start Next.js in production mode
CMD ["node", "server.js"]
