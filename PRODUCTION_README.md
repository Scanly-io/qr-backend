# QR Backend – Production Readiness Guide

_Last updated: 2025-11-10_

This document complements the main `README.md` and focuses on what is required to run the QR backend system reliably in a production environment.

---
## 1. Executive Summary
The core event pipeline (QR Service → Redpanda → Analytics Service → PostgreSQL + Metrics) works. To reach production-grade reliability we must address gaps in: resiliency (DLQ, retries, idempotency), security (authN/Z, secret management, TLS), observability (dashboards, alerts, tracing), operational maturity (CI/CD, migrations discipline, backups), and scalability (partitioning, horizontal replication).

---
## 2. Current Capability Matrix
| Area | Status | Notes |
|------|--------|-------|
| Core Event Flow | ✅ Functional | Events move end-to-end successfully |
| Validation | ✅ Schema (Zod) | Strict literal validation for `qr.scanned` |
| Metrics | ✅ Basic | HTTP latency histogram + default metrics |
| Logging | ✅ Structured | Pino pretty in dev; needs JSON in prod |
| Storage | ✅ Single table | Lacks migrations history & versioning |
| Deployment | ⚠️ Dev scripts | `npm run dev`; no prod entrypoint or container images |
| Resiliency | ❌ Limited | No DLQ processor, no retries/backoff, no idempotency |
| Security | ❌ Minimal | No auth, default Grafana creds, plaintext env vars |
| Observability | ⚠️ Partial | Metrics only, no dashboards/alerts/traces |
| Scalability | ❌ Single broker/partition | Topic: 1 partition, replication factor 1 |
| Data Management | ❌ No backups | No retention, archiving, compliance strategy |
| CI/CD | ❌ Absent | No automated lint/test/build/publish pipeline |

Legend: ✅ Ready | ⚠️ Partial | ❌ Missing

---
## 3. Gaps & Required Improvements
### 3.1 Reliability & Resilience
- Implement DLQ consumer for `analytics.errors` topic.
- Retry with exponential backoff + jitter (e.g. 100ms → 200ms → 400ms, cap 2s).
- Idempotent inserts: introduce event UUID (e.g. hash of `qrId + userId + timestamp`) and a UNIQUE constraint, use UPSERT.
- Graceful shutdown for analytics consumer (disconnect & commit offsets).

### 3.2 Security
- Remove default Grafana `admin/admin` credentials; provision via secret.
- Add API authentication (JWT or service-issued tokens) and optional API keys.
- Restrict `/metrics` via network policy or auth middleware.
- Use `.env.example` + `dotenv-safe`; plan migration to secret manager (AWS Secrets Manager / Vault).
- Enable TLS termination (reverse proxy: Nginx / AWS ALB) and Kafka SASL/TLS when clustering.

### 3.3 Observability
- Dashboards: latency percentiles, RPS, error rates, consumer lag, DB connections.
- Alerts: high error rate (>5% 5m), p95 latency breach, consumer lag growth, target down, DB connection saturation.
- Tracing: OpenTelemetry SDK (HTTP + Kafka spans) exporting to OTEL collector → Jaeger/Tempo.
- Log aggregation: Loki / Elasticsearch with correlation ID (`trace_id`).

### 3.4 Data & Persistence
- Drizzle migrations generated (`drizzle-kit generate`) checked into VCS and applied via CI.
- Automated daily PostgreSQL backups + PITR (Point-In-Time Recovery) if on cloud provider.
- Data retention strategy (raw events vs aggregated analytics).
- Consider partitioning / sharding strategy when volume grows.

### 3.5 Performance & Scalability
- Kafka topic `qr.events`: increase partitions based on throughput expectations (start with 6–12).
- Configure replication factor ≥ 3 (in clustered Redpanda/Kafka) for durability.
- Horizontal scale: multiple Analytics Service instances (consumer group rebalancing).
- Connection pools: tune PostgreSQL pool size; add pgbouncer if necessary.

### 3.6 Operations & Delivery
- CI pipeline: lint (`eslint`), typecheck (`tsc --noEmit`), test (unit/integration), build (`tsc`), image build (`docker build`), scan (Trivy), push, deploy.
- Canary / feature flag strategy for risky releases.
- Incident response runbooks (Kafka lag, DB saturation, high error rate).

### 3.7 Risk Register (Initial)
| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Duplicate events | Data skew | Medium | Idempotency + UNIQUE constraint |
| Consumer lag spike | Delayed analytics | Medium | Alerts + autoscale consumers |
| Lost messages (single broker) | Data loss | Medium | Multi-broker cluster |
| Secrets leak (.env committed) | Security breach | Low | `.gitignore` + secret manager |
| Unbounded DB growth | Storage cost | High | Archival + retention policy |

---
## 4. Architecture (Prod-Oriented)
```
┌──────────────┐     ┌────────────────────┐       ┌─────────────────────┐
│  Edge (TLS)  │────▶│  QR Service (API)  │──────▶│  Redpanda/Kafka      │
└──────────────┘     │  Container (xN)   │       │  Cluster (3 brokers) │
                      └─────────▲────────┘       └─────────▲───────────┘
                                │                          │
                                │                          │
                                │            ┌─────────────┴────────────┐
                                │            │ Analytics Service (xM)   │
                                │            │ Consumers (group)        │
                                │            └─────────────▲────────────┘
                                │                          │
                                │                          │
                                │                    ┌─────┴────────┐
                                │                    │ PostgreSQL    │
                                │                    │ Primary + RO  │
                                │                    └─────▲────────┘
                                │                          │
                                │                          │
                         ┌───────┴───────┐          ┌──────┴────────┐
                         │ Prometheus    │◀────────▶│ Grafana        │
                         │ + OTEL Col.   │          │ Dashboards     │
                         └───────────────┘          └───────────────┘
```

