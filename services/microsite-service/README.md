# Microsite Service

The Microsite Service lets you publish and serve simple HTML microsites that are linked to QR codes. Think of it as: generate QR in one service, then show a branded landing page when someone scans it.

---
## 1. What Does It Do?
| Action | Endpoint | Auth? | Description |
|--------|----------|-------|-------------|
| Publish microsite | `POST /microsite/:qrId/publish` | Yes (JWT) | Renders and stores HTML; caches it in Redis |
| View published microsite | `GET /public/:qrId` | No | Serves HTML (fast: uses Redis cache) |
| Microsite metadata (future) | `GET /microsite/:qrId` | Planned | View stored layout/theme data |

When a visitor accesses `/public/:qrId`:
1. Check Redis cache (fast path). If HIT → return HTML immediately.
2. If MISS: read from Postgres, cache HTML, return it.
3. Emit a Kafka analytics event (stubbed if Kafka down).

---
## 2. Quick Start (Local Development)
### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Redis running locally (optional but recommended)

### Environment Variables (minimum)
Create `services/microsite-service/.env`:
```
DATABASE_URL=postgres://YOUR_USER@localhost:5432/microsite_service
JWT_SECRET=devsecret
KAFKA_DISABLED=1          # optional: skip Kafka in dev
REDIS_URL=redis://localhost:6379  # if your helper expects it
```

### Start Only This Service
From repository root:
```
npm run dev --workspace=@qr/microsite-service
```
If you see a Kafka timeout log, that's fine (it will fall back to a stub).

---
## 3. Publishing Flow (Step by Step)
1. You (the creator) obtain a JWT from the Auth Service (login/signup).
2. Call `POST /microsite/:qrId/publish` with Authorization header.
3. Service fetches microsite row by `qrId`.
4. Validates you own it (`createdBy === user.id`).
5. Renders HTML (using layout/theme – currently simple placeholder logic).
6. Saves HTML + timestamp to Postgres.
7. Caches HTML in Redis under key: `microsite:<qrId>`.
8. Responds with JSON: `{ "message": "Published successfully", "length": <bytes> }`.

### Example (assuming you already have a microsite row)
```bash
TOKEN="<paste JWT here>"
QRID="publish-test-qr"
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3005/microsite/$QRID/publish
```
Response:
```json
{ "message": "Published successfully", "length": 987 }
```

---
## 4. Viewing Public Microsite
After publishing, anyone (no auth) can visit:
```
http://localhost:3005/public/<qrId>
```
First request → `X-Cache: MISS` header.
Second request → `X-Cache: HIT` header.

Test:
```bash
curl -i http://localhost:3005/public/publish-test-qr | grep -i x-cache
curl -i http://localhost:3005/public/publish-test-qr | grep -i x-cache
```
Expected:
```
X-Cache: MISS
X-Cache: HIT
```

---
## 5. Authentication (JWT)
The publish endpoint requires a Bearer token.
Authorization header format:
```
Authorization: Bearer <jwt>
```
The token payload must include:
```
{
  "sub": "<userId>",
  "email": "<user email>",
  ... standard iat/exp claims
}
```
The Auth Service issues this token on login.

Common errors:
| Status | Cause | Fix |
|--------|-------|-----|
| 401 | Missing/invalid header | Ensure `Authorization: Bearer <token>` present |
| 401 | Token uses `id` instead of `sub` | Sign token with `{ sub: userId }` |
| 403 | You don't own microsite | Use JWT for the creating user or adjust `createdBy` |
| 404 | Microsite row missing | Insert row into DB before publishing |

---
## 6. Caching Logic (Redis)
Key format: `microsite:<qrId>`
Values: Raw HTML string.
Cache headers:
- `X-Cache: MISS` → Fetched from DB & just stored.
- `X-Cache: HIT` → Served directly from Redis.

Why cache? Faster response + lower DB load.

Optional future enhancement: add TTL (expiration):
```ts
await cache.set(key, html, { EX: 3600 }); // expire after 1 hour
```

