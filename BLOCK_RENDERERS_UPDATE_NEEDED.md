# Backend Block Renderers - Update Required

## 📊 Current Status

The frontend has **40+ content blocks** but the backend `render.ts` file is missing renderers for **11 advanced blocks**.

### ✅ Already Implemented (29 blocks)

| Block Type | Category | Status | Notes |
|------------|----------|--------|-------|
| `profile` | Linktree | ✅ Implemented | Avatar, name, bio, location, website |
| `linkButton` | Linktree | ✅ Implemented | CTA buttons with icons, thumbnails |
| `header` | Linktree | ✅ Implemented | Page header with logo, title, subtitle |
| `footer` | Linktree | ✅ Implemented | Copyright, links, social icons |
| `heading` | Content | ✅ Implemented | H1/H2/H3 with gradients, shadows, decorations |
| `text` | Content | ✅ Implemented | Rich text with TipTap HTML, columns, drop cap |
| `button` | Content | ✅ Implemented | Customizable CTAs |
| `image` | Content | ✅ Implemented | Responsive images with lazy loading |
| `video` | Content | ✅ Implemented | YouTube/Vimeo embeds |
| `divider` | Content | ✅ Implemented | Horizontal separators |
| `spacer` | Content | ✅ Implemented | Vertical spacing |
| `social` | Content | ✅ Implemented | Social media link grid |
| `form` | Interactive | ✅ Implemented | Lead capture forms |
| `faq` | Interactive | ✅ Implemented | Accordion with animations |
| `gallery` | Interactive | ✅ Implemented | Image carousel with lightbox |
| `countdown` | Interactive | ✅ Implemented | Event timers with live updates |
| `calendar` | Interactive | ✅ Implemented | Events list |
| `testimonial` | Interactive | ✅ Implemented | Customer reviews with ratings |
| `pricing` | Business | ✅ Implemented | Subscription plan comparisons |
| `stats` | Business | ✅ Implemented | Animated counters |

### ❌ Missing Renderers (11 blocks)

| Block Type | Category | Priority | Frontend Ready | Notes |
|------------|----------|----------|----------------|-------|
| `features` | Business | 🔴 HIGH | ✅ Yes | Icon grid with descriptions - CRITICAL for marketing pages |
| `map` | Business | 🟡 MEDIUM | ✅ Yes | Google Maps embeds - important for local businesses |
| `hero` | Business | 🔴 HIGH | ✅ Yes | Full-width hero sections - CRITICAL for landing pages |
| `payment` | Monetization | 🔴 HIGH | ✅ Yes | Stripe payment/tip jar - CRITICAL for creator monetization |
| `product` | Monetization | 🟡 MEDIUM | ✅ Yes | Single product showcase - important for e-commerce |
| `shop` | Monetization | 🟡 MEDIUM | ✅ Yes | Multi-product store with cart - important for creators |
| `artist` | Monetization | 🟢 LOW | ✅ Yes | Music player with Spotify integration - niche use case |
| `deals` | Monetization | 🟢 LOW | ✅ Yes | Promotions and coupons - nice to have |
| `schedule` | Business | 🟡 MEDIUM | ✅ Yes | Calendly-style booking - important for consultants |
| `real-estate` | Business | 🟢 LOW | ✅ Yes | Property listings - niche vertical |
| `menu` | Business | 🟢 LOW | ✅ Yes | Restaurant menus - niche vertical |

---

## 🔥 Critical Issues

### 1. **Published Microsites Won't Display New Blocks**

When users add these blocks in the editor and click "Publish":
- ✅ **Frontend editor** shows blocks correctly (React components)
- ❌ **Published microsite** shows "Unknown block type" comments
- ❌ **QR code scans** lead to broken pages

### 2. **Backend Rendering Missing**

**File:** `services/microsite-service/src/utils/render.ts`

The `renderBlock()` function has a `switch` statement that handles block types. Missing cases return:

```typescript
default:
  return `<!-- Unknown block type: ${block.type} -->`;
```

This means users see blank spaces or HTML comments instead of their content.

### 3. **No Server-Side HTML Generation**

All 11 missing blocks need:
- Static HTML generation (for fast loading)
- Inline CSS styles (from theme)
- Data attributes (for client-side interactivity)
- Responsive design classes
- Accessibility attributes

---

## 📋 Implementation Checklist

### Phase 1: Critical Marketing Blocks (1-2 days)

- [ ] **`features` Block** - Icon grid (like "Why Choose Us")
  - Grid layout (2-4 columns)
  - Icon support (Lucide icons or emoji)
  - Title + description per feature
  - Theme color integration
  - **Impact:** Most common marketing block after hero

- [ ] **`hero` Block** - Full-width hero sections
  - Background image/video support
  - Overlay opacity
  - CTA buttons
  - Centered/left-aligned text
  - **Impact:** Essential for landing pages

- [ ] **`payment` Block** - Stripe integration
  - Tip jar amounts
  - Product checkout
  - Payment form rendering
  - Success/error states
  - **Impact:** Creator monetization

### Phase 2: Business Blocks (2-3 days)

- [ ] **`map` Block** - Google Maps embeds
  - Embed iframe
  - Custom markers
  - Directions link
  - **Impact:** Local businesses, events

- [ ] **`schedule` Block** - Booking system
  - Calendar view
  - Time slot selection
  - Form integration
  - **Impact:** Consultants, coaches

