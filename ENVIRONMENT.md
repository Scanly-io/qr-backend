# Environment Variables Reference

This guide lists every environment variable used across the services, what it does, if it's required, and a safe default for local development.

> Tip: Start with the MINIMUM section. Add others only when you need the related feature (Kafka, Redis, etc.).

---
## 1. Minimum Needed Per Service

| Service | Required Vars | Example |
|---------|---------------|---------|
| Auth Service | `DATABASE_URL`, `JWT_SECRET` | `DATABASE_URL=postgres://user@localhost:5432/auth_service`  `JWT_SECRET=devsecret` |
| Microsite Service | `DATABASE_URL`, `JWT_SECRET` | `DATABASE_URL=postgres://user@localhost:5432/microsite_service`  `JWT_SECRET=devsecret` |
| QR Service | `DATABASE_URL` | `DATABASE_URL=postgres://user@localhost:5432/qr_service` |
| Analytics Service | `DATABASE_URL` | `DATABASE_URL=postgres://user@localhost:5432/qr_analytics` |
| Common (shared) | (none strictly required) | — |

If you don’t define Redis or Kafka variables the code still runs (Redis falls back to localhost; Kafka can be disabled).

---
## 2. Authentication / JWT

| Variable | Required? | Default | Used In | Purpose |
|----------|-----------|---------|--------|---------|
| `JWT_SECRET` | YES (Auth + any service verifying tokens) | (none) | `packages/common/src/jwthelper.ts`, `auth-service` | Secret key for signing & verifying JWT tokens. Must be identical across services that validate tokens. |
| `JWT_EXPIRES_IN` | NO | `15m` | `packages/common/src/jwthelper.ts` | Token lifetime (e.g. `15m`, `1h`). |

> If `JWT_SECRET` is missing, token verification throws: "JWT_SECRET not set".

---
## 3. Database

| Variable | Required? | Default | Used In | Purpose |
|----------|-----------|---------|--------|---------|
| `DATABASE_URL` | YES (each service) | (none) | `src/db.ts` per service & drizzle config | PostgreSQL connection string. Example: `postgres://user@localhost:5432/service_db`. |

Format examples:
```text
postgres://user@localhost:5432/microsite_service
postgresql://user:password@localhost:5432/auth_service
```

---
## 4. Redis (Caching)

| Variable | Required? | Default | Used In | Purpose |
|----------|-----------|---------|--------|---------|
| `REDIS_URL` | NO | `redis://localhost:6379` | `packages/common/src/config.ts` → `cache.ts` | Connection URL for Redis cache (used for microsite HTML caching). |

If Redis is not running and you try to connect, you’ll see connection errors. The microsite service will still function but every public view becomes a DB read.

---
## 5. Kafka (Optional / Graceful Degradation)

| Variable | Required? | Default | Used In | Purpose |
|----------|-----------|---------|--------|---------|
| `KAFKA_DISABLED` | NO | `"0"` (enabled) | `packages/common/src/mq.ts` | Set to `1` to completely disable Kafka (stubs used). |
| `KAFKA_BROKER` | NO | `localhost:9092` | `packages/common/src/mq.ts` | Single broker address (alternative to `KAFKA_BROKERS`). |
| `KAFKA_BROKERS` | NO | `localhost:9092` | `packages/common/src/mq.ts` | Comma/space separated list of brokers for HA. e.g. `k1:9092,k2:9092`. |
| `KAFKA_CLIENT_ID` | NO | `qr-backend` | `packages/common/src/mq.ts` | Identifies this app in Kafka logs. |
| `KAFKA_CONNECT_TIMEOUT_MS` | NO | `5000` | `packages/common/src/mq.ts` | Max wait time (ms) before falling back to stub producer/consumer. |
| `KAFKA_LEGACY_PARTITIONER` | NO | `"0"` | `packages/common/src/mq.ts` | Set `1` to use old partitioning algorithm (legacy hash). |

**Behavior Summary:**
 
 - If Kafka unreachable within timeout → log error, use stub (no crashes).
