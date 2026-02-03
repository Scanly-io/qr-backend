#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Generate Self-Signed SSL Certificates for Local Development
# ═══════════════════════════════════════════════════════════
# Purpose: Create SSL certificates for testing HTTPS locally
# Usage: ./generate-ssl-certs.sh
# Output: Creates fullchain.pem and privkey.pem in nginx/ssl/
# ═══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SSL_DIR="$SCRIPT_DIR/ssl"

echo "════════════════════════════════════════════════════════"
echo "Generating Self-Signed SSL Certificates"
echo "════════════════════════════════════════════════════════"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/privkey.pem" \
  -out "$SSL_DIR/fullchain.pem" \
  -subj "/C=US/ST=State/L=City/O=Scanly/OU=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:api.scanly.local,IP:127.0.0.1"

# Set appropriate permissions
chmod 600 "$SSL_DIR/privkey.pem"
chmod 644 "$SSL_DIR/fullchain.pem"

echo ""
echo "✅ SSL Certificates generated successfully!"
echo ""
echo "📁 Location: $SSL_DIR"
echo "   - Private Key: privkey.pem"
echo "   - Certificate: fullchain.pem"
echo ""
echo "⚠️  NOTE: These are SELF-SIGNED certificates for development only."
echo "   Browsers will show a security warning - this is expected."
echo ""
echo "🔧 To use HTTPS:"
echo "   1. Uncomment the HTTPS server block in nginx/nginx.conf"
echo "   2. Uncomment the SSL volume mount in docker-compose.yml"
echo "   3. Restart: docker-compose down && docker-compose up -d"
echo "   4. Access: https://localhost (accept browser warning)"
echo ""
echo "════════════════════════════════════════════════════════"