---
## 7. Kafka (Optional / Graceful Degradation)
If Kafka is running, each view sends:
```json
{
  "type": "microsite.viewed",
  "qrId": "publish-test-qr",
  "timestamp": "2025-11-22T22:34:00.000Z"
}
```
If Kafka is NOT running and `KAFKA_DISABLED=1` or it times out:
- A stub producer is used.
- Your code still calls `producer.send()` safely.
- No crashes.

You can ignore Kafka until you need analytics.

---
## 8. Directory Structure (Service)
```
services/microsite-service/
  ├── src/
  │   ├── index.ts            # Service entry point
  │   ├── routes/
  │   │   ├── publish.ts      # Authenticated publish endpoint
  │   │   └── render.ts       # Public HTML endpoint with caching
  │   ├── schema.ts           # Drizzle ORM table definitions
  │   ├── db.ts               # Postgres connection + drizzle
  │   └── utils/              # Helper functions (renderMicrosite, cache keys)
  ├── drizzle.config.ts       # Drizzle CLI config
  ├── package.json            # Workspace package definition
  └── .env                    # Environment variables
```

---
## 9. Troubleshooting Cheatsheet
| Issue | Symptom | Fix |
|-------|---------|-----|
| Kafka timeout | Logs show connect timeout | Set `KAFKA_DISABLED=1` in .env |
| 401 publishing | "Missing or invalid Authorization" | Add proper Bearer header |
| 403 publishing | "Forbidden" | Use JWT for creator userId (matches `createdBy`) |
| 404 public view | "Microsite not published" | Publish first or ensure `publishedHtml` exists |
| HTML not updating | Still seeing old content | Delete Redis key or add TTL policy |
| Token always invalid | 401 "Invalid token" | Ensure `dotenv/config` is imported BEFORE other code |

---
## 10. Future Enhancements (TODO)
- Rate limiting for public endpoint
- TTL on cached HTML (auto refresh)
- HTML sanitization (security hardening)
- Health & readiness endpoints
- Retry/backoff for Kafka real connection
- Integration tests (publish → render HIT/MISS)

Add these as you grow—current setup is fine for learning & early prototype usage.

---
## 11. Minimal Mental Model
"Publish once, serve many":
- Publish = generate + store + cache
- Public view = read cache (or DB fallback) + fire analytics
- Kafka optional; Redis optional but recommended for speed
- Auth only needed for publish; viewing is public.

---
## 12. Example End-to-End Flow
```bash
# 1. Login (Auth Service) – get JWT (example token used below)
TOKEN="eyJhbGciOi..."  # must contain sub + email

# 2. Publish microsite
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3005/microsite/publish-test-qr/publish
# → { "message": "Published successfully", "length": 987 }

# 3. View publicly (first time)
curl -i http://localhost:3005/public/publish-test-qr | grep -i x-cache
# → X-Cache: MISS

# 4. View again (served from Redis)
curl -i http://localhost:3005/public/publish-test-qr | grep -i x-cache
# → X-Cache: HIT
```

---
## 13. Glossary (Plain English)
| Term | Meaning |
|------|---------|
| JWT | A signed "proof" you’re an authenticated user |
| Redis | Super fast key-value store used here as a cache |
| Kafka | Event streaming system; we just emit view events |
| Drizzle ORM | TypeScript-friendly database query library |
| Publish | Render HTML and save it so people can view it |
| Cache HIT | We found a stored copy → faster |
| Cache MISS | No stored copy → we build/cache it now |

---
## 14. You’re Not a Developer? Start Here
1. Start service: `npm run dev --workspace=@qr/microsite-service`
2. Get a JWT (ask the Auth service or mock one with `sub` + `email`).
3. Publish: use curl command above.
4. View it: visit `http://localhost:3005/public/<qrId>` in browser.
5. Change content? Re-publish.

You can copy/paste the curl commands; just swap the QR ID and JWT.

---
## 15. Support
If something is unclear, open the file and follow comments:
- `publish.ts` → how publishing works
- `render.ts` → caching flow
- `mq.ts` (in common) → why Kafka stubs exist

Happy building!