- If `KAFKA_DISABLED=1` → skip connection attempt entirely.

---
## 6. Service Identification / Misc

| Variable | Required? | Default | Used In | Purpose |
|----------|-----------|---------|--------|---------|
| `PORT` | NO | Service-specific default (e.g. 3005 microsite) | Each service `index.ts` | Override listening port. |
| `SERVICE_NAME` | NO (set in code) | (varies) | Logging initialization | Tag logs with the service name. |

---
## 7. Example .env Files

### Microsite Service (`services/microsite-service/.env`)

```env
DATABASE_URL=postgres://saurabhbansal@localhost:5432/microsite_service
JWT_SECRET=devsecret
KAFKA_DISABLED=1
REDIS_URL=redis://localhost:6379
```

### Auth Service (`services/auth-service/.env`)

```env
DATABASE_URL=postgres://saurabhbansal@localhost:5432/auth_service
JWT_SECRET=devsecret
JWT_EXPIRES_IN=1h
```

### QR Service (`services/qr-service/.env`)

```env
DATABASE_URL=postgres://saurabhbansal@localhost:5432/qr_service
```

### Analytics Service (`services/analytics-service/.env`)

```env
DATABASE_URL=postgres://saurabhbansal@localhost:5432/qr_analytics
KAFKA_DISABLED=1
```

> Use separate DBs per service to keep schemas isolated and simpler to evolve.

---

## 8. Common Gotchas

| Symptom | Likely Missing Variable | Fix |
|---------|-------------------------|-----|
| 401 "Invalid token" everywhere | `JWT_SECRET` not loaded early | Ensure `import "dotenv/config";` is first line in service entry file |
| Kafka log spam / timeouts | Not disabled in dev | Set `KAFKA_DISABLED=1` while learning |
| Redis key never found | `REDIS_URL` incorrect | Use `redis://localhost:6379` locally |
| Publish always 403 | User mismatch | JWT `sub` must match microsite `createdBy` value |
| Cache never HIT | Redis not running | Start Redis or accept MISS-only behavior |

---

## 9. Priorities For Learning Setup

1. Start with DB + JWT only (`DATABASE_URL`, `JWT_SECRET`).
2. Add Redis once publish → view flow works.
3. Add Kafka when you want analytics events.
4. Tune timeouts & partitioner only for production cases.

---

## 10. Security Notes

- Never commit real production secrets.
- Use long random `JWT_SECRET` in production.
- Consider using `.env.local` pattern and a secret manager later.

---

## 11. Checklist When Adding a New Service

| Step | What to Define |
|------|----------------|
| 1 | Create service folder + `package.json` |
| 2 | Add `DATABASE_URL` for that service DB |
| 3 | (If needs auth) Reuse existing `JWT_SECRET` |
| 4 | Add `import "dotenv/config";` at top of `index.ts` |
| 5 | Decide if Kafka needed (`KAFKA_DISABLED=1` otherwise) |
| 6 | Add routes + (optional) Swagger docs |
| 7 | Test with curl (watch logs for missing env) |

---

## 12. Quick Sanity Script (Optional)

Use this script idea to validate all expected env vars:

```bash
#!/usr/bin/env bash
REQUIRED=(DATABASE_URL JWT_SECRET)
MISSING=()
for VAR in "${REQUIRED[@]}"; do
  if [ -z "${!VAR}" ]; then
    MISSING+=("$VAR")
  fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  echo "Missing required env vars: ${MISSING[*]}"; exit 1
else
  echo "All required env vars present"; fi
```

---

## 13. Summary

To run locally with minimal friction:

```env
# Auth service
DATABASE_URL=postgres://user@localhost:5432/auth_service
JWT_SECRET=devsecret

# Microsite service
DATABASE_URL=postgres://user@localhost:5432/microsite_service
JWT_SECRET=devsecret
KAFKA_DISABLED=1
REDIS_URL=redis://localhost:6379
```

Everything else is optional. Start small, layer features as you understand them.


