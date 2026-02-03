# Testing Infrastructure Setup Guide

## Overview
This project uses **Vitest** as the testing framework for all services.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests for specific service
```bash
npm run test:auth        # Auth service
npm run test:qr          # QR service
npm run test:analytics   # Analytics service
npm run test:microsite   # Microsite service
```

## Test Structure

```
qr-backend/
├── test/
│   ├── setup.ts              # Global test setup
│   └── helpers/
│       ├── testdb.ts         # Database test utilities
│       └── testserver.ts     # Server test utilities
├── vitest.config.ts          # Vitest configuration
└── services/
    ├── auth-service/
    │   └── src/routes/
    │       └── login.test.ts
    ├── qr-service/
    │   └── src/routes/
    │       └── qr.test.ts
    ├── analytics-service/
    │   └── src/routes/
    │       └── analytics.test.ts
    └── microsite-service/
        └── src/routes/
            └── render.test.ts
```

## Writing Tests

### Example Test File

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../index';
import type { FastifyInstance } from 'fastify';

describe('My Feature', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should work', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/endpoint',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

## Test Helpers

### Database Helpers (`test/helpers/testdb.ts`)
- `createTestDb()` - Create test database connection
- `cleanDatabase()` - Clean all tables
- `factories` - Test data factories

### Server Helpers (`test/helpers/testserver.ts`)
- `generateTestToken()` - Generate JWT for auth tests
- `authenticatedRequest()` - Make authenticated requests
- `waitFor()` - Wait for async operations

## Environment Variables

Tests use these environment variables:
- `NODE_ENV=test` - Set automatically
- `JWT_SECRET=test-secret-key-do-not-use-in-production`
- `KAFKA_DISABLED=1` - Kafka disabled for tests
- `DATABASE_URL_TEST` - Test database URL (optional)

## Database Testing

For tests that require a database:

1. Set `DATABASE_URL_TEST` environment variable
2. Use `createTestDb()` helper
3. Clean database between tests with `cleanDatabase()`

Example:
```typescript
import { createTestDb, cleanDatabase, closeDatabase } from '../../../test/helpers/testdb';

describe('Database Tests', () => {
  let db, pool;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
  });

  beforeEach(async () => {
    await cleanDatabase(db);
  });

  afterAll(async () => {
    await closeDatabase(pool);
  });

  it('should insert data', async () => {
    // Your test here
  });
});
```

## Skipping Tests

Tests that require database or external dependencies are marked with `.skip()`:

```typescript
it.skip('should work with database', async () => {
  // This test requires database setup
});
```

Remove `.skip()` once you've set up the test database.

## Coverage

View coverage report after running:
```bash
npm run test:coverage
```

Coverage report will be in `coverage/` directory.

## CI/CD Integration

Tests run automatically in CI/CD pipeline (to be configured).

Example GitHub Actions workflow:
```yaml
- name: Run tests
  run: npm test

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Next Steps

1. ✅ Test infrastructure setup complete
2. ⏳ Set up test database
3. ⏳ Write integration tests
4. ⏳ Set up CI/CD pipeline
5. ⏳ Add E2E tests
