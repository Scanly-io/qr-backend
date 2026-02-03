-- Migration: Enhanced Device & UTM Campaign Tracking
-- Adds UTM campaign parameters for marketing analytics

ALTER TABLE scans ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Add indexes for campaign analysis
CREATE INDEX IF NOT EXISTS idx_scans_utm_source ON scans(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_utm_campaign ON scans(utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_device_model ON scans(device_model) WHERE device_model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_os_version ON scans(os_version) WHERE os_version IS NOT NULL;
