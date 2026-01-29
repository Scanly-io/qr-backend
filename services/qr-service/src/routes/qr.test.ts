/**
 * QR Service - QR Generation Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../index';
import { generateTestToken } from '../../../../test/helpers/testserver';
import type { FastifyInstance } from 'fastify';

describe('QR Service - Generate', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    authToken = generateTestToken('test-user-123');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /generate', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: {
          targetUrl: 'https://example.com',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when targetUrl is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it.skip('should create QR code with valid auth and targetUrl', async () => {
      // Requires database connection
      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          targetUrl: 'https://example.com',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.qrId).toBeDefined();
      expect(body.targetUrl).toBe('https://example.com');
    });

    it.skip('should accept custom qrId if provided', async () => {
      const customQrId = 'custom-qr-123';
      
      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          qrId: customQrId,
          targetUrl: 'https://example.com',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.qrId).toBe(customQrId);
    });

    it.skip('should return 409 if qrId already exists', async () => {
      const duplicateQrId = 'duplicate-qr-123';
      
      // Create first QR
      await app.inject({
        method: 'POST',
        url: '/generate',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          qrId: duplicateQrId,
          targetUrl: 'https://example.com',
        },
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          qrId: duplicateQrId,
          targetUrl: 'https://another.com',
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('GET /qr/:qrId/image', () => {
    it.skip('should return 404 for non-existent QR', async () => {
      // Requires database connection
      const response = await app.inject({
        method: 'GET',
        url: '/qr/nonexistent-qr/image',
      });

      expect(response.statusCode).toBe(404);
    });

    it.skip('should return QR image for existing QR', async () => {
      // Requires database with test QR code
      const response = await app.inject({
        method: 'GET',
        url: '/qr/test-qr-123/image',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('image/png');
    });
  });

  describe('GET /qr', () => {
    it('should return health check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/qr',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.service).toBe('qr-service');
      expect(body.ok).toBe(true);
    });
  });
});
