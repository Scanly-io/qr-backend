/**
 * Analytics Service - Routes Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../index';
import type { FastifyInstance } from 'fastify';

describe('Analytics Service', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /analytics/:qrId/summary', () => {
    it('should return summary with zero counts for non-existent QR', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/nonexistent-qr/summary',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalevents).toBe(0);
      expect(body.todayevents).toBe(0);
      expect(body.last7Daysevents).toBe(0);
    });
  });

  describe('GET /analytics/:qrId/funnel', () => {
    it('should return funnel metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/test-qr/funnel',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('views');
      expect(body).toHaveProperty('clicks');
      expect(body).toHaveProperty('leads');
      expect(body).toHaveProperty('clickThroughRate');
      expect(body).toHaveProperty('leadConversionRate');
    });
  });

  describe('GET /analytics/:qrId/devices', () => {
    it.skip('should return device analytics', async () => {
      // Requires database with events table
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/test-qr/devices',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('byDeviceType');
      expect(body).toHaveProperty('byOS');
      expect(body).toHaveProperty('byBrowser');
      expect(Array.isArray(body.byDeviceType)).toBe(true);
    });
  });

  describe('GET /analytics/:qrId/patterns', () => {
    it('should return usage patterns', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/test-qr/patterns',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('byHourOfDay');
      expect(body).toHaveProperty('byDayOfWeek');
      expect(Array.isArray(body.byHourOfDay)).toBe(true);
      expect(Array.isArray(body.byDayOfWeek)).toBe(true);
    });
  });

  describe('GET /analytics/:qrId/raw', () => {
    it.skip('should return paginated raw data', async () => {
      // Requires database with events table
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/test-qr/raw?page=1&pageSize=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('records');
      expect(body).toHaveProperty('pagination');
      expect(body.pagination).toHaveProperty('page');
      expect(body.pagination).toHaveProperty('pageSize');
      expect(body.pagination).toHaveProperty('total');
    });

    it('should validate query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/test-qr/raw?startDate=invalid-date',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /analytics', () => {
    it('should return health check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.service).toBe('analytics-service');
      expect(body.ok).toBe(true);
    });
  });
});
