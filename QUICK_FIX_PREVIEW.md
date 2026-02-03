# Quick Fix: Preview Shows Theme

## Problem
Preview shows "New Microsite, Heading, Your text here..." with NO theme styling.

## Why
Backend `renderMicrosite()` only uses basic `theme.background` and `theme.textColor`.
It doesn't know about PageTheme (gradients, buttons, fonts, etc.).

## Solution (30 min quick fix)

### File: `services/microsite-service/src/utils/render.ts`

### Step 1: Parse Full Theme (Line ~15)

**Find this:**
```typescript
export function renderMicrosite(site: any) {
  const { title, description, theme, links, layout } = site;
```

**Add after it:**
```typescript
  // Parse full theme if stored in description
  let pageTheme = null;
  try {
    if (description) {
      const parsed = JSON.parse(description);
      pageTheme = parsed.fullTheme;
    }
  } catch {
    // Fallback to basic theme
  }
  
  const bgColor = pageTheme?.background?.color || theme?.background || '#ffffff';
  const primaryColor = pageTheme?.button?.backgroundColor || '#3b82f6';
  const titleFont = pageTheme?.typography?.titleFont || 'Inter';
  const bodyFont = pageTheme?.typography?.bodyFont || 'Inter';
```

### Step 2: Add Google Fonts (in HTML head)

**Find the `<head>` section, add:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${titleFont.replace(' ', '+')}:wght@600;700&family=${bodyFont.replace(' ', '+')}:wght@400;500&display=swap" rel="stylesheet">
```

### Step 3: Add Theme Styles (in `<style>` tag)

**Find existing `<style>` tag, replace with:**
```html
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: '${bodyFont}', system-ui, sans-serif;
    background: ${bgColor};
    color: ${pageTheme?.typography?.bodyColor || '#374151'};
    padding: 2rem 1rem;
    min-height: 100vh;
  }
  
  h1, h2, h3 {
    font-family: '${titleFont}', system-ui, sans-serif;
    color: ${pageTheme?.typography?.titleColor || '#111827'};
    font-weight: 700;
    margin-bottom: 1rem;
  }
  
  .link-button {
    display: block;
    background: ${primaryColor};
    color: ${pageTheme?.button?.textColor || '#ffffff'};
    padding: 1rem 1.5rem;
    border-radius: ${pageTheme?.button?.borderRadius === 'full' ? '9999px' : '0.5rem'};
    text-decoration: none;
    text-align: center;
    margin-bottom: 1rem;
    font-weight: 600;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .link-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
</style>
```

### Step 4: Render Profile Block

**Find the `renderBlock` function, add this case:**
```typescript
case 'profile':
  const { avatarUrl, displayName, bio } = content;
  return `
    <div style="text-align: center; margin-bottom: 2rem;">
      ${avatarUrl ? `
        <img 
          src="${avatarUrl}" 
          alt="${displayName}" 
          style="width: 96px; height: 96px; border-radius: 50%; margin: 0 auto 1rem; object-fit: cover; display: block;"
        />
      ` : ''}
      <h1 style="font-size: 1.875rem; margin-bottom: 0.5rem;">${displayName || 'Your Name'}</h1>
      ${bio ? `<p style="color: #6b7280; margin-bottom: 0.5rem;">${bio}</p>` : ''}
    </div>
  `;
```

### Step 5: Render LinkButton Block

**Add this case in `renderBlock`:**
```typescript
case 'linkButton':
  const { label, url, description: linkDesc } = content;
  return `
    <a href="${url || '#'}" class="link-button" target="_blank" rel="noopener noreferrer">
      <div style="font-size: 1rem;">${label || 'Click Here'}</div>
      ${linkDesc ? `<div style="font-size: 0.875rem; opacity: 0.9; margin-top: 0.25rem;">${linkDesc}</div>` : ''}
    </a>
  `;
```

## Test

1. Go to editor
2. Add Profile block + 3 Link Buttons
3. Select "Ocean Gradient" theme
4. Click Save
5. Click Preview
6. **Should now see:**
   - Blue gradient background ✨
   - Your profile with avatar
   - Styled buttons with hover effects
   - Custom fonts

## 5-Minute Minimal Fix

If you just want SOME color quickly:

**In `<style>` tag:**
```css
body {
  background: ${theme?.background || '#f3f4f6'};
}

a.link-button {
  background: ${theme?.primaryColor || '#3b82f6'};
  color: white;
  padding: 1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  display: block;
  margin: 0.5rem 0;
}
```

This gives basic theming immediately.

---

**After this fix, preview will show:**
- ✅ Theme backgrounds
- ✅ Custom fonts
- ✅ Styled buttons
- ✅ Profile blocks
- ✅ Link buttons
