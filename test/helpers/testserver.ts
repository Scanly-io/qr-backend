/**
 * Test Server Helpers
 * 
 * Utilities for testing Fastify applications
 */

import { FastifyInstance } from 'fastify';

/**
 * Generate a test JWT token
 */
export function generateTestToken(userId: string = 'test-user-id') {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: userId, email: 'test@example.com' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

/**
 * Make authenticated request helper
 */
export async function authenticatedRequest(
  app: FastifyInstance,
  options: {
    method: string;
    url: string;
    payload?: any;
    userId?: string;
  }
) {
  const token = generateTestToken(options.userId);
  
  return app.inject({
    method: options.method,
    url: options.url,
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: options.payload,
  });
}

/**
 * Wait for async operations to complete
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
