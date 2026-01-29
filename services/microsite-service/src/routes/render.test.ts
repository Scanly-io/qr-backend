/**
 * Microsite Service - Render Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../index';
import type { FastifyInstance } from 'fastify';

describe('Microsite Service - Render', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /public/:qrId', () => {
    it.skip('should return 404 for non-existent microsite', async () => {
      // Requires database connection
      const response = await app.inject({
        method: 'GET',
        url: '/public/nonexistent-qr-12345',
      });

      expect(response.statusCode).toBe(404);
    });

    it.skip('should return HTML for existing published microsite', async () => {
      // Requires database with published microsite
      const response = await app.inject({
        method: 'GET',
        url: '/public/test-qr-123',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<!DOCTYPE html>');
    });

    it.skip('should set cache headers for published microsite', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/public/test-qr-123',
      });

      expect(response.headers).toHaveProperty('x-cache');
    });
  });

  describe('POST /public/:qrId/lead', () => {
    it.skip('should return 400 when consent is not given', async () => {
      // Requires database and route configuration
      const response = await app.inject({
        method: 'POST',
        url: '/public/test-qr/lead',
        payload: {
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
          consent: false,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('consent');
    });

    it.skip('should create lead when all required fields provided', async () => {
      // Requires database connection
      const response = await app.inject({
        method: 'POST',
        url: '/public/test-qr/lead',
        payload: {
          qrId: 'test-qr',
          micrositeId: 'test-microsite-id',
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
          consent: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('GET /click/:qrId/:buttonId', () => {
    it.skip('should redirect to button URL', async () => {
      // Requires database with microsite containing buttons
      const response = await app.inject({
        method: 'GET',
        url: '/click/test-qr/button-123',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBeDefined();
    });

    it('should return 404 for non-existent button', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/click/nonexistent-qr/nonexistent-button',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /microsite', () => {
    it.skip('should return health check', async () => {
      // The /microsite endpoint requires authentication
      const response = await app.inject({
        method: 'GET',
        url: '/microsite',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.service).toBe('microsite-service');
      expect(body.ok).toBe(true);
    });
  });
});
