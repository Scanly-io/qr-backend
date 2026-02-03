# Security Audit Checklist

**Platform**: QR Code SaaS with 19 Microservices  
**Date**: February 2, 2026  
**Status**: Pre-Launch Security Review

---

## ✅ Already Implemented

### 1. Rate Limiting
- ✅ Gateway-level rate limiting (100 req/min)
- ✅ Redis-based distributed limiting
- ✅ Per-endpoint limits configured
- ✅ 429 responses with retry-after headers
- ✅ Sliding window algorithm (accurate)

---

## 🔴 Critical Security Issues (Must Fix Before Launch)

### 1. **Authentication & Authorization**

#### Current Risks:
- ❌ **JWT Secret Exposure**: Check if JWT_SECRET is hardcoded anywhere
- ❌ **Token Rotation**: No refresh token rotation mechanism
- ❌ **Session Management**: Redis sessions may not have proper invalidation
- ❌ **Password Storage**: Verify bcrypt/argon2 is used (not plain text!)

#### Required Actions:
```bash
# Check for hardcoded secrets
grep -r "JWT_SECRET" --include="*.ts" --include="*.js" services/

# Verify password hashing
grep -r "bcrypt\|argon2" services/auth-service/

# Check token expiry
grep -r "expiresIn\|exp" services/auth-service/
```

#### Fixes Needed:
- [ ] Move JWT_SECRET to environment variables only
- [ ] Implement token refresh rotation (invalidate old refresh tokens)
- [ ] Add session revocation (logout should clear Redis)
- [ ] Add password strength validation (min 8 chars, complexity)
- [ ] Add multi-factor authentication (2FA) for paid users

---

### 2. **Input Validation & Sanitization**

#### Current Risks:
- ❌ **SQL Injection**: Are all DB queries parameterized?
- ❌ **XSS Attacks**: User input in microsites not sanitized?
- ❌ **NoSQL Injection**: JSON payloads not validated?
- ❌ **Path Traversal**: File uploads/media service vulnerable?

#### Required Actions:
```bash
# Check for raw SQL queries (dangerous)
grep -r "db.query\|sql\`" services/ | grep -v "drizzle"

# Check for eval/exec (code injection)
grep -r "eval\|exec\|Function(" services/

# Check file upload validation
grep -r "multer\|upload\|file" services/media-service/
```

#### Fixes Needed:
- [ ] Validate all inputs with Zod/Joi schemas
- [ ] Sanitize HTML in microsite content (DOMPurify)
- [ ] Parameterize all database queries (use Drizzle properly)
- [ ] Whitelist file types for uploads (images only)
- [ ] Add file size limits (max 5MB per upload)
- [ ] Scan uploaded files for malware (ClamAV)

---

### 3. **CORS & Request Headers**

#### Current Risks:
- ❌ **Open CORS**: Allowing `*` origin exposes you to CSRF
- ❌ **Missing Security Headers**: No helmet.js protection
- ❌ **Clickjacking**: No X-Frame-Options header

#### Required Actions:
```typescript
// Check CORS config in gateway
grep -r "cors" services/tenant-gateway/

// Check for security headers
grep -r "helmet\|x-frame-options" services/
```

#### Fixes Needed:
```typescript
// In tenant-gateway/src/index.ts
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

// Security headers
await server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
});

// CORS - whitelist your domains only
await server.register(cors, {
  origin: [
    'https://yourdomain.com',
    'https://app.yourdomain.com',
    /\.yourdomain\.com$/, // Subdomains
  ],
  credentials: true,
});
```

- [ ] Install @fastify/helmet and @fastify/cors
- [ ] Configure CORS whitelist (not `*`)
- [ ] Add CSP headers (prevent XSS)
- [ ] Add X-Frame-Options: DENY (prevent clickjacking)
- [ ] Add X-Content-Type-Options: nosniff

---

### 4. **Data Encryption**

