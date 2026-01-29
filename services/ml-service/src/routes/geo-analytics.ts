import { FastifyInstance } from 'fastify';

// Geographic data storage
interface GeoAnalytics {
  id: string;
  micrositeId: string;
  timestamp: Date;
  location: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  device: {
    type: 'mobile' | 'desktop' | 'tablet';
    os: string;
    browser: string;
  };
  referrer?: string;
  sessionId: string;
}

interface HeatmapData {
  micrositeId: string;
  locations: Array<{
    latitude: number;
    longitude: number;
    count: number;
    percentage: number;
  }>;
  topCountries: Array<{
    country: string;
    countryCode: string;
    count: number;
    percentage: number;
  }>;
  topCities: Array<{
    city: string;
    country: string;
    count: number;
    percentage: number;
  }>;
  totalScans: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

// In-memory storage
const geoData = new Map<string, GeoAnalytics>();

// Helper to detect location from IP (simplified)
async function detectLocation(ip: string): Promise<GeoAnalytics['location'] | null> {
  // In production, use a service like MaxMind GeoIP2, IPGeolocation, or ipapi
  // For now, return mock data
  const mockLocations = [
    {
      country: 'United States',
      countryCode: 'US',
      region: 'California',
      city: 'San Francisco',
      latitude: 37.7749,
      longitude: -122.4194,
      timezone: 'America/Los_Angeles',
    },
    {
      country: 'United Kingdom',
      countryCode: 'GB',
      region: 'England',
      city: 'London',
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 'Europe/London',
    },
    {
      country: 'Japan',
      countryCode: 'JP',
      region: 'Tokyo',
      city: 'Tokyo',
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo',
    },
    {
      country: 'Germany',
      countryCode: 'DE',
      region: 'Berlin',
      city: 'Berlin',
      latitude: 52.52,
      longitude: 13.405,
      timezone: 'Europe/Berlin',
    },
    {
      country: 'Australia',
      countryCode: 'AU',
      region: 'New South Wales',
      city: 'Sydney',
      latitude: -33.8688,
      longitude: 151.2093,
      timezone: 'Australia/Sydney',
    },
  ];

  // Return random location for demo
  return mockLocations[Math.floor(Math.random() * mockLocations.length)];
}

export default async function geoAnalyticsRoutes(fastify: FastifyInstance) {
  
  // 1. Track geographic scan/visit
  fastify.post<{
    Body: {
      micrositeId: string;
      sessionId: string;
      ip?: string;
      userAgent?: string;
      referrer?: string;
    };
  }>('/geo-analytics/track', async (request, reply) => {
    const { micrositeId, sessionId, ip, userAgent, referrer } = request.body;

    // Detect location from IP
    const location = await detectLocation(ip || request.ip);
    if (!location) {
      return reply.status(400).send({
        error: 'Unable to detect location',
      });
    }

    // Parse user agent for device info
    const ua = userAgent || request.headers['user-agent'] || '';
    const device = parseUserAgent(ua);

    const geoAnalytic: GeoAnalytics = {
      id: `geo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      micrositeId,
      timestamp: new Date(),
      location,
      device,
      referrer,
      sessionId,
    };

    geoData.set(geoAnalytic.id, geoAnalytic);

    return {
      tracked: true,
      location: {
        country: location.country,
        city: location.city,
      },
      device: device.type,
      message: 'Geographic data tracked successfully',
    };
  });

  // 2. Get heatmap data
  fastify.get<{
    Params: { micrositeId: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      minScans?: string;
    };
  }>('/geo-analytics/heatmap/:micrositeId', async (request, reply) => {
    const { micrositeId } = request.params;
    const { startDate, endDate, minScans = '1' } = request.query;

    let micrositeData = Array.from(geoData.values()).filter((d) => d.micrositeId === micrositeId);

    // Apply date filters
    if (startDate) {
      const start = new Date(startDate);
      micrositeData = micrositeData.filter((d) => d.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      micrositeData = micrositeData.filter((d) => d.timestamp <= end);
    }

    if (micrositeData.length === 0) {
      return {
        micrositeId,
        locations: [],
        topCountries: [],
        topCities: [],
        totalScans: 0,
        message: 'No geographic data found',
      };
    }

    // Group by coordinates for heatmap
    const locationMap = new Map<string, number>();
    micrositeData.forEach((d) => {
      const key = `${d.location.latitude.toFixed(2)},${d.location.longitude.toFixed(2)}`;
      locationMap.set(key, (locationMap.get(key) || 0) + 1);
    });

    const locations = Array.from(locationMap.entries())
      .map(([coords, count]) => {
        const [lat, lng] = coords.split(',').map(Number);
        return {
          latitude: lat,
          longitude: lng,
          count,
          percentage: (count / micrositeData.length) * 100,
        };
      })
      .filter((loc) => loc.count >= parseInt(minScans))
      .sort((a, b) => b.count - a.count);

    // Top countries
    const countryMap = new Map<string, { code: string; count: number }>();
    micrositeData.forEach((d) => {
      const existing = countryMap.get(d.location.country);
      countryMap.set(d.location.country, {
        code: d.location.countryCode,
        count: (existing?.count || 0) + 1,
      });
    });

    const topCountries = Array.from(countryMap.entries())
      .map(([country, data]) => ({
        country,
        countryCode: data.code,
        count: data.count,
        percentage: (data.count / micrositeData.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top cities
    const cityMap = new Map<string, { country: string; count: number }>();
    micrositeData.forEach((d) => {
      const key = `${d.location.city}, ${d.location.country}`;
      const existing = cityMap.get(key);
      cityMap.set(key, {
        country: d.location.country,
        count: (existing?.count || 0) + 1,
      });
    });

    const topCities = Array.from(cityMap.entries())
      .map(([cityKey, data]) => ({
        city: cityKey.split(', ')[0],
        country: data.country,
        count: data.count,
        percentage: (data.count / micrositeData.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const heatmapData: HeatmapData = {
      micrositeId,
      locations,
      topCountries,
      topCities,
      totalScans: micrositeData.length,
      dateRange: {
        start: new Date(Math.min(...micrositeData.map((d) => d.timestamp.getTime()))),
        end: new Date(Math.max(...micrositeData.map((d) => d.timestamp.getTime()))),
      },
    };

    return heatmapData;
  });

  // 3. Get location analytics by time period
  fastify.get<{
    Params: { micrositeId: string };
    Querystring: {
      period?: 'hour' | 'day' | 'week' | 'month';
      timezone?: string;
    };
  }>('/geo-analytics/timeline/:micrositeId', async (request, reply) => {
    const { micrositeId } = request.params;
    const { period = 'day', timezone = 'UTC' } = request.query;

    const micrositeData = Array.from(geoData.values()).filter((d) => d.micrositeId === micrositeId);

    if (micrositeData.length === 0) {
      return {
        micrositeId,
        period,
        timeline: [],
        totalScans: 0,
      };
    }

    // Group by time period
    const timeMap = new Map<string, number>();
    micrositeData.forEach((d) => {
      const date = new Date(d.timestamp);
      let key: string;

      if (period === 'hour') {
        key = `${date.toISOString().substring(0, 13)}:00`;
      } else if (period === 'day') {
        key = date.toISOString().substring(0, 10);
      } else if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().substring(0, 10);
      } else {
        key = date.toISOString().substring(0, 7);
      }

      timeMap.set(key, (timeMap.get(key) || 0) + 1);
    });

    const timeline = Array.from(timeMap.entries())
      .map(([time, count]) => ({
        time,
        count,
        percentage: (count / micrositeData.length) * 100,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return {
      micrositeId,
      period,
      timezone,
      timeline,
      totalScans: micrositeData.length,
      peakTime: timeline.reduce((max, curr) => (curr.count > max.count ? curr : max), timeline[0]),
    };
  });

  // 4. Get device distribution by location
  fastify.get<{
    Params: { micrositeId: string };
    Querystring: {
      country?: string;
      city?: string;
    };
  }>('/geo-analytics/devices/:micrositeId', async (request, reply) => {
    const { micrositeId } = request.params;
    const { country, city } = request.query;

    let micrositeData = Array.from(geoData.values()).filter((d) => d.micrositeId === micrositeId);

    // Apply location filters
    if (country) {
      micrositeData = micrositeData.filter((d) => d.location.country.toLowerCase() === country.toLowerCase());
    }
    if (city) {
      micrositeData = micrositeData.filter((d) => d.location.city.toLowerCase() === city.toLowerCase());
    }

    const deviceMap = new Map<string, number>();
    const osMap = new Map<string, number>();
    const browserMap = new Map<string, number>();

    micrositeData.forEach((d) => {
      deviceMap.set(d.device.type, (deviceMap.get(d.device.type) || 0) + 1);
      osMap.set(d.device.os, (osMap.get(d.device.os) || 0) + 1);
      browserMap.set(d.device.browser, (browserMap.get(d.device.browser) || 0) + 1);
    });

    return {
      micrositeId,
      filters: { country, city },
      totalScans: micrositeData.length,
      devices: Array.from(deviceMap.entries()).map(([type, count]) => ({
        type,
        count,
        percentage: (count / micrositeData.length) * 100,
      })),
      operatingSystems: Array.from(osMap.entries()).map(([os, count]) => ({
        os,
        count,
        percentage: (count / micrositeData.length) * 100,
      })),
      browsers: Array.from(browserMap.entries()).map(([browser, count]) => ({
        browser,
        count,
        percentage: (count / micrositeData.length) * 100,
      })),
    };
  });

  // 5. Get peak scanning times by timezone
  fastify.get<{
    Params: { micrositeId: string };
  }>('/geo-analytics/peak-times/:micrositeId', async (request, reply) => {
    const { micrositeId } = request.params;
    const micrositeData = Array.from(geoData.values()).filter((d) => d.micrositeId === micrositeId);

    if (micrositeData.length === 0) {
      return {
        micrositeId,
        hourlyDistribution: [],
        peakHour: null,
        totalScans: 0,
      };
    }

    // Group by hour (0-23)
    const hourMap = new Map<number, number>();
    micrositeData.forEach((d) => {
      const hour = d.timestamp.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourMap.get(hour) || 0,
      percentage: ((hourMap.get(hour) || 0) / micrositeData.length) * 100,
    }));

    const peakHour = hourlyDistribution.reduce((max, curr) => (curr.count > max.count ? curr : max));

    // Group by day of week
    const dayMap = new Map<number, number>();
    micrositeData.forEach((d) => {
      const day = d.timestamp.getDay();
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });

    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyDistribution = weekDays.map((name, day) => ({
      day: name,
      count: dayMap.get(day) || 0,
      percentage: ((dayMap.get(day) || 0) / micrositeData.length) * 100,
    }));

    return {
      micrositeId,
      totalScans: micrositeData.length,
      hourlyDistribution,
      peakHour: {
        hour: peakHour.hour,
        time: `${peakHour.hour.toString().padStart(2, '0')}:00`,
        count: peakHour.count,
        percentage: peakHour.percentage,
      },
      dailyDistribution,
      peakDay: dailyDistribution.reduce((max, curr) => (curr.count > max.count ? curr : max)),
    };
  });

  // 6. Export geographic data
  fastify.get<{
    Params: { micrositeId: string };
    Querystring: {
      format?: 'json' | 'csv';
      startDate?: string;
      endDate?: string;
    };
  }>('/geo-analytics/export/:micrositeId', async (request, reply) => {
    const { micrositeId } = request.params;
    const { format = 'json', startDate, endDate } = request.query;

    let micrositeData = Array.from(geoData.values()).filter((d) => d.micrositeId === micrositeId);

    // Apply date filters
    if (startDate) {
      const start = new Date(startDate);
      micrositeData = micrositeData.filter((d) => d.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      micrositeData = micrositeData.filter((d) => d.timestamp <= end);
    }

    if (format === 'csv') {
      const csv = [
        'Timestamp,Country,City,Latitude,Longitude,Device Type,OS,Browser,Referrer',
        ...micrositeData.map(
          (d) =>
            `${d.timestamp.toISOString()},${d.location.country},"${d.location.city}",${d.location.latitude},${d.location.longitude},${d.device.type},${d.device.os},${d.device.browser},"${d.referrer || ''}"`
        ),
      ].join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="geo-analytics-${micrositeId}.csv"`);
      return csv;
    }

    return {
      micrositeId,
      exportDate: new Date(),
      totalRecords: micrositeData.length,
      data: micrositeData,
    };
  });
}

// Helper to parse user agent
function parseUserAgent(ua: string): GeoAnalytics['device'] {
  const uaLower = ua.toLowerCase();

  let type: 'mobile' | 'desktop' | 'tablet' = 'desktop';
  if (/mobile|android|iphone|ipod/i.test(ua)) {
    type = 'mobile';
  } else if (/tablet|ipad/i.test(ua)) {
    type = 'tablet';
  }

  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

  let browser = 'Unknown';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/edge/i.test(ua)) browser = 'Edge';

  return { type, os, browser };
}
