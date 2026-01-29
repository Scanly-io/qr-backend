# ═══════════════════════════════════════════════════════════
# NGINX API GATEWAY DOCKERFILE
# ═══════════════════════════════════════════════════════════
# Purpose: Production-ready Nginx reverse proxy for microservices
# Features:
#   - Custom nginx.conf for service routing
#   - SSL/TLS support
#   - Cache directories
#   - Health check script
# ═══════════════════════════════════════════════════════════

FROM nginx:1.25-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create cache directories
RUN mkdir -p /var/cache/nginx/microsite \
    && mkdir -p /var/cache/nginx/qr_images \
    && chown -R nginx:nginx /var/cache/nginx

# Create SSL directory (for production certificates)
RUN mkdir -p /etc/nginx/ssl

# SSL certificates will be mounted from volumes in production
# For local dev, self-signed certs can be generated and mounted

# Health check - verify nginx config and that service is responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
