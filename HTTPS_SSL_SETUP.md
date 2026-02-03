# HTTPS/SSL Certificate Setup Guide

## 🔒 Production HTTPS Configuration

This guide covers setting up SSL/TLS certificates for your QR platform in production.

---

## Option 1: Let's Encrypt (Recommended - FREE)

### Prerequisites
- Domain name pointed to your server (e.g., `api.yourdomain.com`)
- Server with public IP address
- Port 80 and 443 open in firewall

### Step 1: Install Certbot

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

**CentOS/RHEL:**
```bash
sudo yum install certbot python3-certbot-nginx
```

**macOS (for testing):**
```bash
brew install certbot
```

### Step 2: Update Nginx Configuration

Edit `/Users/saurabhbansal/qr-backend/nginx/nginx.conf`:

```nginx
# Add this server block for HTTP (port 80) - redirects to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server block (port 443)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Certificate paths (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/api.yourdomain.com/chain.pem;
    
    # Security headers (already in Helmet, but good to have at nginx level too)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Your existing proxy configurations...
    location /api/auth {
        proxy_pass http://tenant-gateway:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # ... rest of your locations
}
```

### Step 3: Obtain Certificate

**Automatic (recommended):**
```bash
sudo certbot --nginx -d api.yourdomain.com
```

**Manual (if you want more control):**
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d api.yourdomain.com
```

Follow the prompts:
1. Enter your email address
2. Agree to Terms of Service
3. Choose whether to share email with EFF
4. Choose whether to redirect HTTP to HTTPS (recommended: yes)

### Step 4: Auto-Renewal Setup

Let's Encrypt certificates expire after 90 days. Set up auto-renewal:

**Check renewal works:**
```bash
sudo certbot renew --dry-run
```

**Add cron job (automatic):**
```bash
sudo crontab -e
```

Add this line:
```
0 0,12 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

This checks for renewal twice daily and reloads nginx if renewed.

### Step 5: Update Environment Variables

**services/tenant-gateway/.env:**
```env
# Update ALLOWED_ORIGINS to use HTTPS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com

# API URL should be HTTPS
API_URL=https://api.yourdomain.com

# Cookie security
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
```

**frontend/.env.production:**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

### Step 6: Test HTTPS Configuration

**Test SSL configuration:**
```bash
# Check certificate
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com

# Check SSL Labs rating (should be A+)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.yourdomain.com
```

**Test automatic redirect:**
```bash
curl -I http://api.yourdomain.com
# Should return 301 redirect to https://
```

---

## Option 2: Cloudflare (Easiest - FREE)

### Benefits
- Free SSL certificate
- DDoS protection
- CDN (faster page loads)
- Automatic HTTPS redirect
- No server configuration needed

### Setup Steps

1. **Sign up for Cloudflare** (free plan)
   - Visit: https://dash.cloudflare.com/sign-up

2. **Add your domain**
   - Click "Add a site"
   - Enter your domain name
   - Choose Free plan

3. **Update DNS records**
   - Point your domain to Cloudflare nameservers (they'll show you which ones)
   - Update at your domain registrar (GoDaddy, Namecheap, etc.)

4. **Configure SSL/TLS**
   - Go to SSL/TLS > Overview
   - Choose "Full (strict)" mode
   - Enable "Always Use HTTPS"
   - Enable "Automatic HTTPS Rewrites"

5. **Configure Page Rules**
   ```
   URL: http://*yourdomain.com/*
   Setting: Always Use HTTPS
   ```

6. **Update your nginx config**
   - Cloudflare handles SSL termination
   - Your nginx just needs to accept HTTPS from Cloudflare

**Nginx config for Cloudflare:**
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # Cloudflare Origin Certificate (generate in Cloudflare dashboard)
    ssl_certificate /etc/ssl/certs/cloudflare-origin.pem;
    ssl_certificate_key /etc/ssl/private/cloudflare-origin.key;
    
    # Only allow Cloudflare IPs
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    # ... (add all Cloudflare IP ranges)
    
    real_ip_header CF-Connecting-IP;
    
    # Your locations...
}
```

---

## Option 3: Self-Signed Certificate (Development/Testing Only)

### ⚠️ WARNING: Only for local development!

**Generate certificate:**
```bash
# Create directory
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed certificate (valid for 1 year)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/localhost.key \
  -out /etc/nginx/ssl/localhost.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

**Nginx config:**
```nginx
server {
    listen 443 ssl;
    server_name localhost;
    
    ssl_certificate /etc/nginx/ssl/localhost.crt;
    ssl_certificate_key /etc/nginx/ssl/localhost.key;
    
    # Rest of your config...
}
```