---
## 5. Deployment Strategy
### Build
1. Compile TypeScript → `dist/` artifacts.
2. Generate SBOM + vulnerability scan (Trivy). 
3. Build minimal Docker image (dist + production deps only).

### Runtime
- Use process manager: Node inside container (no PM2 needed if single process).
- Health probes: `/health` (liveness), `/ready` (readiness with Kafka + DB checks).
- Resources: set CPU/memory requests & limits; tune GC if needed.

### Configuration
| Item | Approach |
|------|----------|
| Secrets | Vault/Secrets Manager mounted as env |
| Feature Flags | Environment-based or LaunchDarkly |
| Scaling | HPA on latency / consumer lag / RPS |
| Rollbacks | Keep last 2 image tags; fast revert script |

---
## 6. Operational Checklists
### Pre-Deploy
- [ ] All migrations applied in staging
- [ ] Integration tests green
- [ ] Image vulnerability scan PASS
- [ ] Observability dashboards updated
- [ ] Runbook links embedded in alerts

### Post-Deploy
- [ ] p95 latency stable
- [ ] Error rate < 1% over 30m
- [ ] Consumer lag nominal
- [ ] No abnormal log bursts

### Incident Triage (Example)
1. Identify metric breach (Alert fired: high error rate).
2. Check recent deploy; compare version.
3. Examine structured logs filtered by `level=error` & `trace_id` concentration.
4. If Kafka lag: scale consumers, inspect partitions, verify broker health.
5. Rollback if MTTR > threshold (e.g., 15 minutes).

---
## 7. Migration Discipline
- Never use `push` in production; always `generate` → review → `migrate`.
- Tag schema versions; embed migration ID in app logs at startup.
- Add `schema_version` table to verify expected migrations applied.

---
## 8. Idempotency Pattern Proposal
```sql
ALTER TABLE scans ADD COLUMN event_uuid TEXT;
CREATE UNIQUE INDEX scans_event_uuid_idx ON scans(event_uuid);
```
Application logic:
```ts
const eventUUID = createHash('sha256')
  .update(`${payload.qrId}|${payload.userId}|${payload.timestamp}`)
  .digest('hex');
await db.insert(scans).values({ ...mapped, eventUuid: eventUUID })
  .onConflictDoNothing();
```

---
## 9. Alert Suggestions (Prometheus Rules)
```yaml
- alert: HighErrorRate
  expr: sum(rate(http_request_duration_ms_count{status=~"5.."}[5m])) 
        / sum(rate(http_request_duration_ms_count[5m])) > 0.05
  for: 10m
  labels:
    severity: page
  annotations:
    summary: Elevated error rate (>5%)

- alert: HighLatencyP95
  expr: histogram_quantile(0.95, sum by (le, service)(rate(http_request_duration_ms_bucket[5m]))) > 1
  for: 5m
  labels:
    severity: warn
  annotations:
    summary: p95 latency > 1s

- alert: ConsumerLagGrowing
  expr: increase(kafka_consumer_lag[10m]) > 1000
  for: 10m
  labels:
    severity: warn
  annotations:
    summary: Kafka consumer lag increasing
```

---
## 10. Glossary
| Term | Definition |
|------|------------|
| DLQ | Dead Letter Queue; where failed messages are routed |
| Idempotency | Performing same operation multiple times yields same result |
| Consumer Lag | Difference between produced and consumed offsets |
| p95 Latency | 95th percentile response time; 95% of requests faster |
| MTTR | Mean Time To Recovery; average outage resolution time |
| HPA | Horizontal Pod Autoscaler (Kubernetes) |

---
## 11. Success Metrics (Initial Targets)
| Metric | Target (Phase 1) |
|--------|------------------|
| p95 latency | < 400ms |
| Error rate | < 1% sustained |
| Data loss incidents | 0 |
| Mean deploy time | < 10m |
| MTTR | < 30m |
| Duplicate events | < 0.01% |

---
## 12. Next Immediate Actions (Week 1-2)
1. Add idempotency key + UNIQUE index.
2. Implement graceful shutdown in analytics consumer.
3. Switch to generated migrations.
4. Containerize services with production Dockerfiles.
5. Provision initial Grafana dashboards (Latency, RPS, Errors, Lag).

---
## 13. Ownership Placeholders
| Area | Suggested Owner Role |
|------|----------------------|
| Kafka Infrastructure | Platform Engineer |
| Database & Migrations | Backend Engineer |
| Observability | SRE / DevOps |
| Security Hardening | Security Engineer |
| CI/CD Pipeline | DevOps Engineer |
| DLQ Processing | Backend Engineer |

---
## 14. Decommission / Sunsetting Considerations
If pivoting away from QR analytics:
- Export raw events to cold storage (S3/Archive).
- Final backup & retention policy compliance.
- Disable producers, drain consumers, archive topics.
- Remove dashboards & alert rules.

---
## 15. Open Questions
| Question | Decision Needed By |
|----------|--------------------|
| Choose tracing backend (Tempo vs Jaeger) | Before Observability Phase |
| Select auth method (JWT vs API key) | Before Public API exposure |
| Multi-region strategy? | After initial scale test |
| Data retention period? | Before first TB stored |

---
## 16. Change Log
- 2025-11-10: Initial production readiness draft created.

---
### Final Note
This guide is a living document; update as architecture evolves.
