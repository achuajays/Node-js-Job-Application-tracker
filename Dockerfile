# ═══════════════════════════════════════════════════════
# Stage 1: Dependencies
# ═══════════════════════════════════════════════════════
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files for layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# ═══════════════════════════════════════════════════════
# Stage 2: Production Runtime
# ═══════════════════════════════════════════════════════
FROM node:20-alpine AS runtime

# Security: add non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy application source
COPY --chown=appuser:appgroup package*.json ./
COPY --chown=appuser:appgroup server.js ./
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup public/ ./public/

# Create data directory for SQLite persistence
RUN mkdir -p /app/data && chown appuser:appgroup /app/data

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Set production environment
ENV NODE_ENV=production

# Start server
CMD ["node", "server.js"]
