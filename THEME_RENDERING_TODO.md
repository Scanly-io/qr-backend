# Backend Theme Rendering - Implementation Plan

## Current Problem

**Preview shows unstyled content** because the backend's `renderMicrosite()` function doesn't support the advanced theme system from the frontend.

### What Users See:
- ❌ No theme backgrounds (gradients, patterns, videos)
- ❌ No custom fonts (Google Fonts)
- ❌ No styled buttons (colors, radius, hover effects)
- ❌ No header/footer theming
- ❌ Missing block types (profile, linkButton, etc.)

### What's Happening:
1. Frontend saves rich `PageTheme` object
2. Backend stores it but doesn't use it during rendering
3. Public page renders with basic HTML + minimal Tailwind

## Solution Overview

### Phase 1: Update Database Schema ✅ DONE
- [x] Microsite table already has `theme` JSON column
- [x] Can store full PageTheme object

### Phase 2: Update Render Function 🚧 IN PROGRESS

**File**: `qr-backend/services/microsite-service/src/utils/render.ts`

#### Step 1: Accept Full Theme
```typescript
export function renderMicrosite(site: any) {
  const { title, description, theme, links, layout } = site;
  
  // Parse full theme if stored as JSON string
  const fullTheme = typeof theme === 'string' ? JSON.parse(theme) : theme;
  
  // Extract PageTheme components
  const {
    background,
    typography,
    button,
    header,
    footer
  } = fullTheme || {};
```

#### Step 2: Render Theme Styles
```typescript
<style>
  /* Import Google Fonts */
  @import url('https://fonts.googleapis.com/css2?family=${typography?.titleFont}:wght@400;600;700&family=${typography?.bodyFont}:wght@400;500&display=swap');
  
  body {
    font-family: '${typography?.bodyFont || 'Inter'}', sans-serif;
    background: ${getBackgroundCSS(background)};
    color: ${typography?.bodyColor || '#374151'};
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: '${typography?.titleFont || 'Inter'}', sans-serif;
    color: ${typography?.titleColor || '#111827'};
    font-weight: ${typography?.titleWeight || 700};
  }
  
  a {
    color: ${typography?.linkColor || '#3b82f6'};
  }
  
  .btn-primary {
    background: ${button?.backgroundColor || '#3b82f6'};
    color: ${button?.textColor || '#ffffff'};
    padding: ${getButtonPadding(button?.size)};
    border-radius: ${getButtonRadius(button?.borderRadius)};
    font-weight: 600;
    transition: all 0.2s;
  }
  
  .btn-primary:hover {
    transform: ${getHoverTransform(button?.hoverEffect)};
    opacity: ${button?.hoverEffect === 'glow' ? 0.9 : 1};
  }
</style>
```

#### Step 3: Helper Functions
```typescript
function getBackgroundCSS(bg: any): string {
  if (!bg) return '#ffffff';
  
  switch (bg.type) {
    case 'solid':
      return bg.color || '#ffffff';
      
    case 'gradient':
      const direction = bg.direction || 'to-b';
      const from = bg.gradientFrom || bg.from || '#3b82f6';
      const to = bg.gradientTo || bg.to || '#8b5cf6';
      const via = bg.gradientVia || bg.via;
      
      const dirMap: Record<string, string> = {
        'to-t': 'to top',
        'to-b': 'to bottom',
        'to-l': 'to left',
        'to-r': 'to right',
        'to-tr': 'to top right',
        'to-tl': 'to top left',
        'to-br': 'to bottom right',
        'to-bl': 'to bottom left',
      };
      
      const cssDir = dirMap[direction] || 'to bottom';
      
      if (via) {
        return `linear-gradient(${cssDir}, ${from}, ${via}, ${to})`;
      }
      return `linear-gradient(${cssDir}, ${from}, ${to})`;
      
    case 'image':
      return `url(${bg.imageUrl})`;
      
    default:
      return '#ffffff';
  }
}

function getButtonPadding(size?: string): string {
  switch (size) {
    case 'small': return '0.5rem 1rem';
    case 'large': return '1rem 2rem';
    default: return '0.75rem 1.5rem';
  }
}

function getButtonRadius(radius?: string): string {
  const map: Record<string, string> = {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  };
  return map[radius || 'md'] || '0.5rem';
}

function getHoverTransform(effect?: string): string {
  switch (effect) {
    case 'lift': return 'translateY(-2px)';
    case 'grow': return 'scale(1.05)';
    case 'shrink': return 'scale(0.95)';
    default: return 'none';
  }
}
```

