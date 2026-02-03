# 📊 Mixpanel Events Tracking Plan

**Platform:** QR Code & Microsite Platform  
**Last Updated:** January 29, 2026

## Table of Contents
1. [User Lifecycle Events](#user-lifecycle-events)
2. [QR Code Events](#qr-code-events)
3. [Microsite Events](#microsite-events)
4. [Domain Events](#domain-events)
5. [Content & Block Events](#content--block-events)
6. [Monetization Events](#monetization-events)
7. [Engagement Events](#engagement-events)
8. [Integration Events](#integration-events)
9. [Analytics & Insights Events](#analytics--insights-events)
10. [A/B Testing Events](#ab-testing-events)
11. [User Properties](#user-properties)
12. [Conversion Funnels](#conversion-funnels)
13. [Implementation Examples](#implementation-examples)

---

## User Lifecycle Events

### 1. **signup_started**
**When:** User clicks "Sign Up" button or enters email on signup form

**Properties:**
```typescript
{
  source: 'homepage' | 'pricing_page' | 'qr_scan' | 'referral',
  utm_source?: string,
  utm_medium?: string,
  utm_campaign?: string,
  device_type: 'mobile' | 'tablet' | 'desktop',
  browser: string,
  country: string,
  referrer_url?: string
}
```

**Why Track:** Understand which channels drive signups, optimize conversion funnel

---

### 2. **signup_completed**
**When:** User successfully creates account

**Properties:**
```typescript
{
  user_id: string,
  email: string,
  signup_method: 'email' | 'google' | 'github' | 'microsoft',
  plan: 'free' | 'pro' | 'business' | 'enterprise',
  industry?: string,
  company_size?: string,
  use_case?: string,
  time_to_complete: number, // seconds from signup_started
  source: string,
  utm_source?: string,
  utm_campaign?: string
}
```

**Why Track:** Measure signup completion rate, identify preferred signup methods

---

### 3. **email_verified**
**When:** User verifies email address

**Properties:**
```typescript
{
  user_id: string,
  time_to_verify: number, // seconds from signup_completed
  verification_method: 'link' | 'code'
}
```

**Why Track:** Email verification rate, time to activation

---

### 4. **onboarding_completed**
**When:** User completes onboarding tutorial/setup

**Properties:**
```typescript
{
  user_id: string,
  steps_completed: number,
  steps_total: number,
  time_to_complete: number, // seconds
  skipped_steps: string[],
  completed_first_qr: boolean,
  completed_first_publish: boolean
}
```

**Why Track:** Onboarding completion rate, identify friction points

---

### 5. **login**
**When:** User logs in

**Properties:**
```typescript
{
  user_id: string,
  login_method: 'email' | 'google' | 'github' | 'microsoft',
  session_id: string,
  device_type: 'mobile' | 'tablet' | 'desktop',
  browser: string,
  country: string,
  days_since_signup: number,
  is_first_login: boolean
}
```

**Why Track:** User retention, engagement frequency, device preferences

---

### 6. **logout**
**When:** User logs out

**Properties:**
```typescript
{
  user_id: string,
  session_duration: number, // seconds
  pages_viewed: number,
  actions_performed: number
}
```

**Why Track:** Session duration, user activity patterns

---

## QR Code Events

### 7. **qr_created**
**When:** User creates a new QR code

**Properties:**
```typescript
{
  user_id: string,
  qr_id: string,
  qr_type: 'url' | 'vcard' | 'wifi' | 'event' | 'microsite' | 'linktree' | 'restaurant_menu' | 'product',
  has_custom_logo: boolean,
  has_custom_colors: boolean,
  error_correction_level: 'L' | 'M' | 'Q' | 'H',
  size: number,
  is_dynamic: boolean,
  is_first_qr: boolean,
  total_qrs_created: number,
  creation_source: 'dashboard' | 'quick_create' | 'template' | 'duplicate'
}
```

**Why Track:** Most popular QR types, feature usage, user progression

---

### 8. **qr_customized**
**When:** User applies customization to QR code

**Properties:**
```typescript
{
  user_id: string,
  qr_id: string,
  customization_type: 'logo' | 'color' | 'pattern' | 'shape' | 'frame',
  logo_source: 'upload' | 'brand_library' | 'icon_library',
  color_scheme: 'monochrome' | 'gradient' | 'custom',
  has_background_image: boolean
}
```

**Why Track:** Customization adoption rate, preferred styles

---

### 9. **qr_downloaded**
**When:** User downloads QR code image

**Properties:**
```typescript
{
  user_id: string,
  qr_id: string,
  format: 'png' | 'svg' | 'pdf' | 'eps',
  size: number, // pixels
  dpi: number,
  download_count: number // total downloads for this QR
}
```

**Why Track:** Download frequency, preferred formats, QR lifecycle

---

### 10. **qr_scanned**
**When:** End user scans QR code (most important event!)

**Properties:**
```typescript
{
  qr_id: string,
  qr_owner_id: string,
  scan_id: string,
  
  // Device & Browser
  device_type: 'mobile' | 'tablet' | 'desktop',
  device_os: string, // 'iOS 17.2', 'Android 14', etc.
  device_brand: string, // 'Apple', 'Samsung', etc.
  browser: string,
  browser_version: string,
  
  // Location
  country: string,
  region: string,
  city: string,
  latitude?: number,
  longitude?: number,
  timezone: string,
  
  // Context
  scan_time: string, // ISO 8601
  hour_of_day: number, // 0-23
  day_of_week: string, // 'Monday', etc.
  is_weekend: boolean,
  
  // Attribution
  referrer?: string,
  utm_source?: string,
  utm_medium?: string,
  utm_campaign?: string,
  
  // Domain
  domain_type: 'subdomain' | 'custom' | 'platform',
  domain: string, // 'nike.scanly.io' or 'scan.yourbrand.com'
  path: string,
  
  // User Context
  is_first_scan_ever: boolean, // first scan of this QR
  is_first_scan_today: boolean,
  is_returning_scanner: boolean,
  previous_scan_count: number,
  days_since_qr_created: number,
  
  // Performance
  page_load_time?: number, // milliseconds
  time_to_interactive?: number
}
```

**Why Track:** Core business metric, user behavior, geographic insights, device trends

---

### 11. **qr_scan_failed**
**When:** QR scan fails (broken link, expired content, error)

**Properties:**
```typescript
{
  qr_id: string,
  qr_owner_id: string,
  error_type: '404' | '500' | 'expired' | 'inactive' | 'deleted',
  error_message: string,
  device_type: string,
  country: string
}
```

**Why Track:** Quality monitoring, user experience issues

---

### 12. **qr_deleted**
**When:** User deletes a QR code

**Properties:**
```typescript
{
  user_id: string,
  qr_id: string,
  qr_type: string,
  total_scans: number,
  days_active: number,
  reason?: 'expired' | 'duplicate' | 'mistake' | 'other'
}
```

**Why Track:** Churn indicators, QR lifecycle patterns

---

## Microsite Events

### 13. **microsite_created**
**When:** User creates a new microsite

**Properties:**
```typescript
{
  user_id: string,
  microsite_id: string,
  qr_id?: string,
  template_used?: string,
  industry?: string,
  is_first_microsite: boolean,
  creation_method: 'blank' | 'template' | 'ai_generated'
}
```

**Why Track:** Template popularity, creation patterns

---

### 14. **microsite_block_added**
**When:** User adds a content block to microsite

**Properties:**
```typescript
{
  user_id: string,
  microsite_id: string,
  block_type: 'header' | 'text' | 'image' | 'video' | 'button' | 'link' | 
               'social' | 'contact' | 'map' | 'gallery' | 'testimonial' | 
               'pricing' | 'faq' | 'form' | 'payment' | 'product' | 'menu' | 
               'schedule' | 'hero' | 'features' | 'deals' | 'real-estate' | 'artist',
  total_blocks: number,
  block_position: number,
  added_via: 'library' | 'drag_drop' | 'quick_add' | 'ai_suggestion'
}
```

**Why Track:** Most popular blocks, content patterns, feature adoption

---

### 15. **microsite_published**
**When:** User publishes microsite (makes it live)

**Properties:**
```typescript
{
  user_id: string,
  microsite_id: string,
  qr_id?: string,
  total_blocks: number,
  block_types: string[], // array of block types used
  has_custom_domain: boolean,
  has_subdomain: boolean,
  domain?: string,
  theme_name?: string,
  publish_duration: number, // seconds from creation to publish
  is_first_publish: boolean
}
```

**Why Track:** Time to publish, content complexity, domain adoption

---

### 16. **microsite_viewed**
**When:** End user views published microsite

**Properties:**
```typescript
{
  microsite_id: string,
  qr_id?: string,
  owner_id: string,
  
  // Same device/location properties as qr_scanned
  device_type: string,
  device_os: string,
  browser: string,
  country: string,
  city: string,
  
  // Context
  domain_type: 'subdomain' | 'custom' | 'platform',
  domain: string,
  path: string,
  referrer?: string,
  utm_source?: string,
  
  // Engagement
  time_on_page?: number, // seconds (tracked client-side)
  scroll_depth?: number, // percentage 0-100
  blocks_viewed: string[], // block IDs that entered viewport
  
  // Performance
  page_load_time: number,
  time_to_interactive: number,
  
  // User
  is_first_view: boolean,
  is_returning_visitor: boolean,
  previous_view_count: number
}
```

**Why Track:** Content performance, engagement metrics, optimization opportunities

---

### 17. **microsite_link_clicked**
**When:** User clicks a link in microsite

**Properties:**
```typescript
{
  microsite_id: string,
  owner_id: string,
  link_type: 'social' | 'external' | 'cta' | 'button' | 'product' | 'contact',
  link_url: string,
  link_text: string,
  block_id: string,
  block_type: string,
  position_on_page: number, // 0-100% scroll position
  time_on_page: number, // seconds before click
  device_type: string,
  country: string
}
```

**Why Track:** Click-through rates, content effectiveness, conversion paths

---

## Domain Events

### 18. **subdomain_claimed**
**When:** User claims a free subdomain (Linktree-style)

**Properties:**
```typescript
{
  user_id: string,
  subdomain: string,
  full_domain: string, // 'nike.scanly.io'
  default_qr_id?: string,
  is_first_subdomain: boolean,
  time_since_signup: number // days
}
```

**Why Track:** Subdomain adoption rate, naming patterns, timing

---

### 19. **subdomain_published**
**When:** User publishes content to subdomain

**Properties:**
```typescript
{
  user_id: string,
  subdomain: string,
  qr_id: string,
  routes_count: number, // number of paths
  time_to_publish: number // seconds from claim to publish
}
```

**Why Track:** Time to activation, content complexity

---

### 20. **custom_domain_added**
**When:** User adds a custom domain

**Properties:**
```typescript
{
  user_id: string,
  domain_id: string,
  domain: string,
  qr_id?: string,
  plan: string, // user's subscription plan
  total_domains: number,
  is_first_custom_domain: boolean
}
```

**Why Track:** Custom domain adoption (premium feature indicator)

---

### 21. **custom_domain_verified**
**When:** Custom domain DNS verification succeeds

**Properties:**
```typescript
{
  user_id: string,
  domain_id: string,
  domain: string,
  time_to_verify: number, // seconds from domain_added
  verification_attempts: number,
  dns_provider?: string, // detected from nameservers
  ssl_provider: 'letsencrypt' | 'cloudflare' | 'custom'
}
```

**Why Track:** Verification success rate, time to setup, support needs

---

### 22. **custom_domain_failed**
**When:** Custom domain verification fails

**Properties:**
```typescript
{
  user_id: string,
  domain_id: string,
  domain: string,
  failure_reason: 'cname_missing' | 'txt_missing' | 'txt_mismatch' | 'ssl_failed',
  attempt_number: number,
  time_since_added: number // seconds
}
```

**Why Track:** Common failure points, support optimization

---

## Content & Block Events

### 23. **block_edited**
**When:** User edits a content block

**Properties:**
```typescript
{
  user_id: string,
  microsite_id: string,
  block_id: string,
  block_type: string,
  edit_type: 'text' | 'image' | 'style' | 'settings' | 'layout',
  time_spent_editing: number // seconds
}
```

**Why Track:** Block usage patterns, editor UX optimization

---

### 24. **ai_content_generated**
**When:** User generates content with AI

**Properties:**
```typescript
{
  user_id: string,
  content_type: 'heading' | 'description' | 'cta' | 'full_microsite',
  prompt?: string,
  industry?: string,
  tone?: string,
  generation_time: number, // milliseconds
  tokens_used: number,
  was_accepted: boolean,
  regeneration_count: number
}
```

**Why Track:** AI feature usage, quality metrics, cost tracking

---

### 25. **template_used**
**When:** User selects a template

**Properties:**
```typescript
{
  user_id: string,
  template_id: string,
  template_name: string,
  template_category: string,
  industry?: string,
  is_premium: boolean,
  customization_applied: boolean
}
```

**Why Track:** Template popularity, premium feature usage

---

## Monetization Events

### 26. **plan_viewed**
**When:** User views pricing page

**Properties:**
```typescript
{
  user_id?: string,
  current_plan?: string,
  source: 'navbar' | 'upgrade_prompt' | 'feature_limit' | 'dashboard',
  feature_blocked?: string // if prompted by feature limit
}
```

**Why Track:** Pricing page traffic, upgrade triggers

---

### 27. **upgrade_clicked**
**When:** User clicks upgrade button

**Properties:**
```typescript
{
  user_id: string,
  from_plan: string,
  to_plan: string,
  billing_cycle: 'monthly' | 'annual',
  price: number,
  currency: 'USD',
  trigger: 'feature_limit' | 'pricing_page' | 'dashboard_prompt',
  feature_blocked?: string
}
```

**Why Track:** Conversion intent, pricing effectiveness

---

### 28. **subscription_started** 🎯 **HIGH PRIORITY CONVERSION**
**When:** User successfully subscribes to paid plan

**Properties:**
```typescript
{
  user_id: string,
  plan: string,
  billing_cycle: 'monthly' | 'annual',
  price: number,
  currency: 'USD',
  payment_method: 'card' | 'paypal',
  days_since_signup: number,
  trial_used: boolean,
  discount_code?: string,
  discount_amount?: number,
  mrr: number, // Monthly Recurring Revenue
  arr: number, // Annual Recurring Revenue
  ltv_prediction?: number
}
```

**Why Track:** CORE REVENUE METRIC, conversion rate, time to monetization

---

### 29. **subscription_renewed**
**When:** Subscription auto-renews

**Properties:**
```typescript
{
  user_id: string,
  plan: string,
  billing_cycle: 'monthly' | 'annual',
  price: number,
  renewal_count: number,
  months_subscribed: number,
  churn_risk_score?: number
}
```

**Why Track:** Retention, LTV calculation, churn prediction

---

### 30. **subscription_cancelled**
**When:** User cancels subscription

**Properties:**
```typescript
{
  user_id: string,
  plan: string,
  months_subscribed: number,
  total_revenue: number,
  cancellation_reason: 'too_expensive' | 'not_using' | 'missing_features' | 'switching' | 'other',
  feedback?: string,
  offered_discount: boolean,
  accepted_discount: boolean,
  downgraded_to?: string // if downgrading instead of cancelling
}
```

**Why Track:** Churn rate, churn reasons, retention optimization

---

### 31. **payment_completed** 🎯 **HIGH PRIORITY CONVERSION**
**When:** End user completes payment on microsite (product purchase, tip, etc.)

**Properties:**
```typescript
{
  microsite_id: string,
  owner_id: string,
  payment_type: 'tip' | 'product' | 'service' | 'subscription' | 'donation',
  amount: number,
  currency: string,
  payment_method: 'stripe' | 'paypal' | 'apple_pay' | 'google_pay',
  product_id?: string,
  product_name?: string,
  quantity?: number,
  
  // Attribution
  device_type: string,
  country: string,
  referrer?: string,
  utm_source?: string,
  
  // Funnel
  time_from_view_to_purchase: number, // seconds
  pages_visited_before_purchase: number
}
```

**Why Track:** E-commerce conversion, revenue per QR, transaction analysis

---

## Engagement Events

### 32. **form_submitted**
**When:** User submits form on microsite

**Properties:**
```typescript
{
  microsite_id: string,
  owner_id: string,
  form_type: 'contact' | 'lead' | 'feedback' | 'booking' | 'survey',
  form_id: string,
  fields_count: number,
  has_file_upload: boolean,
  time_to_submit: number, // seconds from form view
  device_type: string,
  country: string
}
```

**Why Track:** Lead generation, form conversion rate, UX optimization

---

### 33. **video_played**
**When:** User plays video on microsite

**Properties:**
```typescript
{
  microsite_id: string,
  owner_id: string,
  video_id: string,
  video_source: 'youtube' | 'vimeo' | 'upload' | 'url',
  autoplay: boolean,
  device_type: string
}
```

**Why Track:** Video engagement, content effectiveness

---

### 34. **video_completed**
**When:** User watches video to completion

**Properties:**
```typescript
{
  microsite_id: string,
  owner_id: string,
  video_id: string,
  video_duration: number, // seconds
  watch_percentage: number, // 0-100
  time_to_complete: number // actual time spent
}
```

**Why Track:** Video completion rate, engagement quality

---

### 35. **file_downloaded**
**When:** User downloads file from microsite

**Properties:**
```typescript
{
  microsite_id: string,
  owner_id: string,
  file_type: 'pdf' | 'image' | 'document' | 'other',
  file_name: string,
  file_size: number, // bytes
  download_type: 'menu' | 'brochure' | 'resume' | 'attachment',
  device_type: string,
  country: string
}
```

**Why Track:** Content distribution, engagement depth

---

### 36. **social_follow**
**When:** User clicks social media link on microsite

**Properties:**
```typescript
{
  microsite_id: string,
  owner_id: string,
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube',
  link_position: string,
  time_on_page: number,
  device_type: string
}
```

**Why Track:** Social media conversion, platform preferences

---

### 37. **booking_made**
**When:** User books appointment/reservation

**Properties:**
```typescript
{
  microsite_id: string,
  owner_id: string,
  booking_type: 'appointment' | 'reservation' | 'event',
  calendar_service: 'calendly' | 'custom' | 'google',
  booking_time: string,
  days_in_advance: number,
  device_type: string,
  country: string
}
```

**Why Track:** Booking conversion rate, calendar integration usage

---

## Integration Events

### 38. **integration_connected**
**When:** User connects third-party integration

**Properties:**
```typescript
{
  user_id: string,
  integration_type: 'google_analytics' | 'facebook_pixel' | 'mailchimp' | 
                     'zapier' | 'hubspot' | 'salesforce' | 'stripe' | 'shopify',
  integration_id: string,
  plan: string, // user's plan
  total_integrations: number,
  time_since_signup: number // days
}
```

**Why Track:** Integration adoption, power user identification

---

### 39. **integration_disconnected**
**When:** User disconnects integration

**Properties:**
```typescript
{
  user_id: string,
  integration_type: string,
  integration_id: string,
  days_connected: number,
  reason?: string
}
```

**Why Track:** Integration churn, satisfaction issues

---

### 40. **integration_sync_completed**
**When:** Data sync completes with integration

**Properties:**
```typescript
{
  user_id: string,
  integration_type: string,
  sync_type: 'manual' | 'automatic',
  records_synced: number,
  sync_duration: number, // seconds
  errors_count: number
}
```

**Why Track:** Integration health, data flow monitoring

---

## Analytics & Insights Events

### 41. **analytics_viewed**
**When:** User views analytics dashboard

**Properties:**
```typescript
{
  user_id: string,
  view_type: 'overview' | 'qr_details' | 'microsite_details' | 'conversions',
  qr_id?: string,
  microsite_id?: string,
  date_range: string, // '7d', '30d', '90d', 'custom'
  filters_applied: string[]
}
```

**Why Track:** Dashboard usage, data-driven decision making

---

### 42. **report_exported**
**When:** User exports analytics report

**Properties:**
```typescript
{
  user_id: string,
  export_format: 'csv' | 'pdf' | 'excel',
  report_type: string,
  date_range: string,
  metrics_included: string[]
}
```

**Why Track:** Report usage, data export needs

---

### 43. **insight_viewed**
**When:** User views AI-generated insight

**Properties:**
```typescript
{
  user_id: string,
  insight_type: 'prediction' | 'recommendation' | 'trend' | 'anomaly',
  insight_category: 'performance' | 'engagement' | 'conversion' | 'optimization',
  qr_id?: string,
  was_acted_on: boolean
}
```

**Why Track:** AI feature value, actionable insights

---

## A/B Testing Events

### 44. **experiment_started**
**When:** User creates and starts A/B test

**Properties:**
```typescript
{
  user_id: string,
  experiment_id: string,
  experiment_type: 'qr_design' | 'microsite_content' | 'cta_button' | 'pricing',
  variants_count: number,
  target_metric: 'scans' | 'clicks' | 'conversions' | 'time_on_page',
  traffic_split: number[] // [50, 50] or [33, 33, 34]
}
```

**Why Track:** Experimentation adoption, optimization culture

---

### 45. **experiment_variant_assigned**
**When:** User is assigned to experiment variant

**Properties:**
```typescript
{
  experiment_id: string,
  variant_id: string,
  variant_name: string,
  user_id?: string, // if logged in
  session_id: string,
  assignment_method: 'random' | 'sticky' | 'targeted'
}
```

**Why Track:** Experiment distribution, variant exposure

---

### 46. **experiment_conversion**
**When:** User in experiment completes goal

**Properties:**
```typescript
{
  experiment_id: string,
  variant_id: string,
  variant_name: string,
  user_id?: string,
  session_id: string,
  goal_metric: string,
  goal_value: number,
  time_to_conversion: number // seconds
}
```

**Why Track:** Variant performance, statistical significance

---

### 47. **experiment_completed**
**When:** User ends A/B test

**Properties:**
```typescript
{
  user_id: string,
  experiment_id: string,
  duration_days: number,
  total_participants: number,
  winning_variant?: string,
  confidence_level: number, // 0-100%
  improvement_percentage: number,
  was_significant: boolean,
  action_taken: 'applied_winner' | 'discarded' | 'extended'
}
```

**Why Track:** Experiment completion rate, data-driven decisions

---

## User Properties

Track these as **user-level properties** (not events):

```typescript
{
  // Identity
  user_id: string,
  email: string,
  name: string,
  
  // Account Details
  plan: 'free' | 'pro' | 'business' | 'enterprise',
  billing_cycle: 'monthly' | 'annual',
  account_status: 'trial' | 'active' | 'past_due' | 'cancelled',
  trial_end_date?: string,
  
  // Dates
  signup_date: string,
  first_qr_date?: string,
  first_publish_date?: string,
  first_scan_date?: string,
  first_payment_date?: string,
  
  // Usage Stats
  total_qrs_created: number,
  total_microsites_created: number,
  total_scans_received: number,
  total_domains: number,
  total_integrations: number,
  
  // Engagement
  last_login_date: string,
  login_count: number,
  days_since_last_login: number,
  weekly_active_days: number, // last 7 days
  
  // Revenue
  lifetime_value: number,
  monthly_recurring_revenue: number,
  total_revenue: number,
  
  // Demographics
  country: string,
  timezone: string,
  language: string,
  
  // Business
  industry?: string,
  company_size?: string,
  use_case?: string,
  
  // Features Used
  has_used_ai: boolean,
  has_custom_domain: boolean,
  has_subdomain: boolean,
  has_integrations: boolean,
  has_run_experiments: boolean,
  
  // Engagement Scores
  engagement_score: number, // 0-100
  churn_risk_score: number, // 0-100
  product_qualified_lead_score: number // 0-100
}
```

---

## Conversion Funnels

### Funnel 1: User Onboarding
```typescript
const ONBOARDING_FUNNEL = [
  'signup_started',          // 100% (baseline)
  'signup_completed',        // ~70% completion
  'email_verified',          // ~60%
  'qr_created',             // ~45% activation
  'qr_published',           // ~35%
  'qr_scanned'              // ~25% success
];
```

**Goal:** Increase activation rate from 45% to 60%

---

### Funnel 2: Free to Paid Conversion
```typescript
const MONETIZATION_FUNNEL = [
  'signup_completed',        // 100% (free users)
  'qr_created',             // 70%
  'feature_limit_hit',      // 40% (custom event)
  'plan_viewed',            // 25%
  'upgrade_clicked',        // 15%
  'subscription_started'    // 8% conversion rate (goal: 12%)
];
```

**Goal:** Increase free-to-paid conversion from 8% to 12%

---

### Funnel 3: E-commerce Conversion (Microsite)
```typescript
const ECOMMERCE_FUNNEL = [
  'qr_scanned',             // 100% (baseline)
  'microsite_viewed',       // 95%
  'product_viewed',         // 50%
  'add_to_cart',           // 15%
  'payment_initiated',      // 10%
  'payment_completed'       // 7% conversion rate
];
```

**Goal:** Optimize checkout flow to increase conversion

---

### Funnel 4: Domain Setup
```typescript
const DOMAIN_SETUP_FUNNEL = [
  'custom_domain_added',    // 100% (baseline)
  'dns_configured',         // 60% (custom event)
  'domain_verified',        // 40%
  'domain_activated',       // 38%
  'domain_first_scan'       // 30% usage
];
```

**Goal:** Reduce verification friction, increase success rate

---

### Funnel 5: Content Publishing
```typescript
const PUBLISHING_FUNNEL = [
  'microsite_created',      // 100%
  'block_added',           // 90%
  'customization_applied',  // 70%
  'preview_viewed',        // 60%
  'microsite_published',   // 50%
  'qr_generated',          // 45%
  'qr_downloaded'          // 35% completion
];
```

**Goal:** Reduce time to publish, increase completion

---

## Implementation Examples

### Backend (Node.js + Mixpanel)

```typescript
// services/analytics-service/src/lib/mixpanel.ts
import Mixpanel from 'mixpanel';

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN || '');

export async function trackQRScanned(data: {
  qrId: string;
  ownerId: string;
  deviceType: string;
  country: string;
  // ... other properties
}) {
  mixpanel.track('qr_scanned', {
    distinct_id: data.qrId, // Use QR ID as identifier
    qr_id: data.qrId,
    qr_owner_id: data.ownerId,
    device_type: data.deviceType,
    country: data.country,
    scan_time: new Date().toISOString(),
    // ... all other properties
  });
  
  // Also increment total scans for QR owner
  mixpanel.people.increment(data.ownerId, 'total_scans_received', 1);
}

export async function trackSubscriptionStarted(data: {
  userId: string;
  plan: string;
  price: number;
  billingCycle: string;
  // ... other properties
}) {
  mixpanel.track('subscription_started', {
    distinct_id: data.userId,
    plan: data.plan,
    price: data.price,
    billing_cycle: data.billingCycle,
    // Mark as revenue event
    revenue: data.price,
    // ... all other properties
  });
  
  // Update user properties
  mixpanel.people.set(data.userId, {
    plan: data.plan,
    billing_cycle: data.billingCycle,
    account_status: 'active',
    first_payment_date: new Date().toISOString(),
    monthly_recurring_revenue: data.billingCycle === 'monthly' ? data.price : data.price / 12,
  });
  
  // Track revenue
  mixpanel.people.track_charge(data.userId, data.price);
}
```

---

### Frontend (React + Mixpanel)

```typescript
// qr-frontend/src/lib/mixpanel.ts
import mixpanel from 'mixpanel-browser';

mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN, {
  debug: import.meta.env.DEV,
  track_pageview: true,
  persistence: 'localStorage',
});

export function trackQRCreated(data: {
  qrId: string;
  qrType: string;
  hasCustomLogo: boolean;
  // ... other properties
}) {
  mixpanel.track('qr_created', {
    qr_id: data.qrId,
    qr_type: data.qrType,
    has_custom_logo: data.hasCustomLogo,
    creation_source: 'dashboard',
    timestamp: new Date().toISOString(),
    // ... all other properties
  });
  
  // Increment user's QR count
  mixpanel.people.increment('total_qrs_created', 1);
}

export function trackUpgradeClicked(data: {
  fromPlan: string;
  toPlan: string;
  price: number;
  trigger: string;
}) {
  mixpanel.track('upgrade_clicked', {
    from_plan: data.fromPlan,
    to_plan: data.toPlan,
    price: data.price,
    billing_cycle: 'monthly',
    trigger: data.trigger,
    timestamp: new Date().toISOString(),
  });
}
```

---

### React Component Example

```typescript
// qr-frontend/src/components/qr/CreateQRForm.tsx
import { useEffect } from 'react';
import { mixpanel } from '../../lib/mixpanel';

export function CreateQRForm() {
  const [qrType, setQRType] = useState('url');
  
  useEffect(() => {
    // Track page view
    mixpanel.track('page_viewed', {
      page: 'create_qr',
      timestamp: new Date().toISOString(),
    });
  }, []);
  
  const handleSubmit = async (data: QRFormData) => {
    const response = await api.post('/qr/generate', data);
    
    // Track QR creation
    mixpanel.track('qr_created', {
      qr_id: response.id,
      qr_type: data.type,
      has_custom_logo: !!data.logo,
      has_custom_colors: !!data.colors,
      is_dynamic: data.isDynamic,
      is_first_qr: userStats.total_qrs_created === 0,
      total_qrs_created: userStats.total_qrs_created + 1,
      creation_source: 'dashboard',
    });
    
    // Update user properties
    mixpanel.people.increment('total_qrs_created', 1);
    mixpanel.people.set({
      last_qr_created: new Date().toISOString(),
    });
    
    // Navigate to QR details
    navigate(`/qr/${response.id}`);
  };
  
  return (
    // ... form JSX
  );
}
```

---

## Summary

### Total Events Tracked: **47 events**

**Critical Conversion Events (Top Priority):**
1. ✅ `subscription_started` - Revenue
2. ✅ `payment_completed` - E-commerce revenue
3. ✅ `qr_scanned` - Core product usage
4. ✅ `microsite_published` - Activation
5. ✅ `custom_domain_verified` - Premium feature adoption

**Key Funnels (5 funnels):**
1. User Onboarding
2. Free to Paid Conversion
3. E-commerce Conversion
4. Domain Setup
5. Content Publishing

**User Properties:** 30+ attributes for cohort analysis

**Next Steps:**
1. Install Mixpanel SDK in backend and frontend
2. Implement core conversion events first
3. Set up funnels in Mixpanel dashboard
4. Create real-time dashboards for monitoring
5. Set up alerts for key metrics
6. Build custom reports for business insights

**Questions?** Contact the analytics team for implementation support.