#### Current Risks:
- ❌ **Plaintext Secrets**: Are API keys encrypted in DB?
- ❌ **PII Exposure**: User emails/data encrypted at rest?
- ❌ **HTTPS Only**: Are you enforcing SSL/TLS?

#### Required Actions:
```bash
# Check for crypto usage
grep -r "crypto\|encrypt\|decrypt" services/

# Check for sensitive data logging
grep -r "console.log.*password\|log.*token" services/
```

#### Fixes Needed:
- [ ] Encrypt sensitive fields in database (API keys, OAuth tokens)
- [ ] Use HTTPS only (redirect HTTP → HTTPS in Nginx)
- [ ] Encrypt data in transit (TLS 1.3)
- [ ] Encrypt backups (PostgreSQL encryption)
- [ ] Never log passwords, tokens, or credit cards
- [ ] Add `.gitignore` for `.env` files

---

### 5. **Database Security**

#### Current Risks:
- ❌ **Weak DB Passwords**: Default `postgres/postgres`?
- ❌ **Public DB Access**: PostgreSQL exposed to internet?
- ❌ **No Backups**: Database loss = game over
- ❌ **SQL Injection**: Raw queries anywhere?

#### Required Actions:
```bash
# Check DB credentials
grep -r "POSTGRES_PASSWORD" .env* docker-compose.yml

# Check for raw SQL
grep -r "\`SELECT\|\`INSERT\|\`UPDATE" services/
```

#### Fixes Needed:
- [ ] Generate strong DB passwords (32+ chars)
- [ ] Restrict DB access to internal network only
- [ ] Enable SSL for DB connections
- [ ] Set up automated backups (daily)
- [ ] Test backup restoration process
- [ ] Use connection pooling (prevent DoS)
- [ ] Add database query timeouts (prevent long-running queries)

---

### 6. **API Security**

#### Current Risks:
- ❌ **API Key Exposure**: Are API keys in frontend code?
- ❌ **No Request Signing**: Webhooks not verified?
- ❌ **Replay Attacks**: No nonce/timestamp validation?

#### Required Actions:
```bash
# Check for API keys in frontend
grep -r "API_KEY\|SECRET" qr-frontend/src/

# Check webhook validation
grep -r "webhook\|signature" services/integrations-service/
```

#### Fixes Needed:
- [ ] Never expose API keys in frontend (use backend proxy)
- [ ] Validate webhook signatures (HMAC)
- [ ] Add request timestamps (prevent replay attacks)
- [ ] Add API versioning (/api/v1/)
- [ ] Add request size limits (max 1MB payload)
- [ ] Add timeout limits (30 seconds max)

---

### 7. **Logging & Monitoring**

#### Current Risks:
- ❌ **No Security Logs**: Can't detect breaches
- ❌ **No Alerting**: Won't know if you're attacked
- ❌ **PII in Logs**: GDPR violation risk

#### Required Actions:
```bash
# Check what's being logged
grep -r "console.log\|logger.info" services/ | head -20

# Check for sensitive data in logs
grep -r "log.*email\|log.*password" services/
```

#### Fixes Needed:
- [ ] Log all authentication attempts (success + failures)
- [ ] Log all rate limit violations
- [ ] Log all 500 errors to Sentry
- [ ] Alert on suspicious patterns (100+ failed logins)
- [ ] Mask sensitive data in logs (email → e***@***.com)
- [ ] Set up log retention (30 days)
- [ ] Add audit trail for admin actions

---

### 8. **Infrastructure Security**

#### Current Risks:
- ❌ **Open Ports**: Are unnecessary ports exposed?
- ❌ **No Firewall**: Services accessible from internet?
- ❌ **Docker Security**: Running containers as root?

#### Required Actions:
```bash
# Check Docker security
grep -r "USER root" services/*/Dockerfile

# Check exposed ports
grep -r "ports:" docker-compose.yml
```

