# QR Backend – Roadmap

_Last updated: 2025-11-10_

This roadmap outlines phases, milestones, timelines, and exit criteria to take the QR backend from a working prototype to a production-grade platform.

---
## Phase 0 — Done (Foundation)
Timeline: Completed

Milestones:
- End-to-end pipeline: QR → Kafka → Analytics → DB
- Prometheus + Grafana up; metrics exported
- Event schema validation in place
- Fixes documented in `FIXES.md` and architecture in `README.md`

Exit criteria:
- Events reliably flowing; metrics accessible; no critical runtime errors.

---
## Phase 1 — Stabilization (Weeks 1–2)
Milestones:
- Add graceful shutdown to analytics consumer
- Idempotency: event UUID + UNIQUE index + upsert
- Replace `drizzle push` with generated migrations and migration runner
- Containerize both services with production Dockerfiles
- Secure Grafana credentials; restrict `/metrics`

Deliverables:
- PRODUCTION Docker images published to registry
- Migration artifacts in VCS, applied in dev/staging via script
- Minimal runbooks for consumer stuck/lag, DB connection saturation

Exit criteria:
- No duplicate events on replay
- Clean shutdowns; no uncommitted offsets lost
- Reproducible migrations; containers run with non-root user

---
## Phase 2 — Hardening (Weeks 3–4)
Milestones:
- DLQ processor for `analytics.errors` + alert on DLQ volume
- Retry with exponential backoff + jitter around DB writes
- Health/readiness probes and `/ready` endpoint
- API auth (JWT or API key) + CORS allowlist + rate limits
- Basic Prometheus alerts (error rate, latency, consumer lag, target down)

Deliverables:
- Alert rules committed; dashboards for latency/RPS/errors/lag
- Security posture doc (auth/secret handling/ports exposure)

Exit criteria:
- Alerting effective in staging; SLOs defined
- Security checks pass; `/metrics` not publicly accessible

---
## Phase 3 — Observability & CI/CD (Weeks 5–6)
Milestones:
- OpenTelemetry traces across HTTP + Kafka spans
- CI: lint, typecheck, test, build, image build+scan, push
- CD: staged deploys to dev/staging; manual gate to prod
- Centralized logs (Loki/ELK) with correlation IDs in logs

Deliverables:
- Grafana dashboards + tracing views
- GitHub Actions (or similar) pipelines files

Exit criteria:
- One-click deploy to staging; visible traces for end-to-end requests
- All PRs must pass CI gates

---
## Phase 4 — Scaling & Resilience (Weeks 7–8)
Milestones:
- Multi-partition Kafka topics (6–12); define partition key strategy
- Horizontal scaling of analytics consumers (HPA policy if on K8s)
- Postgres connection pool tuning; consider pgbouncer
- Backups: scheduled DB backups with restore runbook

Deliverables:
- Load test results and capacity plan
- Backup verification (restore tested)

Exit criteria:
- Sustained target throughput with <1% error rate and p95 < 400ms
- Restore-from-backup tested successfully

---
## Phase 5 — Optimization & Governance (Weeks 9–12)
Milestones:
- Data retention & archival policies (raw vs aggregated)
- Cost monitoring and budgets
- Blue/green or canary deploys
- Security audit and dependency scanning baseline

Deliverables:
- Policy docs and automation scripts
- Deployment strategy doc (rollback, canary thresholds)

Exit criteria:
- Predictable costs; audited dependencies; safe deployment patterns

---
## Success Metrics by Phase
| Phase | p95 Latency | Error Rate | Duplicates | CI Pass % | MTTR |
|------|-------------|------------|------------|-----------|------|
| P1   | < 600ms     | < 2%       | < 0.1%     | 80%       | < 60m |
| P2   | < 500ms     | < 1.5%     | < 0.05%    | 90%       | < 45m |
| P3   | < 450ms     | < 1%       | < 0.02%    | 95%       | < 40m |
| P4   | < 400ms     | < 1%       | < 0.01%    | 97%       | < 30m |
| P5   | < 350ms     | < 0.8%     | < 0.01%    | 98%       | < 25m |

---
## Ownership & Roles (Placeholder)
- Platform: Kafka/Redpanda ops, clustering
- Backend: Services, DB schema, DLQ
- SRE/DevOps: CI/CD, observability, alerts, runbooks
- Security: auth, secrets, vulnerability management

---
## Risks & Mitigations (Ongoing)
- Single-broker dev setup → Plan multi-broker prod cluster
- No idempotent writes → Add unique keys and upsert
- No alerting → Add baseline alert rules in Phase 2
- No backups → Add scheduled backups + restore drills in Phase 4

---
## Dependencies
- Container registry access
- Secrets manager / vault
- Monitoring stack (Prometheus/Grafana/OTEL)
- Load testing tools (k6, Artillery)

---
## How to Use This Roadmap
- Treat timelines as guidance; adapt based on findings
- Update "Last updated" date when editing
- Link PRs and tickets to each milestone for traceability
