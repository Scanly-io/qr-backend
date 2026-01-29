/**
 * ANALYTICS TEST DATA GENERATOR
 * ==============================
 * 
 * Purpose: Generate realistic test analytics data to visualize dashboards
 * 
 * Usage:
 *   node dist/scripts/seedAnalytics.js
 * 
 * Data Generated:
 * - QR scans from multiple countries
 * - Various devices (mobile, desktop, tablet)
 * - Different browsers and OS
 * - Time-based patterns (hourly, daily)
 */

import { db } from '../db.js';
import { events } from '../schema.js';

const countries = [
  { country: 'United States', city: 'New York' },
  { country: 'United States', city: 'Los Angeles' },
  { country: 'United States', city: 'Chicago' },
  { country: 'Canada', city: 'Toronto' },
  { country: 'Canada', city: 'Vancouver' },
  { country: 'United Kingdom', city: 'London' },
  { country: 'United Kingdom', city: 'Manchester' },
  { country: 'Germany', city: 'Berlin' },
  { country: 'Germany', city: 'Munich' },
  { country: 'France', city: 'Paris' },
  { country: 'India', city: 'Mumbai' },
  { country: 'India', city: 'Delhi' },
  { country: 'Australia', city: 'Sydney' },
  { country: 'Brazil', city: 'São Paulo' },
  { country: 'Japan', city: 'Tokyo' },
  { country: 'China', city: 'Shanghai' },
  { country: 'South Africa', city: 'Cape Town' },
];

const devices = [
  { deviceType: 'mobile', deviceVendor: 'Apple', deviceModel: 'iPhone', os: 'iOS', osVersion: '17.2', browser: 'Safari', browserVersion: '17.2' },
  { deviceType: 'mobile', deviceVendor: 'Samsung', deviceModel: 'Galaxy S24', os: 'Android', osVersion: '14', browser: 'Chrome', browserVersion: '120.0' },
  { deviceType: 'mobile', deviceVendor: 'Google', deviceModel: 'Pixel 9', os: 'Android', osVersion: '14', browser: 'Chrome', browserVersion: '121.0' },
  { deviceType: 'desktop', deviceVendor: 'Apple', deviceModel: 'MacBook Pro', os: 'macOS', osVersion: '15.1', browser: 'Safari', browserVersion: '18.0' },
  { deviceType: 'desktop', deviceVendor: null, deviceModel: null, os: 'Windows', osVersion: '11', browser: 'Chrome', browserVersion: '120.0' },
  { deviceType: 'desktop', deviceVendor: null, deviceModel: null, os: 'Windows', osVersion: '11', browser: 'Edge', browserVersion: '120.0' },
  { deviceType: 'tablet', deviceVendor: 'Apple', deviceModel: 'iPad', os: 'iPadOS', osVersion: '17.2', browser: 'Safari', browserVersion: '17.2' },
  { deviceType: 'tablet', deviceVendor: 'Samsung', deviceModel: 'Galaxy Tab', os: 'Android', osVersion: '13', browser: 'Chrome', browserVersion: '119.0' },
];

const eventTypes = ['qr.scanned', 'microsite.viewed', 'button.clicked'];
const qrIds = ['qr-demo123', 'qr-d83ac423', 'qr-test456'];

async function seedAnalytics() {
  console.log('🌱 Seeding analytics data...');

  const eventsToInsert = [];
  const now = new Date();

  // Generate events for the last 30 days
  for (let day = 0; day < 30; day++) {
    // Random number of events per day (10-100)
    const eventsPerDay = Math.floor(Math.random() * 90) + 10;

    for (let i = 0; i < eventsPerDay; i++) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - day);
      timestamp.setHours(Math.floor(Math.random() * 24));
      timestamp.setMinutes(Math.floor(Math.random() * 60));

      const location = countries[Math.floor(Math.random() * countries.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      const qrId = qrIds[Math.floor(Math.random() * qrIds.length)];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

      eventsToInsert.push({
        qrId,
        eventType,
        timestamp,
        deviceType: device.deviceType,
        deviceVendor: device.deviceVendor,
        deviceModel: device.deviceModel,
        os: device.os,
        osVersion: device.osVersion,
        browser: device.browser,
        browserVersion: device.browserVersion,
        country: location.country,
        city: location.city,
        referrer: Math.random() > 0.5 ? 'https://google.com' : 'https://facebook.com',
        sessionId: `session-${Math.random().toString(36).substring(7)}`,
        rawPayload: {
          source: 'test',
          generated: true
        }
      });
    }
  }

  console.log(`📊 Inserting ${eventsToInsert.length} events...`);

  // Insert in batches of 100
  for (let i = 0; i < eventsToInsert.length; i += 100) {
    const batch = eventsToInsert.slice(i, i + 100);
    await db.insert(events).values(batch);
    console.log(`   Inserted ${Math.min(i + 100, eventsToInsert.length)}/${eventsToInsert.length}`);
  }

  console.log('✅ Analytics data seeded successfully!');
  console.log('\nData Summary:');
  console.log(`- Total events: ${eventsToInsert.length}`);
  console.log(`- QR IDs: ${qrIds.join(', ')}`);
  console.log(`- Countries: ${countries.length}`);
  console.log(`- Date range: Last 30 days`);
  console.log('\n🚀 You can now view the analytics dashboard!');

  process.exit(0);
}

seedAnalytics().catch((error) => {
  console.error('❌ Error seeding analytics:', error);
  process.exit(1);
});