#### Fixes Needed:
- [ ] Run Docker containers as non-root user
- [ ] Use firewall (only allow 80/443)
- [ ] Keep Docker/Node.js updated
- [ ] Scan images for vulnerabilities (Snyk/Trivy)
- [ ] Use private Docker registry
- [ ] Enable container resource limits (memory/CPU)
- [ ] Add health checks for all services

---

### 9. **Dependencies & Supply Chain**

#### Current Risks:
- ❌ **Vulnerable Packages**: `npm audit` shows issues?
- ❌ **Outdated Dependencies**: Security patches missed?
- ❌ **No Lock File**: Dependency confusion attacks?

#### Required Actions:
```bash
# Check for vulnerabilities
cd /Users/saurabhbansal/qr-backend && npm audit

# Check outdated packages
npm outdated

# Check lock file
ls package-lock.json
```

#### Fixes Needed:
- [ ] Run `npm audit fix` regularly
- [ ] Use Dependabot/Renovate for auto-updates
- [ ] Pin dependencies (use exact versions)
- [ ] Use `package-lock.json` (commit it!)
- [ ] Scan dependencies in CI/CD (Snyk)
- [ ] Review new dependencies (don't install blindly)

---

### 10. **Multi-Tenancy Security**

#### Current Risks:
- ❌ **Tenant Isolation**: Can users access other tenants' data?
- ❌ **Subdomain Takeover**: Unclaimed subdomains exploitable?
- ❌ **Cross-Tenant Leaks**: Shared cache/sessions?

#### Required Actions:
```bash
# Check tenant isolation
grep -r "WHERE.*tenant\|tenantId" services/

# Check subdomain validation
grep -r "subdomain" services/domains-service/
```

#### Fixes Needed:
- [ ] Test tenant isolation (user A can't access user B's data)
- [ ] Validate all queries include tenantId filter
- [ ] Use separate Redis namespaces per tenant
- [ ] Validate subdomain ownership before provisioning
- [ ] Add DNSSEC for domain security
- [ ] Test for IDOR vulnerabilities (insecure direct object reference)

---

## 🟡 Important (Fix Before Scaling)

### 11. **Session Management**
- [ ] Add session timeout (30 min idle)
- [ ] Add concurrent session limits (max 5 devices)
- [ ] Add session revocation on password change
- [ ] Add "logout all devices" feature

### 12. **Compliance (GDPR/CCPA)**
- [ ] Add privacy policy
- [ ] Add terms of service
- [ ] Implement data deletion (right to be forgotten)
- [ ] Add data export (download my data)
- [ ] Add cookie consent banner
- [ ] Add email opt-out mechanism

### 13. **Payment Security (If Monetizing)**
- [ ] Use Stripe/PayPal (don't store credit cards!)
- [ ] PCI DSS compliance (if storing payment data)
- [ ] Add invoice generation
- [ ] Add refund mechanism
- [ ] Test for payment fraud

---

## 🟢 Nice to Have (Post-Launch)

### 14. **Advanced Protection**
- [ ] Add CAPTCHA for login/signup
- [ ] Add bot detection (Cloudflare Bot Management)
- [ ] Add anomaly detection (unusual login patterns)
- [ ] Add IP reputation checking (block known bad IPs)
- [ ] Add device fingerprinting

### 15. **Penetration Testing**
- [ ] Hire security firm for audit ($2K-10K)
- [ ] Run automated scans (OWASP ZAP, Burp Suite)
- [ ] Bug bounty program (HackerOne)
- [ ] Regular security reviews (quarterly)

---

## 🛠️ Immediate Action Items (This Week)

### Priority 1: Must Fix Before Launch

1. **Add Security Headers**
   ```bash
   cd services/tenant-gateway
   npm install @fastify/helmet @fastify/cors
   ```

2. **Check for Secrets in Code**
   ```bash
   grep -r "password\|secret\|key" --include="*.ts" services/ | grep -v ".env"
   ```

3. **Validate Input Schemas**
   ```bash
   npm install zod
   # Add validation to all endpoints
   ```

4. **Enable HTTPS Only**
   - Get SSL certificate (Let's Encrypt free)
   - Configure Nginx to redirect HTTP → HTTPS

5. **Run Security Scan**
   ```bash
   npm audit
   npm audit fix
   ```

### Priority 2: This Month

6. **Add Logging & Monitoring**
   - Already have Sentry ✅
   - Add security event tracking to Mixpanel

7. **Test Tenant Isolation**
   - Create test script to verify users can't access other tenants

8. **Add Session Management**
   - Implement session timeout
   - Add logout endpoint that clears Redis

9. **Encrypt Sensitive Data**
   - Identify fields that need encryption (API keys, OAuth tokens)
   - Use crypto module to encrypt before saving

10. **Add Compliance Pages**
    - Privacy policy
    - Terms of service
    - Data deletion request form

---

## 📋 Security Testing Checklist

### Manual Tests to Run:

```bash
# 1. Test rate limiting (already done ✅)
./scripts/test-rate-limits.sh

# 2. Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
# Should return 401

# 3. Test CORS
curl -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3000/api/qr/create
# Should reject if CORS is configured

# 4. Test SQL injection
curl -X POST http://localhost:3000/api/qr/create \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","name":"test\"; DROP TABLE qr_codes;--"}'
# Should be sanitized

# 5. Test XSS
curl -X POST http://localhost:3000/api/microsites/create \
  -H "Content-Type: application/json" \
  -d '{"content":"<script>alert(1)</script>"}'
# Should be escaped

# 6. Test tenant isolation
# Login as user A, try to access user B's QR code
curl -H "Authorization: Bearer USER_A_TOKEN" \
  http://localhost:3000/api/qr/USER_B_QR_ID
# Should return 403 Forbidden
```

---

## 🔐 Security Best Practices Summary

### The Golden Rules:

1. **Never trust user input** - Validate everything
2. **Encrypt sensitive data** - At rest and in transit
3. **Use HTTPS only** - No exceptions
4. **Keep secrets secret** - Environment variables only
5. **Log everything** - But not sensitive data
6. **Update regularly** - Dependencies and infrastructure
7. **Test thoroughly** - Before every deploy
8. **Monitor constantly** - Know when you're under attack
9. **Fail securely** - Errors shouldn't expose info
10. **Plan for breaches** - Have incident response ready

---

## 📞 Resources

### Security Tools:
- **OWASP ZAP**: Free security scanner
- **Snyk**: Dependency vulnerability scanner
- **Trivy**: Container image scanner
- **Let's Encrypt**: Free SSL certificates
- **HackerOne**: Bug bounty platform

### Compliance:
- **GDPR Checklist**: https://gdpr.eu/checklist/
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **CIS Benchmarks**: https://www.cisecurity.org/cis-benchmarks/

### Learning:
- **OWASP Juice Shop**: Practice hacking (legally)
- **PortSwigger Academy**: Free web security training
- **Google Gruyere**: Security testing playground

---

## 🎯 Your Current Security Score: 4/10

**What You Have:**
- ✅ Rate limiting
- ✅ JWT authentication
- ✅ Database per service
- ✅ Error monitoring (Sentry)

**What You Need:**
- ❌ Security headers (CRITICAL)
- ❌ Input validation (CRITICAL)
- ❌ CORS configuration (CRITICAL)
- ❌ HTTPS enforcement (CRITICAL)
- ❌ Secrets management (CRITICAL)
- ❌ Tenant isolation testing (HIGH)

**Target for Launch: 8/10**

Add the 5 critical items above, and you'll be in good shape for a free tier launch!

---

**Next Steps:**
1. Run `npm audit` and fix vulnerabilities
2. Add security headers (helmet.js)
3. Configure CORS properly
4. Test tenant isolation
5. Get SSL certificate

**Want me to help implement any of these?** Let me know which security area to tackle first!
