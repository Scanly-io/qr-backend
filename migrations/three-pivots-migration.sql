-- Migration for Three Pivots Implementation
-- Run these in order after running drizzle-kit generate

-- =====================================================
-- PIVOT 1: White-Label Agency Platform
-- =====================================================

-- 1. Add organization tracking to users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS users_organization_idx ON users(organization_id);

-- 2. Create agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  website TEXT,
  white_label JSONB,
  plan VARCHAR(50) NOT NULL DEFAULT 'starter',
  seats INTEGER NOT NULL DEFAULT 5,
  seats_used INTEGER NOT NULL DEFAULT 0,
  mrr DECIMAL(10, 2),
  limits JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX agencies_slug_idx ON agencies(slug);
CREATE INDEX agencies_owner_idx ON agencies(owner_id);

-- 3. Create agency members table
CREATE TABLE IF NOT EXISTS agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  permissions JSONB,
  invited_at TIMESTAMP DEFAULT NOW(),
  joined_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE INDEX agency_members_agency_user_idx ON agency_members(agency_id, user_id);

-- =====================================================
-- PIVOT 2 & 3: Extended Microsites
-- =====================================================

-- 4. Add new columns to microsites table
ALTER TABLE microsites
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'link-in-bio',
  ADD COLUMN IF NOT EXISTS agency_id UUID,
  ADD COLUMN IF NOT EXISTS branding_config JSONB,
  ADD COLUMN IF NOT EXISTS ecommerce_config JSONB,
  ADD COLUMN IF NOT EXISTS sales_room_config JSONB,
  ADD COLUMN IF NOT EXISTS advanced_features JSONB,
  ADD COLUMN IF NOT EXISTS seo_config JSONB;

CREATE INDEX IF NOT EXISTS microsites_type_idx ON microsites(type);
CREATE INDEX IF NOT EXISTS microsites_agency_idx ON microsites(agency_id);

-- 5. Add UTM tracking to visits
ALTER TABLE microsite_visits
  ADD COLUMN IF NOT EXISTS utm_params JSONB,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(20);

CREATE INDEX IF NOT EXISTS visits_timestamp_idx ON microsite_visits(timestamp);

-- 6. Add UTM tracking to leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS utm_params JSONB;

CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);

-- 7. Create sales room templates table
CREATE TABLE IF NOT EXISTS sales_room_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50),
  thumbnail TEXT,
  layout JSONB,
  default_blocks JSONB,
  is_public BOOLEAN DEFAULT FALSE,
  agency_id UUID,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX sales_room_templates_category_idx ON sales_room_templates(category);
CREATE INDEX sales_room_templates_agency_idx ON sales_room_templates(agency_id);

-- 8. Create ecommerce templates table
CREATE TABLE IF NOT EXISTS ecommerce_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  niche VARCHAR(50),
  thumbnail TEXT,
  layout JSONB,
  default_blocks JSONB,
  aeo_config JSONB,
  suggested_price_range JSONB,
  is_public BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ecommerce_templates_niche_idx ON ecommerce_templates(niche);

-- =====================================================
-- PIVOT 3: AI Recommendations
-- =====================================================

-- 9. Create AI recommendations table
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  microsite_id UUID NOT NULL REFERENCES microsites(id),
  type VARCHAR(50) NOT NULL,
  recommendation JSONB,
  based_on_metrics JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ai_recommendations_microsite_status_idx ON ai_recommendations(microsite_id, status);

-- 10. Create video analytics table
CREATE TABLE IF NOT EXISTS video_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  microsite_id UUID NOT NULL REFERENCES microsites(id),
  video_id TEXT NOT NULL,
  provider VARCHAR(20),
  title TEXT,
  duration INTEGER,
  views INTEGER DEFAULT 0,
  completion_rate DECIMAL(5, 2),
  avg_watch_time INTEGER,
  conversions_after_watch INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX video_analytics_microsite_idx ON video_analytics(microsite_id);

-- =====================================================
-- Sample Data (Optional)
-- =====================================================

-- Insert default pricing plans (stored as reference)
-- Note: This is handled in the application code, not database

-- Insert starter templates for Digital Sales Rooms
INSERT INTO sales_room_templates (name, description, category, is_public, default_blocks) VALUES
  ('Enterprise Proposal', 'Professional proposal template for enterprise deals ($50k+)', 'proposal', true, 
   '[{"type": "hero", "props": {"heading": "Proposal for {{prospect_name}}"}, "order": 1}]'::jsonb),
  ('Interactive Pitch Deck', 'Engaging pitch deck with embedded videos', 'pitch-deck', true,
   '[{"type": "hero", "props": {"heading": "{{company_name}} Pitch"}, "order": 1}]'::jsonb),
  ('Contract Review Portal', 'Secure portal for contract review', 'contract', true,
   '[{"type": "header", "props": {"heading": "Service Agreement"}, "order": 1}]'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert starter templates for E-commerce
INSERT INTO ecommerce_templates (name, description, niche, is_public, aeo_config) VALUES
  ('Solar Panel Installation Funnel', 'Complete funnel for residential solar panel sales', 'solar', true,
   '{"structuredDataTemplate": {"@type": "Product", "name": "Solar Installation"}}'::jsonb),
  ('Custom Jewelry Showcase', 'Luxury single-product page for high-end custom jewelry', 'jewelry', true,
   '{"structuredDataTemplate": {"@type": "Product", "name": "Custom Jewelry"}}'::jsonb),
  ('Home Energy Audit Package', 'Complete home energy efficiency upgrade funnel', 'home-upgrade', true,
   '{"structuredDataTemplate": {"@type": "Service", "name": "Home Energy Audit"}}'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Verify agencies table
SELECT COUNT(*) as agency_count FROM agencies;

-- Verify microsites extended
SELECT COUNT(*) as microsites_with_type FROM microsites WHERE type IS NOT NULL;

-- Verify templates
SELECT COUNT(*) as sales_room_templates FROM sales_room_templates;
SELECT COUNT(*) as ecommerce_templates FROM ecommerce_templates;

-- Check indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('agencies', 'agency_members', 'microsites', 'ai_recommendations', 'video_analytics')
ORDER BY tablename, indexname;