- [ ] **`product` Block** - E-commerce
  - Product image
  - Price display
  - Buy button
  - Variants (size/color)
  - **Impact:** Creators selling merchandise

- [ ] **`shop` Block** - Multi-product store
  - Product grid
  - Shopping cart
  - Checkout flow
  - **Impact:** Small businesses

### Phase 3: Niche Vertical Blocks (1-2 days)

- [ ] **`artist` Block** - Music/podcast player
  - Spotify embeds
  - Track list
  - Play/pause controls
  - **Impact:** Musicians, podcasters

- [ ] **`deals` Block** - Promotions
  - Discount badges
  - Expiry countdown
  - Coupon codes
  - **Impact:** E-commerce, retail

- [ ] **`real-estate` Block** - Property listings
  - Property cards
  - Filters (price, beds, location)
  - Gallery integration
  - **Impact:** Real estate agents

- [ ] **`menu` Block** - Restaurant menus
  - Category sections
  - Item descriptions
  - Pricing
  - Dietary tags
  - **Impact:** Restaurants, cafes

---

## 💻 Implementation Guide

### Example: Adding `features` Block Renderer

**Location:** `services/microsite-service/src/utils/render.ts`

```typescript
case "features": {
  const featureItems = content.items || [];
  const columns = content.columns || 3;
  const iconSize = content.iconSize || "md";
  const layout = content.layout || "grid"; // grid | list
  
  const columnClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  }[columns];
  
  const iconSizeClass = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  }[iconSize];
  
  return `
    <div class="features-block w-full px-4 py-8">
      <div class="grid ${columnClass} gap-6">
        ${featureItems.map((item: any) => `
          <div class="feature-item flex flex-col items-center text-center p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
            ${item.icon ? `
              <div class="${iconSizeClass} mb-4 text-${theme?.branding?.primaryColor || 'violet-600'}">
                ${renderLucideIcon(item.icon)}
              </div>
            ` : ""}
            <h3 class="text-lg font-semibold mb-2">${item.title}</h3>
            <p class="text-sm text-gray-600">${item.description}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}
```

### Testing

```bash
# 1. Add feature block in frontend editor
# 2. Click "Publish"
# 3. Visit public microsite URL
# 4. Verify block renders correctly

# API test
curl -X POST http://localhost:3005/api/microsite/SITE_ID/publish \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "layout": [{
      "type": "features",
      "content": {
        "items": [
          {
            "icon": "Zap",
            "title": "Fast Performance",
            "description": "Lightning-fast loading times"
          }
        ]
      }
    }]
  }'
```

---

## 📊 Impact Analysis

### User Impact

**Current State:**
- Users can add 11 blocks in the editor ✅
- Blocks preview correctly in Canvas ✅
- **Published pages are broken** ❌
- QR codes lead to incomplete content ❌

**After Implementation:**
- All 40 blocks work end-to-end ✅
- Professional microsites with full features ✅
- Creator monetization functional ✅
- Marketing pages complete ✅

### Technical Debt

**Current:**
- Frontend-backend mismatch
- "Unknown block type" comments in production
- User confusion and support tickets

**After Fix:**
- Feature parity across stack
- Clean HTML output
- Reduced support burden

---

## 🚀 Recommended Implementation Order

1. **`features`** (2-3 hours) - Most commonly used marketing block
2. **`hero`** (2-3 hours) - Essential for landing pages
3. **`payment`** (4-6 hours) - Critical for monetization
4. **`map`** (1-2 hours) - Simple embed, high value
5. **`schedule`** (3-4 hours) - Complex but important
6. **`product`** + **`shop`** (4-6 hours together) - Related e-commerce blocks
7. **`artist`**, **`deals`**, **`real-estate`**, **`menu`** (1-2 hours each) - Niche verticals

**Total Estimated Time:** 20-30 hours for all 11 blocks

---

## 📝 Notes

### Frontend Block Locations

All frontend block components are in:
```
qr-frontend/src/components/blocks/
├── FeaturesBlock.tsx
├── HeroBlock.tsx
├── PaymentBlock.tsx
├── MapBlock.tsx
├── ScheduleBlock.tsx
├── ProductBlock.tsx
├── ShopBlock.tsx
├── ArtistBlock.tsx
├── DealsBlock.tsx
├── RealEstateBlock.tsx
└── MenuBlock.tsx
```

### Backend Render File

```
qr-backend/services/microsite-service/src/utils/render.ts
- Line 284: renderBlock() function
- Add new cases in switch statement
- Follow existing patterns (gallery, pricing, stats)
```

### Client-Side Interactivity

For blocks needing JavaScript (payment forms, booking calendars):
```
qr-backend/services/microsite-service/src/utils/microsite-client.js
- Add event listeners
- Handle form submissions
- API calls to backend
```

---

## 🎯 Success Criteria

- [ ] All 40 block types render in published microsites
- [ ] No "Unknown block type" comments in production HTML
- [ ] Published pages match editor preview 100%
- [ ] All blocks are mobile-responsive
- [ ] Theme colors apply to all blocks
- [ ] Client-side interactivity works (forms, payments, booking)
- [ ] Swagger docs updated with new block schemas
- [ ] Integration tests pass for all blocks

---

**Last Updated:** January 29, 2026
**Priority:** 🔴 HIGH - Blocking user production launches
