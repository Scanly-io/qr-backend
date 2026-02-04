# Docker Quick Reference

This project uses Docker with individual Dockerfiles per service and a centralized docker-compose configuration.

## Environment Files Strategy

- **`.env.docker`** - Shared Docker environment (committed to git)
- **`services/*/\.env.docker`** - Per-service Docker config (committed to git)
- **`services/*/\.env`** - Local development config (gitignored)
- **`.env.docker.local`** - Local Docker overrides (gitignored, optional)

## Quick Start

```bash
# Start all services with infrastructure
docker-compose up -d

# Start only infrastructure (postgres, redis, kafka)
docker-compose up -d postgres redis redpanda

# Start specific service
docker-compose up -d qr-service

# View logs
docker-compose logs -f qr-service

# Rebuild after code changes
docker-compose up -d --build qr-service

# Stop everything
docker-compose down
```

## Development Mode

For development with hot reload:

```bash
# Start infrastructure only
docker-compose up -d postgres redis redpanda

# Run services locally with auto-restart
npm run dev:all
```

Or use the dev override:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Production Deployment

1. **Set production secrets** in `.env.docker.local`:

   ```bash
   JWT_SECRET=your-production-secret-here
   POSTGRES_PASSWORD=strong-password
   ```

2. **Build images**:

   ```bash
   docker-compose build
   ```

3. **Run**:

   ```bash
   docker-compose up -d
   ```

## Environment Configuration

### Required Variables (set in `.env.docker.local` for production)

- `JWT_SECRET` - Must be changed from default
- `POSTGRES_PASSWORD` - Strong password for production

### Optional Overrides

- `KAFKA_DISABLED=true` - Disable Kafka, use stubs
- `REDIS_URL` - Custom Redis connection
- `DATABASE_URL` - Override per-service if needed

## Ports

| Service | Port |
|---------|------|
| Auth | 3001 |
| QR | 3002 |
| Analytics | 3004 |
| Microsite | 3005 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Redpanda | 9092 |
| Prometheus | 9090 |
| Grafana | 3000 |

## Health Checks

```bash
# Check service health
curl http://localhost:3002/health

# Check all services
docker-compose ps

# View service logs
docker-compose logs -f
```

## Common Issues

### Services can't connect to database

- Ensure postgres is healthy: `docker-compose ps postgres`
- Check logs: `docker-compose logs postgres`

### Kafka connection errors

- Expected during startup, services will retry
- Or set `KAFKA_DISABLED=true` to use stubs

### Port already in use

- Stop local services: `npm run stop` or kill processes on ports
- Or change port mappings in docker-compose.yml

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│                  Infrastructure                      │
│  postgres (5432) │ redis (6379) │ redpanda (9092)   │
└─────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ auth-service │  │  qr-service  │  │  analytics   │
│    (3001)    │  │    (3002)    │  │    (3004)    │
└──────────────┘  └──────────────┘  └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  microsite   │
                  │    (3005)    │
                  └──────────────┘
```

## Security Notes

- Never commit `.env.docker.local` with production secrets
- Change default `JWT_SECRET` in production
- Use strong `POSTGRES_PASSWORD` in production
- `.env.docker` contains safe defaults for development only
