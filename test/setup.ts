/**
 * Global test setup file
 * Runs before all tests
 */

import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production';
process.env.KAFKA_DISABLED = '1'; // Disable Kafka for tests

// Mock environment variables
beforeAll(() => {
  console.log('🧪 Test environment initialized');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});