#### Step 4: Render Profile Block
```typescript
case 'profile':
  const { avatarUrl, displayName, bio, location, website } = content;
  return `
    <div class="text-center mb-8">
      ${avatarUrl ? `
        <img 
          src="${avatarUrl}" 
          alt="${displayName}" 
          class="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
          style="width: ${header?.avatarSize === 'large' ? '96px' : '80px'}"
        />
      ` : ''}
      <h1 class="text-2xl font-bold mb-2">${displayName}</h1>
      ${bio ? `<p class="text-gray-600 mb-3">${bio}</p>` : ''}
      ${location ? `<p class="text-sm text-gray-500">📍 ${location}</p>` : ''}
    </div>
  `;
```

#### Step 5: Render LinkButton Block
```typescript
case 'linkButton':
  const { label, url, description, thumbnail, icon } = content;
  return `
    <a 
      href="${url}" 
      target="_blank"
      rel="noopener noreferrer"
      class="btn-primary block text-center no-underline shadow-sm hover:shadow-md"
    >
      <div class="flex items-center justify-between gap-3">
        ${thumbnail ? `<img src="${thumbnail}" class="w-12 h-12 rounded object-cover flex-shrink-0" />` : ''}
        <div class="flex-1 ${thumbnail ? 'text-left' : 'text-center'}">
          <div class="font-semibold">${label}</div>
          ${description ? `<div class="text-sm opacity-80">${description}</div>` : ''}
        </div>
        ${icon ? `<span class="text-xl flex-shrink-0">${getIconForType(icon)}</span>` : '→'}
      </div>
    </a>
  `;
```

### Phase 3: Video Background Support

For video backgrounds, add to `<body>`:
```html
${background?.type === 'video' && background.videoUrl ? `
  <video 
    autoplay 
    loop 
    muted 
    playsinline 
    class="fixed inset-0 w-full h-full object-cover -z-10"
    style="opacity: ${background.videoOpacity || 1}"
  >
    <source src="${background.videoUrl}" type="video/mp4" />
  </video>
` : ''}
```

### Phase 4: Pattern Backgrounds

Patterns need to be SVG data URIs (same as frontend):
```typescript
function getPatternSVG(pattern: any): string {
  const { patternType, baseColor, patternColor, opacity } = pattern;
  
  // Generate SVG pattern (copy from frontend utils/patterns.ts)
  // Return as data URI: `url("data:image/svg+xml,...")`
}
```

## Testing Plan

### Test 1: Basic Theme
1. Select "Ocean Gradient" theme
2. Save microsite
3. Preview → Should show blue-purple gradient background

### Test 2: Profile + Buttons
1. Add Profile block
2. Add 3 Link Buttons
3. Apply "Sunset Gradient" theme
4. Preview → Should show:
   - Orange-pink gradient background
   - Styled avatar
   - Rounded buttons with proper colors

### Test 3: Custom Theme
1. Customize background → Pattern (dots)
2. Change button color → Green
3. Change font → Poppins
4. Preview → Should show all customizations

### Test 4: Video Background
1. Set background type → Video
2. Add video URL
3. Preview → Should show video playing behind content

## Files to Update

### Backend
- ✅ `schema.ts` - Already has theme column
- 🔧 `utils/render.ts` - Main rendering logic (150 lines to add)
- 🔧 `routes/microsite.ts` - Ensure theme is saved correctly
- 📝 `types.ts` - Add PageTheme interface

### Frontend (Already Done)
- ✅ `types/theme.ts` - PageTheme interface
- ✅ `utils/patterns.ts` - Pattern generation
- ✅ `EditorLayout.tsx` - Saves theme
- ✅ `Canvas.tsx` - Renders theme preview

## Deployment Checklist

- [ ] Update `utils/render.ts` with theme support
- [ ] Test all block types render correctly
- [ ] Test all theme types (solid, gradient, pattern, video)
- [ ] Test Google Fonts loading
- [ ] Test mobile responsiveness
- [ ] Update API docs
- [ ] Deploy to staging
- [ ] QA test with real QR codes
- [ ] Deploy to production

## Fallback Strategy

If full theme support takes time, add minimal styling:
```typescript
// Extract basic colors from theme
const primaryColor = theme?.button?.backgroundColor || '#3b82f6';
const bgColor = theme?.background?.type === 'solid' 
  ? theme.background.color 
  : '#ffffff';

// Apply basic styles
<style>
  body { background: ${bgColor}; }
  .btn { background: ${primaryColor}; }
</style>
```

This gives users SOME styling while full theme system is built.

---

**Priority**: HIGH
**Effort**: ~4 hours
**Impact**: Fixes user-facing preview/publish functionality
