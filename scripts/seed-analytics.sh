#!/bin/bash

# Seed Analytics Data Script
# Quick way to generate test analytics data

echo "🌱 Seeding analytics data..."

# Connect to PostgreSQL and insert test data
docker exec qr_postgres psql -U postgres -d qr_analytics <<EOF

-- Insert test scan events from various countries
INSERT INTO scans (qr_id, event_type, timestamp, device_type, device_vendor, os, browser, country, city) VALUES
-- United States scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'mobile', 'Apple', 'iOS', 'Safari', 'United States', 'New York'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'desktop', 'Apple', 'macOS', 'Chrome', 'United States', 'Los Angeles'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '3 days', 'mobile', 'Samsung', 'Android', 'Chrome', 'United States', 'Chicago'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '4 days', 'tablet', 'Apple', 'iPadOS', 'Safari', 'United States', 'Houston'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '5 days', 'mobile', 'Google', 'Android', 'Chrome', 'United States', 'Phoenix'),

-- Canada scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'mobile', 'Apple', 'iOS', 'Safari', 'Canada', 'Toronto'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'desktop', NULL, 'Windows', 'Edge', 'Canada', 'Vancouver'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '3 days', 'mobile', 'Samsung', 'Android', 'Chrome', 'Canada', 'Montreal'),

-- United Kingdom scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'mobile', 'Apple', 'iOS', 'Safari', 'United Kingdom', 'London'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'desktop', NULL, 'Windows', 'Chrome', 'United Kingdom', 'Manchester'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '3 days', 'mobile', 'Samsung', 'Android', 'Chrome', 'United Kingdom', 'Birmingham'),

-- Germany scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'desktop', NULL, 'Windows', 'Firefox', 'Germany', 'Berlin'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'mobile', 'Apple', 'iOS', 'Safari', 'Germany', 'Munich'),

-- France scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'mobile', 'Samsung', 'Android', 'Chrome', 'France', 'Paris'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'desktop', 'Apple', 'macOS', 'Safari', 'France', 'Lyon'),

-- India scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'mobile', 'Xiaomi', 'Android', 'Chrome', 'India', 'Mumbai'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'mobile', 'Samsung', 'Android', 'Chrome', 'India', 'Delhi'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '3 days', 'mobile', 'OnePlus', 'Android', 'Chrome', 'India', 'Bangalore'),

-- Australia scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'mobile', 'Apple', 'iOS', 'Safari', 'Australia', 'Sydney'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'desktop', NULL, 'Windows', 'Chrome', 'Australia', 'Melbourne'),

-- Brazil scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'mobile', 'Samsung', 'Android', 'Chrome', 'Brazil', 'São Paulo'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'mobile', 'Motorola', 'Android', 'Chrome', 'Brazil', 'Rio de Janeiro'),

-- Japan scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'mobile', 'Sony', 'Android', 'Chrome', 'Japan', 'Tokyo'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'mobile', 'Apple', 'iOS', 'Safari', 'Japan', 'Osaka'),

-- China scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'mobile', 'Huawei', 'Android', 'Chrome', 'China', 'Shanghai'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'mobile', 'Xiaomi', 'Android', 'Chrome', 'China', 'Beijing'),

-- South Africa scans
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '1 day', 'mobile', 'Samsung', 'Android', 'Chrome', 'South Africa', 'Cape Town'),
('qr-demo123', 'qr.scanned', NOW() - INTERVAL '2 days', 'desktop', NULL, 'Windows', 'Edge', 'South Africa', 'Johannesburg');

EOF

echo "✅ Analytics data seeded successfully!"
echo "📊 Inserted 28 scan events across 10+ countries"
echo "🌍 You can now view the world map in the analytics dashboard!"
