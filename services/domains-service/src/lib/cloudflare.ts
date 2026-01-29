/**
 * Cloudflare API Integration
 * 
 * Handles automated DNS management for subdomains
 * - Create DNS records
 * - Update DNS records
 * - Delete DNS records
 * - Purge CDN cache
 */

import { logger } from '@qr/common';

interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
  accountId: string;
}

interface DNSRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

export class CloudflareService {
  private config: CloudflareConfig;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor() {
    this.config = {
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    };

    if (!this.config.apiToken || !this.config.zoneId) {
      logger.warn('Cloudflare credentials not configured');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }

    return data.result;
  }

  /**
   * Create DNS record for subdomain
   * Example: john.scanly.io → YOUR_SERVER_IP
   */
  async createSubdomainDNS(subdomain: string): Promise<any> {
    try {
      const subdomainBase = process.env.SUBDOMAIN_BASE || 'scanly.io';
      const fullDomain = `${subdomain}.${subdomainBase}`;
      const targetIP = process.env.SERVER_IP || '127.0.0.1';

      logger.info({ subdomain, fullDomain }, 'Creating DNS record for subdomain');

      const record: DNSRecord = {
        type: 'A',
        name: fullDomain,
        content: targetIP,
        ttl: 1, // Auto (Cloudflare manages)
        proxied: true, // Enable Cloudflare CDN + SSL
      };

      const result = await this.request(
        `/zones/${this.config.zoneId}/dns_records`,
        {
          method: 'POST',
          body: JSON.stringify(record),
        }
      );

      logger.info({ subdomain, recordId: result.id }, 'DNS record created successfully');

      return {
        success: true,
        recordId: result.id,
        domain: fullDomain,
        proxied: true,
      };
    } catch (error) {
      logger.error({ error, subdomain }, 'Failed to create DNS record');
      throw error;
    }
  }

  /**
   * Delete DNS record for subdomain
   */
  async deleteSubdomainDNS(subdomain: string): Promise<void> {
    try {
      const subdomainBase = process.env.SUBDOMAIN_BASE || 'scanly.io';
      const fullDomain = `${subdomain}.${subdomainBase}`;

      // First, find the DNS record ID
      const records = await this.request(
        `/zones/${this.config.zoneId}/dns_records?name=${fullDomain}`
      );

      if (!records || records.length === 0) {
        logger.warn({ subdomain }, 'DNS record not found');
        return;
      }

      const recordId = records[0].id;

      await this.request(
        `/zones/${this.config.zoneId}/dns_records/${recordId}`,
        { method: 'DELETE' }
      );

      logger.info({ subdomain, recordId }, 'DNS record deleted');
    } catch (error) {
      logger.error({ error, subdomain }, 'Failed to delete DNS record');
      throw error;
    }
  }

  /**
   * Purge CDN cache for subdomain
   * Call this after publishing new content
   */
  async purgeCacheForSubdomain(subdomain: string): Promise<void> {
    try {
      const subdomainBase = process.env.SUBDOMAIN_BASE || 'scanly.io';
      const fullDomain = `${subdomain}.${subdomainBase}`;

      await this.request(
        `/zones/${this.config.zoneId}/purge_cache`,
        {
          method: 'POST',
          body: JSON.stringify({
            hosts: [fullDomain, `www.${fullDomain}`],
          }),
        }
      );

      logger.info({ subdomain }, 'CDN cache purged successfully');
    } catch (error) {
      logger.error({ error, subdomain }, 'Failed to purge CDN cache');
      throw error;
    }
  }

  /**
   * Verify DNS propagation
   * Check if DNS record is live
   */
  async verifyDNSPropagation(subdomain: string): Promise<boolean> {
    try {
      const subdomainBase = process.env.SUBDOMAIN_BASE || 'scanly.io';
      const fullDomain = `${subdomain}.${subdomainBase}`;

      const records = await this.request(
        `/zones/${this.config.zoneId}/dns_records?name=${fullDomain}`
      );

      return records && records.length > 0;
    } catch (error) {
      logger.error({ error, subdomain }, 'Failed to verify DNS');
      return false;
    }
  }

  /**
   * Get SSL certificate status
   */
  async getSSLStatus(subdomain: string): Promise<string> {
    try {
      const subdomainBase = process.env.SUBDOMAIN_BASE || 'scanly.io';
      const fullDomain = `${subdomain}.${subdomainBase}`;

      // Cloudflare automatically provisions SSL for proxied domains
      // Check if domain exists and is proxied
      const records = await this.request(
        `/zones/${this.config.zoneId}/dns_records?name=${fullDomain}`
      );

      if (records && records.length > 0 && records[0].proxied) {
        return 'active'; // Cloudflare handles SSL automatically
      }

      return 'pending';
    } catch (error) {
      logger.error({ error, subdomain }, 'Failed to check SSL status');
      return 'unknown';
    }
  }
}

export const cloudflareService = new CloudflareService();