**Trust certificate (macOS):**
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  /etc/nginx/ssl/localhost.crt
```

---

## Docker Compose Integration

### Update docker-compose.yml

```yaml
services:
  # Add certbot service for auto-renewal
  certbot:
    image: certbot/certbot:latest
    container_name: qr_certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
    networks:
      - qr_network

  # Update nginx service
  nginx:
    image: nginx:alpine
    container_name: qr_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - tenant-gateway
      - auth-service
      # ... other services
    networks:
      - qr_network
    restart: unless-stopped
```

### Initial certificate generation (one-time)

```bash
# Create certbot directories
mkdir -p certbot/conf certbot/www

# Start nginx without SSL first
docker-compose up -d nginx

# Generate certificate
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d api.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# Restart nginx with SSL enabled
docker-compose restart nginx
```

---

## Security Best Practices

### 1. Strong SSL Configuration

**Use Mozilla SSL Configuration Generator:**
- Visit: https://ssl-config.mozilla.org/
- Choose: Nginx, Modern profile
- Copy configuration

### 2. HTTP Security Headers (in Nginx)

```nginx
# Already in Helmet, but good at nginx level too
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

### 3. Force HTTPS in Application Code

**services/tenant-gateway/src/index.ts:**
```typescript
// Add middleware to enforce HTTPS in production
server.addHook('onRequest', async (request, reply) => {
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers['x-forwarded-proto'] || 'http';
    if (proto !== 'https') {
      reply.redirect(301, `https://${request.hostname}${request.url}`);
    }
  }
});
```

### 4. Secure Cookies

```typescript
// In auth-service when setting cookies
reply.setCookie('auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7, // 1 week
  path: '/',
});
```

---

## Testing Checklist

### ✅ Pre-Deployment Testing

- [ ] Certificate installed and valid
- [ ] HTTP → HTTPS redirect working
- [ ] No mixed content warnings (all resources load via HTTPS)
- [ ] SSL Labs test shows A+ rating
- [ ] Cookies set with `Secure` flag
- [ ] WebSocket connections use `wss://`
- [ ] API calls use `https://`
- [ ] CORS allows HTTPS origins only
- [ ] Auto-renewal cron job configured

### 🔍 Post-Deployment Monitoring

**Check certificate expiry:**
```bash
echo | openssl s_client -servername api.yourdomain.com \
  -connect api.yourdomain.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

**Monitor renewal logs:**
```bash
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

**Set up expiry alerts:**
- Use https://www.ssllabs.com/ssltest/ (has email alerts)
- Or https://uptimerobot.com/ (free SSL monitoring)

---

## Troubleshooting

### Certificate not found
```bash
# Check if certificate exists
sudo ls -la /etc/letsencrypt/live/api.yourdomain.com/

# Check nginx config syntax
sudo nginx -t

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Renewal failing
```bash
# Check renewal manually
sudo certbot renew --dry-run -v

# Check certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Ensure port 80 is accessible
sudo netstat -tulpn | grep :80
```

### Mixed content errors
```bash
# Find insecure resources in frontend
grep -r "http://" src/ --include="*.tsx" --include="*.ts"

# Should only be in localhost/development configs
```

---

## Cost Summary

| Option | Cost | Renewal | Notes |
|--------|------|---------|-------|
| **Let's Encrypt** | FREE | Auto (90 days) | Industry standard, trusted by all browsers |
| **Cloudflare** | FREE | Auto | Easiest, includes DDoS protection + CDN |
| **Paid Certificate** | $50-300/year | Manual | Not necessary for most apps |
| **Self-Signed** | FREE | Manual | Development only |

---

## Recommended Choice

**For Production:** Let's Encrypt + Cloudflare
- Use Cloudflare for DNS + DDoS protection
- Use Let's Encrypt for actual SSL certificate
- Free, automatic, trusted by all browsers
- A+ SSL Labs rating possible

**For Development:** Self-signed certificate
- Quick setup
- No domain required
- Good enough for local testing

---

## Next Steps

1. ✅ Choose SSL option (Let's Encrypt recommended)
2. ✅ Update nginx.conf with HTTPS configuration
3. ✅ Generate certificate
4. ✅ Update environment variables (ALLOWED_ORIGINS, API_URL)
5. ✅ Test HTTPS redirect
6. ✅ Test SSL Labs rating
7. ✅ Set up auto-renewal
8. ✅ Monitor certificate expiry

**Estimated time:** 1-2 hours for initial setup, then automatic forever.
