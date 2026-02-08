/**
 * Generate CSS for theme background (supports solid colors and gradients)
 */
import { logger } from "@qr/common";

function getBackgroundStyles(theme: any) {
  if (!theme?.background) return "background: #ffffff;";
  
  const bg = theme.background;
  
  // Handle new PageTheme format with type, gradient properties
  if (bg.type === "gradient" && bg.gradientFrom && bg.gradientTo) {
    // Convert Tailwind direction to CSS gradient direction
    const directionMap: Record<string, string> = {
      'to-br': 'to bottom right',
      'to-bl': 'to bottom left',
      'to-tr': 'to top right',
      'to-tl': 'to top left',
      'to-b': 'to bottom',
      'to-t': 'to top',
      'to-r': 'to right',
      'to-l': 'to left'
    };
    const direction = directionMap[bg.gradientDirection] || bg.gradientDirection || 'to bottom right';
    const via = bg.gradientVia ? `, ${bg.gradientVia}` : "";
    return `background: linear-gradient(${direction}, ${bg.gradientFrom}${via}, ${bg.gradientTo});`;
  }
  
  // Handle solid color
  if (bg.type === "solid" && bg.solidColor) {
    return `background: ${bg.solidColor};`;
  }
  
  // Fallback: if theme.background is just a string (old format)
  if (typeof bg === "string") {
    return `background: ${bg};`;
  }
  
  return "background: #ffffff;";
}

/**
 * Adjust color brightness (for gradient effects)
 * @param color - Hex color string (e.g., "#3b82f6")
 * @param percent - Percentage to adjust (-100 to 100, negative = darker)
 */
function adjustColorBrightness(color: string, percent: number): string {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  const adjust = (val: number) => {
    const adjusted = Math.round(val * (1 + percent / 100));
    return Math.max(0, Math.min(255, adjusted));
  };
  
  // Convert back to hex
  const toHex = (val: number) => val.toString(16).padStart(2, '0');
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

/**
 * Get text color from theme
 */
function getTextColor(theme: any) {
  return theme?.typography?.bodyColor || theme?.textColor || "#000000";
}

/**
 * Get title color from theme
 */
function getTitleColor(theme: any) {
  return theme?.typography?.titleColor || theme?.textColor || "#000000";
}

/**
 * Get font family from theme
 */
function getFontFamily(theme: any, type: 'title' | 'body' = 'body') {
  const fontMap: Record<string, string> = {
    'inter': 'ui-sans-serif, system-ui, sans-serif',
    'poppins': 'Poppins, ui-sans-serif, system-ui, sans-serif',
    'roboto': 'Roboto, ui-sans-serif, system-ui, sans-serif',
    'playfair': '"Playfair Display", ui-serif, Georgia, serif',
    'montserrat': 'Montserrat, ui-sans-serif, system-ui, sans-serif',
  };
  
  const fontKey = type === 'title' 
    ? theme?.typography?.titleFont 
    : theme?.typography?.bodyFont;
  
  return fontMap[fontKey] || fontMap['inter'];
}

export function renderMicrosite(site: any) {
  const { title, description, theme, links, layout } = site;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="theme-color" content="${theme?.branding?.primaryColor || '#ffffff'}" />

  <!-- Google Fonts -->
  <!-- Preconnect to CDNs for faster loading -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://cdn.tailwindcss.com">
  
  <!-- Google Fonts - Dynamic based on theme -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&family=Playfair+Display:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- Tailwind CSS - Consider self-hosting for production -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Microsite Interactive Features -->
  <script src="/static/microsite-client.js" defer></script>

  <title>${title}</title>

  <style>
    /* Critical CSS inlined for instant rendering */
    * {
      box-sizing: border-box;
    }
    
    body {
      ${getBackgroundStyles(theme)}
      color: ${getTextColor(theme)};
      font-family: ${getFontFamily(theme, 'body')};
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    h1, h2, h3, h4, h5, h6 {
      color: ${getTitleColor(theme)};
      font-family: ${getFontFamily(theme, 'title')};
    }
    
    /* Responsive typography */
    h1 {
      font-size: clamp(1.75rem, 5vw, 2.5rem);
    }
    
    h2 {
      font-size: clamp(1.5rem, 4vw, 2rem);
    }
    
    h3 {
      font-size: clamp(1.25rem, 3vw, 1.75rem);
    }
    
    p, li, span {
      font-size: clamp(0.875rem, 2.5vw, 1rem);
      line-height: 1.6;
    }
    
    /* Pricing toggle animations */
    .price-display {
      transition: opacity 0.15s ease-in-out, transform 0.15s ease-in-out;
    }
    
    .billing-toggle {
      position: relative;
    }
    
    /* Touch-friendly interactions - minimum 44x44px touch targets */
    .touch-manipulation,
    a, button, input, select, textarea {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      min-height: 44px;
      min-width: 44px;
    }
    
    /* Smooth scrolling */
    html {
      scroll-behavior: smooth;
    }
    
    /* Responsive images */
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
    
    /* Container queries for better responsiveness */
    @media (max-width: 640px) {
      .space-y-3 {
        gap: 0.5rem;
      }
      
      .space-y-4 {
        gap: 0.75rem;
      }
      
      /* Better touch targets on mobile */
      a, button {
        min-height: 44px; /* iOS recommended tap target */
      }
    }
    
    /* Tablet optimizations */
    @media (min-width: 641px) and (max-width: 1024px) {
      body {
        padding: 2rem 1.5rem;
      }
    }
    
    /* Desktop optimizations */
    @media (min-width: 1025px) {
      body {
        padding: 3rem 2rem;
      }
      
      /* Lock max width on very large screens for readability */
      body > div:first-child {
        max-width: 56rem !important; /* 896px */
      }
    }
    
    /* Performance optimizations */
    body {
      touch-action: manipulation; /* Faster tap response */
      overscroll-behavior-y: contain; /* Prevent pull-to-refresh bounce */
    }
    
    /* Prevent text overflow */
    .prose, p, div {
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    /* ═══════════════════════════════════════════════════════ */
    /* ENTRANCE ANIMATIONS - triggered by IntersectionObserver */
    /* ═══════════════════════════════════════════════════════ */
    
    .animate-on-scroll {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), 
                  transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .animate-on-scroll.is-visible {
      opacity: 1;
      transform: translateY(0);
    }
    
    .animate-on-scroll.animate-delay-1 { transition-delay: 0.1s; }
    .animate-on-scroll.animate-delay-2 { transition-delay: 0.2s; }
    .animate-on-scroll.animate-delay-3 { transition-delay: 0.3s; }
    .animate-on-scroll.animate-delay-4 { transition-delay: 0.4s; }

    /* ═══════════════════════════════════════════════════════ */
    /* HOVER EFFECTS & TRANSITIONS                             */
    /* ═══════════════════════════════════════════════════════ */
    
    /* Lift on hover */
    .hover-lift {
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), 
                  box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hover-lift:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px -8px rgba(0,0,0,0.15);
    }
    
    /* Scale on hover */
    .hover-scale {
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hover-scale:hover {
      transform: scale(1.03);
    }
    
    /* Glow pulse animation */
    @keyframes glow-pulse {
      0%, 100% { box-shadow: 0 0 0 3px var(--glow-color, rgba(139,92,246,0.15)), 0 0 24px var(--glow-color, rgba(139,92,246,0.25)); }
      50% { box-shadow: 0 0 0 5px var(--glow-color, rgba(139,92,246,0.25)), 0 0 40px var(--glow-color, rgba(139,92,246,0.4)); }
    }
    
    .glow-effect {
      animation: glow-pulse 3s ease-in-out infinite;
    }
    
    /* Avatar ring pulse */
    @keyframes ring-pulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(1.3); opacity: 0; }
    }
    
    .avatar-ring-pulse::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid var(--accent-color, #8b5cf6);
      animation: ring-pulse 2s ease-out infinite;
      pointer-events: none;
    }
    
    /* Gradient text shimmer */
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    
    .text-shimmer {
      background-size: 200% auto;
      animation: shimmer 3s linear infinite;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    /* Bounce animation for scroll indicator */
    @keyframes soft-bounce {
      0%, 100% { transform: translateY(0) translateX(-50%); }
      50% { transform: translateY(8px) translateX(-50%); }
    }
    
    .bounce-indicator {
      animation: soft-bounce 2s ease-in-out infinite;
    }
    
    /* Float animation */
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    
    .float-animation {
      animation: float 3s ease-in-out infinite;
    }
    
    /* Subtle fade-in for hero text */
    @keyframes hero-text-in {
      0% { opacity: 0; transform: translateY(20px); filter: blur(4px); }
      100% { opacity: 1; transform: translateY(0); filter: blur(0); }
    }
    
    .hero-block h1 {
      animation: hero-text-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
    }
    
    .hero-block h2 {
      animation: hero-text-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
    }
    
    .hero-block .hero-buttons {
      animation: hero-text-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both;
    }
    
    .hero-block .hero-badge {
      animation: hero-text-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
    }
    
    /* Profile block entrance */
    .profile-block .profile-avatar {
      animation: hero-text-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
    }
    
    .profile-block .profile-name {
      animation: hero-text-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
    }
    
    .profile-block .profile-bio {
      animation: hero-text-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
    }
    
    .profile-block .profile-location {
      animation: hero-text-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
    }
    
    /* Image hover effects */
    .image-hover-zoom {
      overflow: hidden;
    }
    .image-hover-zoom img {
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .image-hover-zoom:hover img {
      transform: scale(1.08);
    }
    
    /* Gallery image overlay on hover */
    .gallery-item {
      position: relative;
      overflow: hidden;
    }
    .gallery-item::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    .gallery-item:hover::after {
      opacity: 1;
    }
    .gallery-item img {
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .gallery-item:hover img {
      transform: scale(1.08);
    }
    .gallery-caption {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 16px;
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      z-index: 2;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .gallery-item:hover .gallery-caption {
      opacity: 1;
      transform: translateY(0);
    }
    
    /* Card hover with glass effect */
    .glass-card {
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    
    /* Button press effect */
    .btn-press {
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .btn-press:active {
      transform: scale(0.97);
    }
    
    /* Link button hover */
    .link-button-hover {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), 
                  box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  filter 0.2s ease;
    }
    .link-button-hover:hover {
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 8px 30px -6px rgba(0,0,0,0.2);
    }
    .link-button-hover:active {
      transform: translateY(0) scale(0.99);
    }
    
    /* Pricing card popular highlight */
    .pricing-popular {
      position: relative;
      z-index: 1;
    }
    .pricing-popular::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: inherit;
      background: linear-gradient(135deg, var(--accent-color, #8b5cf6), var(--accent-color-dark, #7c3aed));
      z-index: -1;
      opacity: 0.15;
    }
    
    /* Feature card hover */
    .feature-card {
      transition: transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease;
    }
    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px -8px rgba(0,0,0,0.12);
    }
    
    /* Stats counter glow */
    .stat-value {
      transition: transform 0.3s ease;
    }
    .stat-value:hover {
      transform: scale(1.05);
    }
    
    /* Footer link hover */
    .footer-link {
      position: relative;
      transition: color 0.2s ease;
    }
    .footer-link::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 0;
      height: 2px;
      background: var(--accent-color, #8b5cf6);
      transition: width 0.3s ease;
    }
    .footer-link:hover::after {
      width: 100%;
    }
    
    /* Social icon hover */
    .social-icon-hover {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .social-icon-hover:hover {
      transform: scale(1.15) translateY(-2px);
    }
    
    /* Testimonial card */
    .testimonial-card {
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .testimonial-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px -6px rgba(0,0,0,0.1);
    }
    
    /* Deals badge pulse */
    @keyframes badge-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .deals-badge {
      animation: badge-pulse 2s ease-in-out infinite;
    }
    
    /* Countdown digit flip effect */
    .countdown-digit {
      transition: transform 0.3s ease;
    }
    .countdown-digit:hover {
      transform: scale(1.08);
    }

    /* ═══ Menu Block Styles ═══ */
    .menu-category-tabs {
      display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;
    }
    .menu-category-tab {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem;
      font-weight: 500; cursor: pointer; border: none;
      transition: all 0.2s ease; white-space: nowrap;
    }
    .menu-category-tab:hover { transform: scale(1.05); }
    .menu-category-tab:active { transform: scale(0.95); }
    .menu-category-tab .tab-count {
      font-size: 0.75rem; padding: 0.125rem 0.375rem; border-radius: 9999px;
    }
    .menu-category-content { display: none; }
    .menu-category-content.active { display: block; }
    
    /* Elegant style */
    .menu-item-elegant {
      display: flex; gap: 1rem; padding: 1.25rem; border-radius: 1rem;
      transition: all 0.3s ease; border: 2px solid transparent;
    }
    .menu-item-elegant:hover {
      background-color: rgba(0,0,0,0.03); border-color: var(--accent-color, #6366f1)40;
      box-shadow: 0 8px 24px var(--accent-color, #6366f1)15;
    }
    .menu-item-elegant .item-image {
      width: 6rem; height: 6rem; border-radius: 0.75rem; overflow: hidden;
      flex-shrink: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .menu-item-elegant .item-image:hover { transform: scale(1.05); }
    .menu-item-elegant .item-image img { width: 100%; height: 100%; object-fit: cover; }

    /* Modern/Cards style */
    .menu-item-card {
      border-radius: 1rem; overflow: hidden; background: #fff;
      border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      transition: all 0.3s ease;
    }
    .menu-item-card:hover {
      transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.12);
    }
    .menu-item-card .card-image {
      aspect-ratio: 4/3; position: relative; overflow: hidden;
    }
    .menu-item-card .card-image img {
      width: 100%; height: 100%; object-fit: cover;
      transition: transform 0.5s ease;
    }
    .menu-item-card:hover .card-image img { transform: scale(1.1); }
    .menu-item-card .price-tag {
      position: absolute; bottom: 0.75rem; right: 0.75rem;
      padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.875rem;
      font-weight: 700; background: rgba(255,255,255,0.9); backdrop-filter: blur(8px);
    }
    .menu-item-card .badge-overlay {
      position: absolute; top: 0.75rem; left: 0.75rem;
      display: flex; flex-wrap: wrap; gap: 0.25rem;
    }

    /* Minimal style */
    .menu-item-minimal {
      display: flex; align-items: baseline; justify-content: space-between;
      gap: 1rem; padding: 0.75rem 0; transition: color 0.2s ease;
    }
    .menu-item-minimal .dotted-line {
      flex: 1; border-bottom: 1px dotted rgba(0,0,0,0.2); margin: 0 0.5rem;
    }

    /* Compact style */
    .menu-item-compact {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.5rem 0.75rem; border-radius: 0.5rem;
      transition: background-color 0.2s ease;
    }
    .menu-item-compact:hover {
      background-color: var(--accent-color-light, rgba(99,102,241,0.06));
    }
    .menu-item-compact .compact-image {
      width: 3rem; height: 3rem; border-radius: 0.5rem;
      object-fit: cover; flex-shrink: 0;
    }

    /* Photo-grid style */
    .menu-item-photo {
      position: relative; aspect-ratio: 1; border-radius: 1rem;
      overflow: hidden; cursor: pointer; transition: transform 0.3s ease;
    }
    .menu-item-photo:hover { transform: scale(1.03); }
    .menu-item-photo img {
      width: 100%; height: 100%; object-fit: cover;
    }
    .menu-item-photo .photo-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2), transparent);
      display: flex; flex-direction: column; justify-content: flex-end; padding: 1rem;
    }
    .menu-item-photo .photo-overlay h4 { color: #fff; font-weight: 600; }
    .menu-item-photo .photo-overlay .photo-price { color: rgba(255,255,255,0.8); font-size: 0.875rem; }

    /* Menu badge */
    .menu-badge {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.25rem 0.625rem; border-radius: 9999px;
      font-size: 0.75rem; font-weight: 700; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    /* Menu divider */
    .menu-divider {
      height: 1px; margin: 0 1rem; background-color: rgba(0,0,0,0.08);
    }

    /* Reduce motion for accessibility */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      .animate-on-scroll { opacity: 1; transform: none; }
    }
  </style>
</head>

<body class="min-h-screen flex flex-col items-center px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">

  <div class="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl">

    <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">${title}</h1>
    ${description && description.trim() && !description.startsWith('{') ? `<p class="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">${description}</p>` : ''}

    <!-- Links -->
    <div class="space-y-2 sm:space-y-3">
      ${
        links?.map(
          (l: any) => `
        <a 
          href="${l.url}" 
          target="_blank"
          class="block bg-blue-600 text-white rounded-lg py-3 text-center"
        >
          ${l.label}
        </a>`
        ).join("") || ""
      }
    </div>

    <!-- Layout Blocks -->
    <div class="mt-4 sm:mt-6 space-y-3 sm:space-y-4 md:space-y-6">
      ${
        layout?.map((block: any, index: number) => {
          const rendered = renderBlock(block, theme);
          if (!rendered) return "";
          // First 2 blocks visible immediately (above fold), rest animate on scroll
          if (index < 2) return rendered;
          const delayClass = `animate-delay-${Math.min((index % 4) + 1, 4)}`;
          return `<div class="animate-on-scroll ${delayClass}">${rendered}</div>`;
        }).join("") || ""
      }
    </div>

  </div>
</body>
</html>
`;
}

// Helper function to render layout blocks
function renderBlock(block: any, theme?: any) {
  const content = block.content || {};
  
  switch (block.type) {
    case "heading":
      const level = content.level || 1;
      const headingText = content.text || "Heading";
      const icon = content.icon || "";
      const iconPosition = content.iconPosition || "left";
      const gradient = content.gradient || "none";
      const textShadow = content.textShadow || "none";
      const decoration = content.decoration || "none";
      const animation = content.animation || "none";
      const marginTop = content.marginTop || 0;
      const marginBottom = content.marginBottom || 0;
      const lineHeight = content.lineHeight || 1.2;
      
      // Get theme primary color for headings
      const headingThemeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const headingThemeColorDark = adjustColorBrightness(headingThemeColor, -15);
      
      // Base classes
      const baseClass = level === 1 
        ? "text-3xl sm:text-4xl md:text-5xl font-bold" 
        : level === 2 
        ? "text-2xl sm:text-3xl md:text-4xl font-semibold" 
        : "text-xl sm:text-2xl md:text-3xl font-medium";
      
      // Gradient inline styles (using theme colors)
      const gradientStyles: Record<string, string> = {
        none: "",
        primary: `background: linear-gradient(to right, ${headingThemeColor}, ${headingThemeColorDark}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;`,
        rainbow: "background: linear-gradient(to right, #ec4899, #a855f7, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;",
        sunset: "background: linear-gradient(to right, #f97316, #ef4444, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;",
        ocean: "background: linear-gradient(to right, #3b82f6, #06b6d4, #14b8a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;",
        forest: "background: linear-gradient(to right, #22c55e, #10b981, #14b8a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;",
      };
      
      // Text shadow styles (using theme color for glow effects)
      const rgbMatch = headingThemeColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
      const themeRgb = rgbMatch ? `${parseInt(rgbMatch[1], 16)}, ${parseInt(rgbMatch[2], 16)}, ${parseInt(rgbMatch[3], 16)}` : "139, 92, 246";
      
      const shadowStyles: Record<string, string> = {
        none: "none",
        sm: "0 1px 2px rgba(0,0,0,0.1)",
        md: "0 2px 4px rgba(0,0,0,0.2)",
        lg: "0 4px 8px rgba(0,0,0,0.3)",
        glow: `0 0 10px rgba(${themeRgb}, 0.5), 0 0 20px rgba(${themeRgb}, 0.3)`,
        neon: `0 0 5px rgba(${themeRgb}, 0.8), 0 0 10px rgba(${themeRgb}, 0.6), 0 0 20px rgba(${themeRgb}, 0.4)`,
      };
      
      // Decoration inline styles (using theme color)
      const decorationStyles: Record<string, string> = {
        none: "",
        underline: `text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; text-decoration-color: ${headingThemeColor};`,
        wavy: `text-decoration: underline wavy; text-underline-offset: 4px; text-decoration-color: ${headingThemeColor};`,
        highlight: "background-color: rgba(253, 224, 71, 0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem;",
      };
      
      // Animation classes
      const animationClasses: Record<string, string> = {
        none: "",
        fadeIn: "animate-in fade-in duration-1000",
        slideLeft: "animate-in slide-in-from-left duration-700",
        slideRight: "animate-in slide-in-from-right duration-700",
        bounce: "animate-bounce",
        pulse: "animate-pulse",
      };
      
      const iconHtml = icon ? `<span class="inline-block ${iconPosition === 'above' || iconPosition === 'below' ? 'block' : ''} ${iconPosition === 'above' ? 'mb-2' : iconPosition === 'below' ? 'mt-2' : iconPosition === 'left' ? 'mr-2' : 'ml-2'}">${icon}</span>` : "";
      
      const headingContent = iconPosition === 'left' || iconPosition === 'above'
        ? `${iconHtml}${headingText}${iconPosition === 'right' || iconPosition === 'below' ? iconHtml : ''}`
        : `${headingText}${iconHtml}`;
      
      const classes = `${baseClass} ${animationClasses[animation]} ${iconPosition === 'above' || iconPosition === 'below' ? 'flex flex-col items-center' : ''}`.trim();
      
      const allStyles = `text-shadow: ${shadowStyles[textShadow]}; line-height: ${lineHeight}; margin-top: ${marginTop}px; margin-bottom: ${marginBottom}px; ${gradientStyles[gradient]} ${decorationStyles[decoration]}`;
      
      return `<h${level} class="${classes}" style="${allStyles}">${headingContent}</h${level}>`;
      
      
    case "text": {
      const html = content.html || content.text || "<p>Your text here...</p>";
      const styles = block.styles || {};
      const textStyle = content.textStyle || "";
      const dropCap = content.dropCap || false;
      const columns = content.columns || 1;
      const icon = content.icon || "";
      const iconPosition = content.iconPosition || "left";
      const textShadow = content.textShadow || "none";
      const borderStyle = content.borderStyle || "none";
      const borderColor = content.borderColor || "#8b5cf6";
      const containerPadding = content.containerPadding || "1rem";
      const authorName = content.authorName || "";
      const authorTitle = content.authorTitle || "";
      
      // Text shadow styles
      const shadowStyles: Record<string, string> = {
        none: "none",
        sm: "0 1px 2px rgba(0,0,0,0.1)",
        md: "0 2px 4px rgba(0,0,0,0.2)",
      };
      
      // Border classes
      const borderClasses: Record<string, string> = {
        none: "",
        left: "border-l-4",
        full: "border-2",
        dashed: "border-2 border-dashed",
      };
      
      // Column classes
      const columnClasses: Record<number, string> = {
        1: "",
        2: "sm:columns-2 gap-6",
        3: "sm:columns-2 lg:columns-3 gap-6",
      };
      
      // Get theme color for text decorations
      const textThemeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const textThemeColorLight = adjustColorBrightness(textThemeColor, 90);
      
      // Container classes based on text style - using inline styles for theme colors
      const styleClasses: Record<string, string> = {
        body: "",
        quote: "italic pl-6 py-2",
        callout: "font-bold bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg",
        small: "text-sm text-gray-600",
      };
      
      // Build container classes
      const containerClassParts = [
        "prose prose-sm max-w-none",
        columnClasses[columns],
        textStyle ? styleClasses[textStyle] : "",
        borderStyle !== "none" ? borderClasses[borderStyle] : "",
        dropCap ? "first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none" : "",
      ];
      const containerClass = containerClassParts.filter(Boolean).join(" ");
      
      // Container inline styles
      const stylesParts = [];
      if (styles?.alignment) stylesParts.push(`text-align: ${styles.alignment}`);
      if (styles?.color) stylesParts.push(`color: ${styles.color}`);
      if (styles?.fontFamily) stylesParts.push(`font-family: ${styles.fontFamily}`);
      if (styles?.fontSize) stylesParts.push(`font-size: ${styles.fontSize}`);
      if (styles?.fontWeight) stylesParts.push(`font-weight: ${styles.fontWeight}`);
      if (styles?.lineHeight) stylesParts.push(`line-height: ${styles.lineHeight}`);
      if (styles?.letterSpacing) stylesParts.push(`letter-spacing: ${styles.letterSpacing}`);
      if (textShadow !== "none") stylesParts.push(`text-shadow: ${shadowStyles[textShadow]}`);
      if (styles?.backgroundColor || borderStyle !== "none") {
        stylesParts.push(`padding: ${containerPadding}`);
        stylesParts.push(`border-radius: 0.5rem`);
      }
      if (styles?.backgroundColor) stylesParts.push(`background-color: ${styles.backgroundColor}`);
      if (borderStyle !== "none") stylesParts.push(`border-color: ${borderColor}`);
      if (textStyle === "quote") stylesParts.push(`border-left: 4px solid ${textThemeColor}`);
      if (dropCap) stylesParts.push(`first-letter-color: ${textThemeColor}`);
      
      const containerStyles = stylesParts.length > 0 ? ` style="${stylesParts.join("; ")}"` : "";
      
      // Build icon HTML
      let iconHtml = "";
      if (icon) {
        if (iconPosition === "float") {
          iconHtml = `<span class="absolute -left-8 top-0 text-3xl opacity-30">${icon}</span>`;
        } else if (iconPosition === "top") {
          iconHtml = `<div class="text-center mb-3"><span class="text-4xl inline-block">${icon}</span></div>`;
        }
      }
      
      // Build attribution HTML
      let attributionHtml = "";
      if (textStyle === "quote" && (authorName || authorTitle)) {
        const initial = authorName ? authorName.charAt(0).toUpperCase() : "?";
        attributionHtml = `
          <div class="mt-4 flex items-center gap-3 text-sm">
            <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold" style="background-color: ${textThemeColorLight}; color: ${textThemeColor};">
              ${initial}
            </div>
            <div>
              ${authorName ? `<div class="font-semibold text-gray-900">${authorName}</div>` : ""}
              ${authorTitle ? `<div class="text-xs text-gray-600">${authorTitle}</div>` : ""}
            </div>
          </div>
        `;
      }
      
      // Build final HTML
      if (icon && (iconPosition === "float" || iconPosition === "top")) {
        return `
          <div class="relative">
            ${iconHtml}
            <div class="${containerClass}"${containerStyles}>${html}</div>
            ${attributionHtml}
          </div>
        `;
      } else if (icon && iconPosition === "left") {
        return `
          <div class="flex items-start gap-3">
            <span class="text-2xl flex-shrink-0 mt-1">${icon}</span>
            <div class="flex-1">
              <div class="${containerClass}"${containerStyles}>${html}</div>
              ${attributionHtml}
            </div>
          </div>
        `;
      } else {
        return `
          <div class="${containerClass}"${containerStyles}>${html}</div>
          ${attributionHtml}
        `;
      }
    }
      
      
    case "image": {
      const imgUrl = content.url || content.src || "";
      const imgAlt = content.alt || "";
      const imgWidth = content.width === 'custom' ? `${content.customWidth || 100}%` : content.width || '100%';
      const imgAlignment = content.alignment || 'center';
      const imgHeightMode = content.heightMode || 'auto';
      const imgFixedHeight = content.fixedHeight || 300;
      const imgShadow = content.shadow || 'none';
      const imgHoverEffect = content.hoverEffect || 'none';
      const imgFilter = content.filter || 'none';
      const imgBorderStyle = content.borderStyle || 'none';
      const imgBorderWidth = content.borderWidth || 2;
      const imgBorderColor = content.borderColor || '#000000';
      const imgOpacity = content.opacity ?? 100;
      const imgCaption = content.caption || '';
      const imgLink = content.link || '';
      const imgOpenInNewTab = content.openInNewTab ?? false;
      const imgLightbox = content.lightbox ?? false;
      const imgLazyLoad = content.lazyLoad ?? true;
      const imgMarginTop = content.marginTop || 0;
      const imgMarginBottom = content.marginBottom || 0;
      const objectFit = block.styles?.objectFit || 'cover';
      const borderRadius = block.styles?.borderRadius || '0.5rem';
      const aspectRatioLock = content.aspectRatioLock ?? true;

      // Shadow classes
      const shadowClasses: Record<string, string> = {
        none: '',
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg',
        xl: 'shadow-xl',
        glow: 'shadow-[0_0_20px_rgba(139,92,246,0.5)]'
      };

      // Hover effect classes
      const hoverEffectClasses: Record<string, string> = {
        none: '',
        zoom: 'hover:scale-105',
        lift: 'hover:-translate-y-2 hover:shadow-xl',
        brightness: 'hover:brightness-110',
        grayscale: 'grayscale hover:grayscale-0',
        blur: 'hover:blur-sm'
      };

      // Filter classes
      const filterClasses: Record<string, string> = {
        none: '',
        grayscale: 'grayscale',
        sepia: 'sepia',
        blur: 'blur-sm',
        brightness: 'brightness-110',
        contrast: 'contrast-125'
      };

      // Alignment classes
      const alignmentClasses: Record<string, string> = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end'
      };

      const imgClasses = `max-w-full transition-all duration-300 ${shadowClasses[imgShadow]} ${hoverEffectClasses[imgHoverEffect]} ${filterClasses[imgFilter]}`;
      
      const borderStyle = imgBorderStyle !== 'none' ? `border: ${imgBorderWidth}px ${imgBorderStyle} ${imgBorderColor};` : '';
      const heightStyle = imgHeightMode === 'fixed' ? `height: ${imgFixedHeight}px;` : 'height: auto;';
      const objectFitStyle = aspectRatioLock ? `object-fit: ${objectFit};` : 'object-fit: fill;';
      
      const imgStyles = `
        ${objectFitStyle}
        ${heightStyle}
        width: 100%;
        border-radius: ${borderRadius};
        ${borderStyle}
        opacity: ${imgOpacity / 100};
      `;

      const imgElement = imgUrl 
        ? `<img src="${imgUrl}" alt="${imgAlt}" loading="${imgLazyLoad ? 'lazy' : 'eager'}" class="${imgClasses}" style="${imgStyles}" />`
        : `<div class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
             <p>No image URL set</p>
           </div>`;

      let wrappedImg = imgElement;
      
      if (imgLink && !imgLightbox) {
        wrappedImg = `<a href="${imgLink}" ${imgOpenInNewTab ? 'target="_blank" rel="noopener noreferrer"' : ''} class="inline-block hover:opacity-90 transition-opacity">${imgElement}</a>`;
      } else if (imgLightbox && imgUrl) {
        wrappedImg = `<a href="${imgUrl}" target="_blank" rel="noopener noreferrer" class="inline-block hover:opacity-90 transition-opacity">${imgElement}</a>`;
      }

      const captionHtml = imgCaption ? `<p class="text-sm text-gray-600 mt-2 text-center italic">${imgCaption}</p>` : '';

      return `
        <div class="flex ${alignmentClasses[imgAlignment]}" style="margin-top: ${imgMarginTop}px; margin-bottom: ${imgMarginBottom}px;">
          <div style="width: ${imgWidth};">
            ${wrappedImg}
            ${captionHtml}
          </div>
        </div>
      `;
    }
      
    case "button": {
      const btnLabel = content.label || "Click me";
      const btnUrl = content.url || "#";
      const btnVariant = content.variant || block.style?.variant || "fill";
      const btnSize = content.size || block.style?.size || "medium";
      const btnIcon = content.icon || "";
      const btnIconPosition = content.iconPosition || block.style?.iconPosition || "left";
      const btnBorderRadius = content.borderRadius ?? block.style?.borderRadius ?? 8;
      const btnWidth = content.width || "full";
      const btnShadow = content.shadow || block.style?.shadow || "none";
      const btnHoverEffect = content.hoverEffect || "lift";
      const btnOpenInNewTab = content.openInNewTab ?? false;
      const btnActionType = content.actionType || "url";
      const btnAlignment = content.alignment || "center";
      const btnAnimation = content.animation || block.style?.animation || "none";
      const btnHelperText = content.helperText || "";
      const btnCustomBgColor = content.customBgColor || block.style?.backgroundColor || "";
      const btnCustomTextColor = content.customTextColor || block.style?.textColor || "";
      const btnCustomBorderColor = content.customBorderColor || block.style?.borderColor || "";
      
      // Get theme colors for button
      const themeBtnBg = theme?.button?.backgroundColor || theme?.branding?.primaryColor || "#3b82f6";
      const themeBtnText = theme?.button?.textColor || "#ffffff";
      
      // Build href based on action type
      let href = btnUrl || "#";
      if (btnUrl) {
        if (btnActionType === "phone") {
          href = `tel:${btnUrl.replace(/\s/g, "")}`;
        } else if (btnActionType === "email") {
          href = `mailto:${btnUrl}`;
        } else if (btnActionType === "download") {
          href = btnUrl;
        }
      }
      
      // Alignment styles
      const btnAlignmentStyles: Record<string, string> = {
        left: "justify-start",
        center: "justify-center",
        right: "justify-end",
      };
      
      // Size styles
      const btnSizeStyles: Record<string, string> = {
        small: "px-4 py-2 text-sm",
        medium: "px-6 py-3 text-base",
        large: "px-8 py-4 text-lg",
      };
      
      // Shadow styles
      const btnShadowStyles: Record<string, string> = {
        none: "",
        sm: "shadow-sm",
        md: "shadow-md",
        lg: "shadow-lg",
      };
      
      // Width styles
      const btnWidthStyles: Record<string, string> = {
        auto: "inline-block",
        full: "w-full",
        "75%": "w-3/4",
      };
      
      // Hover effect classes
      const btnHoverEffectStyles: Record<string, string> = {
        none: "",
        lift: "hover:-translate-y-1",
        glow: "hover:shadow-lg",
        scale: "hover:scale-105",
      };

      // Animation styles
      const btnAnimationStyles: Record<string, string> = {
        none: "",
        fadeIn: "animate-in fade-in duration-1000",
        slideUp: "animate-in slide-in-from-bottom-4 duration-700",
        bounce: "animate-bounce",
      };
      
      // Build inline styles based on variant and custom colors
      const customStylesParts = [];
      customStylesParts.push(`border-radius: ${btnBorderRadius}px`);
      
      // Use custom colors if provided, otherwise use theme colors
      const finalBgColor = btnCustomBgColor || themeBtnBg;
      const finalTextColor = btnCustomTextColor || themeBtnText;
      const finalBorderColor = btnCustomBorderColor || finalBgColor;
      
      if (btnVariant === "fill") {
        customStylesParts.push(`background-color: ${finalBgColor}`);
        customStylesParts.push(`color: ${finalTextColor}`);
        customStylesParts.push(`border: 2px solid ${finalBgColor}`);
      } else if (btnVariant === "outline") {
        customStylesParts.push(`background-color: transparent`);
        customStylesParts.push(`color: ${finalBgColor}`);
        customStylesParts.push(`border: 2px solid ${finalBgColor}`);
      } else if (btnVariant === "soft") {
        // Create a lighter tint of the button color (10% opacity)
        customStylesParts.push(`background-color: ${finalBgColor}1A`); // 1A = 10% opacity in hex
        customStylesParts.push(`color: ${finalBgColor}`);
        customStylesParts.push(`border: 2px solid ${finalBgColor}33`); // 33 = 20% opacity
      } else if (btnVariant === "gradient") {
        // Create gradient from theme color to a slightly darker shade
        customStylesParts.push(`background: linear-gradient(135deg, ${finalBgColor}, ${adjustColorBrightness(finalBgColor, -20)})`);
        customStylesParts.push(`color: ${finalTextColor}`);
        customStylesParts.push(`border: 2px solid transparent`);
      } else if (btnVariant === "glass") {
        customStylesParts.push(`background-color: rgba(255, 255, 255, 0.1)`);
        customStylesParts.push(`backdrop-filter: blur(10px)`);
        customStylesParts.push(`color: ${getTextColor(theme)}`);
        customStylesParts.push(`border: 2px solid rgba(255, 255, 255, 0.2)`);
      } else if (btnVariant === "shadow") {
        customStylesParts.push(`background-color: #ffffff`);
        customStylesParts.push(`color: ${finalBgColor}`);
        customStylesParts.push(`border: 2px solid #e5e7eb`);
      }
      
      const customStylesStr = customStylesParts.join("; ");
      
      // Build button classes (without variant-specific colors, those are in inline styles)
      const btnClasses = [
        btnSizeStyles[btnSize],
        btnShadowStyles[btnShadow],
        btnHoverEffectStyles[btnHoverEffect],
        btnAnimationStyles[btnAnimation],
        "font-semibold transition-all duration-300 flex items-center justify-center gap-2 no-underline cursor-pointer",
        btnWidthStyles[btnWidth],
      ].filter(Boolean).join(" ");
      
      const btnIconHTML = btnIcon ? (btnIconPosition === "left" 
        ? `<span class="text-lg">${btnIcon}</span> <span>${btnLabel}</span>`
        : `<span>${btnLabel}</span> <span class="text-lg">${btnIcon}</span>`) 
        : `<span>${btnLabel}</span>`;
      
      return `
        <div class="flex ${btnAlignmentStyles[btnAlignment]} w-full">
          <div class="${btnWidthStyles[btnWidth]}">
            <a 
              href="${href}" 
              ${btnOpenInNewTab ? 'target="_blank" rel="noopener noreferrer"' : ''}
              ${btnActionType === "download" ? 'download' : ''}
              class="${btnClasses}"
              style="${customStylesStr}"
            >
              ${btnIconHTML}
            </a>
            ${btnHelperText ? `<p class="text-xs text-gray-600 mt-2 text-center">${btnHelperText}</p>` : ""}
          </div>
        </div>
      `;
    }
      
      
    case "video":
      const videoUrl = content.url || "";
      const aspectRatio = content.aspectRatio || "56.25%";
      const width = content.width || "100%";
      const alignment = content.alignment || "center";
      const caption = content.caption || "";
      const autoplay = content.autoplay || false;
      const loop = content.loop || false;
      const muted = content.muted || false;
      const hideControls = content.hideControls || false;
      const startTime = content.startTime || 0;
      const privacyMode = content.privacyMode || false;
      const lazyLoad = content.lazyLoad ?? true;
      const noRelated = content.noRelated || false;

      // Extract video ID and build embed URL
      const getEmbedUrl = (url: string): string => {
        if (!url) return "";

        try {
          // YouTube
          if (url.includes("youtube.com") || url.includes("youtu.be")) {
            let videoId = "";

            if (url.includes("youtu.be/")) {
              videoId = url.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0] || "";
            } else if (url.includes("youtube.com/embed/")) {
              videoId = url.split("embed/")[1]?.split("?")[0]?.split("&")[0] || "";
            } else if (url.includes("v=")) {
              videoId = url.split("v=")[1]?.split("&")[0] || "";
            }

            if (videoId) {
              const domain = privacyMode ? "youtube-nocookie.com" : "youtube.com";
              const params = new URLSearchParams();

              if (autoplay) params.append("autoplay", "1");
              if (loop) {
                params.append("loop", "1");
                params.append("playlist", videoId);
              }
              if (muted) params.append("mute", "1");
              if (hideControls) params.append("controls", "0");
              if (startTime > 0) params.append("start", startTime.toString());
              if (noRelated) params.append("rel", "0");

              const queryString = params.toString();
              return `https://www.${domain}/embed/${videoId}${queryString ? "?" + queryString : ""}`;
            }
          }

          // Vimeo
          if (url.includes("vimeo.com")) {
            let videoId = "";

            if (url.includes("player.vimeo.com/video/")) {
              videoId = url.split("video/")[1]?.split("?")[0] || "";
            } else {
              videoId = url.split("vimeo.com/")[1]?.split("?")[0]?.split("/")[0] || "";
            }

            if (videoId) {
              const params = new URLSearchParams();

              if (autoplay) params.append("autoplay", "1");
              if (loop) params.append("loop", "1");
              if (muted) params.append("muted", "1");
              if (hideControls) params.append("controls", "0");

              const queryString = params.toString();
              let vimeoUrl = `https://player.vimeo.com/video/${videoId}${queryString ? "?" + queryString : ""}`;

              if (startTime > 0) {
                vimeoUrl += `#t=${startTime}s`;
              }

              return vimeoUrl;
            }
          }
        } catch (error) {
          logger.error({ err: error }, "Error parsing video URL");
        }

        return "";
      };

      const embedUrl = getEmbedUrl(videoUrl);

      // Alignment styles
      const alignStyle =
        alignment === "left"
          ? "margin-left: 0; margin-right: auto;"
          : alignment === "right"
          ? "margin-left: auto; margin-right: 0;"
          : "margin-left: auto; margin-right: auto;";

      if (!embedUrl) {
        return `
          <div style="max-width: ${width}; ${alignStyle}">
            <div style="position: relative; width: 100%; padding-top: ${aspectRatio}; background: rgba(0,0,0,0.05); border-radius: 8px; border: 1px solid rgba(0,0,0,0.1);">
              <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 16px;">
                <p style="margin-bottom: 8px;">📹 Video Block</p>
                <p style="font-size: 12px; opacity: 0.7;">No video URL provided</p>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div style="max-width: ${width}; ${alignStyle}">
          <div style="position: relative; width: 100%; padding-top: ${aspectRatio}; background: rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; border: 1px solid rgba(0,0,0,0.1);">
            <iframe 
              src="${embedUrl}"
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              ${lazyLoad ? 'loading="lazy"' : ""}
              title="${caption || "Embedded video"}"
            ></iframe>
          </div>
          ${
            caption
              ? `<p style="font-size: 14px; color: rgba(0,0,0,0.6); margin-top: 8px; text-align: center;">${caption}</p>`
              : ""
          }
        </div>
      `;
      
    case "socialLinks":
      // Legacy alias - delegate to the "social" block renderer
      return renderBlock({ ...block, type: "social" }, theme);
      
    case "faq":
      const faqItems = content.items || [];
      const allowMultiple = content.allowMultiple || false;
      const enableSearch = content.enableSearch || false;
      const showCategories = content.showCategories || false;
      const iconStyle = content.iconStyle || 'chevron';
      
      // Generate SEO schema.org FAQPage markup
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqItems.map((item: any) => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": (item.answer || "").replace(/<[^>]*>/g, '') // Strip HTML tags for schema
          }
        }))
      };
      
      // Group items by category if enabled
      const categories = showCategories
        ? Array.from(new Set(faqItems.map((item: any) => item.category || 'General')))
        : ['All'];
        
      const itemsByCategory: Record<string, any[]> = showCategories
        ? (categories as string[]).reduce((acc: Record<string, any[]>, cat: string) => {
            acc[cat] = faqItems.filter((item: any) => (item.category || 'General') === cat);
            return acc;
          }, {} as Record<string, any[]>)
        : { 'All': faqItems };
      
      // Get icon SVG based on style
      const getIconSVG = (style: string) => {
        if (style === 'plus') {
          return `
            <svg class="faq-icon-plus w-5 h-5 text-gray-500 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <svg class="faq-icon-minus w-5 h-5 text-gray-500 transition-transform duration-300 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
            </svg>
          `;
        } else if (style === 'arrow') {
          return `
            <svg class="w-5 h-5 text-gray-500 transition-transform duration-300" data-faq-icon fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          `;
        } else {
          // Default chevron
          return `
            <svg class="w-5 h-5 text-gray-500 transition-transform duration-300" data-faq-icon fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          `;
        }
      };
      
      return `
        <!-- SEO Schema.org FAQPage markup -->
        <script type="application/ld+json">
          ${JSON.stringify(faqSchema)}
        </script>
        
        <div class="space-y-4" data-faq-container data-faq-allow-multiple="${allowMultiple}" data-faq-icon-style="${iconStyle}">
          ${enableSearch ? `
            <div class="relative">
              <input
                type="text"
                placeholder="Search questions..."
                class="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                data-faq-search
              />
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          ` : ''}
          
          ${Object.entries(itemsByCategory).map(([category, categoryItems]: [string, any]) => {
            if (!categoryItems || categoryItems.length === 0) return '';
            
            return `
              <div class="space-y-3">
                ${showCategories ? `
                  <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide px-2">
                    ${category}
                  </h3>
                ` : ''}
                
                ${categoryItems.map((item: any, index: number) => `
                  <div 
                    class="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors" 
                    data-faq-item 
                    data-faq-open="${item.openByDefault || item.isOpen || false}"
                    data-faq-category="${item.category || 'General'}"
                  >
                    <div 
                      class="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors" 
                      data-faq-question
                      role="button"
                      aria-expanded="${item.openByDefault || item.isOpen || false}"
                      tabindex="0"
                    >
                      <h3 class="font-semibold text-gray-900 text-sm sm:text-base pr-4">${item.question || ""}</h3>
                      ${getIconSVG(iconStyle)}
                    </div>
                    <div 
                      class="overflow-hidden transition-all duration-300" 
                      data-faq-answer 
                      style="max-height: ${item.openByDefault || item.isOpen ? '384px' : '0'}; opacity: ${item.openByDefault || item.isOpen ? '1' : '0'};"
                      role="region"
                      aria-hidden="${!(item.openByDefault || item.isOpen)}"
                    >
                      <div class="p-4 pt-0 text-gray-600 text-sm sm:text-base leading-relaxed prose prose-sm max-w-none">
                        ${item.answer || ""}
                      </div>
                    </div>
                  </div>
                `).join("")}
              </div>
            `;
          }).join("")}
        </div>
        
        <!-- FAQ Interactivity Script -->
        <script>
          (function() {
            const container = document.querySelector('[data-faq-container]');
            if (!container) return;
            
            const allowMultiple = container.getAttribute('data-faq-allow-multiple') === 'true';
            const iconStyle = container.getAttribute('data-faq-icon-style');
            const searchInput = container.querySelector('[data-faq-search]');
            
            // Toggle FAQ item
            function toggleItem(item, forceOpen) {
              const answer = item.querySelector('[data-faq-answer]');
              const question = item.querySelector('[data-faq-question]');
              const icon = question.querySelector('[data-faq-icon], .faq-icon-plus, .faq-icon-minus');
              const isOpen = item.getAttribute('data-faq-open') === 'true';
              const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;
              
              if (!allowMultiple && shouldOpen) {
                // Close all other items
                container.querySelectorAll('[data-faq-item]').forEach(otherItem => {
                  if (otherItem !== item && otherItem.getAttribute('data-faq-open') === 'true') {
                    toggleItem(otherItem, false);
                  }
                });
              }
              
              item.setAttribute('data-faq-open', shouldOpen.toString());
              question.setAttribute('aria-expanded', shouldOpen.toString());
              answer.setAttribute('aria-hidden', (!shouldOpen).toString());
              answer.style.maxHeight = shouldOpen ? '384px' : '0';
              answer.style.opacity = shouldOpen ? '1' : '0';
              
              // Handle different icon styles
              if (iconStyle === 'plus') {
                const plusIcon = question.querySelector('.faq-icon-plus');
                const minusIcon = question.querySelector('.faq-icon-minus');
                if (plusIcon && minusIcon) {
                  plusIcon.classList.toggle('hidden', shouldOpen);
                  minusIcon.classList.toggle('hidden', !shouldOpen);
                }
              } else if (iconStyle === 'arrow') {
                if (icon) {
                  icon.style.transform = shouldOpen ? 'rotate(90deg)' : 'rotate(0deg)';
                }
              } else {
                if (icon) {
                  icon.style.transform = shouldOpen ? 'rotate(180deg)' : 'rotate(0deg)';
                }
              }
            }
            
            // Add click handlers
            container.querySelectorAll('[data-faq-item]').forEach(item => {
              const question = item.querySelector('[data-faq-question]');
              question.addEventListener('click', () => toggleItem(item));
              question.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleItem(item);
                }
              });
            });
            
            // Search functionality
            if (searchInput) {
              searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                container.querySelectorAll('[data-faq-item]').forEach(item => {
                  const question = item.querySelector('[data-faq-question] h3').textContent.toLowerCase();
                  const answer = item.querySelector('[data-faq-answer] div').textContent.toLowerCase();
                  const category = item.getAttribute('data-faq-category').toLowerCase();
                  const matches = question.includes(query) || answer.includes(query) || category.includes(query);
                  item.style.display = matches ? 'block' : 'none';
                });
              });
            }
          })();
        </script>
      `;
      
      
    case "gallery":
      const galleryImages = content.images || [];
      const galleryLayout = content.layout || "grid";
      const galleryColumns = content.columns || 3;
      const galleryMobileColumns = content.mobileColumns || 1;
      const galleryTabletColumns = content.tabletColumns || 2;
      const galleryGap = content.gap || "normal";
      const galleryAspectRatio = content.aspectRatio || "square";
      const galleryHoverEffect = content.hoverEffect || "zoom";
      const galleryBorderRadius = content.borderRadius || 8;
      const galleryLazyLoad = content.lazyLoad ?? true;
      const galleryShowCaptions = content.showCaptions ?? false;
      const galleryImageFilter = content.imageFilter || "none";
      const galleryRemoveFilterOnHover = content.removeFilterOnHover ?? true;
      const galleryOverlayColor = content.overlayColor || "#000000";
      const galleryOverlayOpacity = content.overlayOpacity ?? 0;
      const galleryRemoveOverlayOnHover = content.removeOverlayOnHover ?? true;
      
      // Get theme color for gallery badges and dots
      const galleryThemeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      
      const galleryGapClass = galleryGap === "tight" ? "gap-2" : galleryGap === "loose" ? "gap-6" : "gap-4";
      
      // Responsive grid columns
      const galleryMobileClass = galleryMobileColumns === 2 ? "grid-cols-2" : "grid-cols-1";
      const galleryTabletClass = galleryTabletColumns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
      const galleryDesktopClass = galleryColumns === 2 ? "md:grid-cols-2" : galleryColumns === 4 ? "md:grid-cols-4" : "md:grid-cols-3";
      const galleryGridCols = `${galleryMobileClass} ${galleryTabletClass} ${galleryDesktopClass}`;
      
      const galleryAspectClass = 
        galleryAspectRatio === "square" ? "aspect-square" :
        galleryAspectRatio === "landscape" ? "aspect-video" :
        galleryAspectRatio === "portrait" ? "aspect-[3/4]" :
        "";
      
      const galleryObjectFit = galleryAspectRatio === "auto" ? "object-contain" : "object-cover";
      
      let galleryHoverStyles = "";
      if (galleryHoverEffect === "zoom") {
        galleryHoverStyles = "hover:scale-110";
      } else if (galleryHoverEffect === "lift") {
        galleryHoverStyles = "hover:scale-105 hover:shadow-xl";
      } else if (galleryHoverEffect === "brightness") {
        galleryHoverStyles = "hover:brightness-110";
      }
      
      // Image filters
      let galleryFilterClass = "";
      if (galleryImageFilter === "grayscale") {
        galleryFilterClass = "grayscale";
        if (galleryRemoveFilterOnHover) galleryFilterClass += " hover:grayscale-0";
      } else if (galleryImageFilter === "sepia") {
        galleryFilterClass = "sepia";
        if (galleryRemoveFilterOnHover) galleryFilterClass += " hover:sepia-0";
      } else if (galleryImageFilter === "blur") {
        galleryFilterClass = "blur-sm";
        if (galleryRemoveFilterOnHover) galleryFilterClass += " hover:blur-0";
      }
      
      // Overlay styles
      const galleryOverlayOpacityHex = Math.round((galleryOverlayOpacity / 100) * 255).toString(16).padStart(2, '0');
      const galleryOverlayStyle = galleryOverlayOpacity > 0 
        ? `background-color: ${galleryOverlayColor}${galleryOverlayOpacityHex};` 
        : "";
      const galleryOverlayHoverClass = galleryRemoveOverlayOnHover ? "group-hover:opacity-0" : "";


      // Grid Layout
      if (galleryLayout === "grid") {
        return `
          <div class="grid ${galleryGridCols} ${galleryGapClass}">
            ${galleryImages.map((img: any) => {
              const hasLink = img.link && img.link.trim() !== '';
              const wrapperTag = hasLink ? 'a' : 'div';
              const wrapperAttrs = hasLink ? `href="${img.link}" target="_blank" rel="noopener noreferrer"` : '';
              
              return `
                <${wrapperTag} ${wrapperAttrs} class="gallery-item group relative ${galleryAspectClass} overflow-hidden transition-all duration-300 ${hasLink ? 'cursor-pointer' : ''}" style="border-radius: ${galleryBorderRadius}px;">
                  ${img.url ? `
                    <img 
                      src="${img.url}" 
                      alt="${img.alt || ""}"
                      title="${img.title || img.alt || ""}"
                      ${galleryLazyLoad ? 'loading="lazy"' : ""}
                      class="w-full h-full ${galleryObjectFit} transition-all duration-500 ${galleryHoverStyles} ${galleryFilterClass}"
                    />
                    ${galleryOverlayOpacity > 0 ? `
                      <div class="absolute inset-0 pointer-events-none transition-opacity duration-300 ${galleryOverlayHoverClass}" style="${galleryOverlayStyle}"></div>
                    ` : ""}
                    ${img.badge ? `
                      <div class="absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded-md shadow-lg z-10 ${
                        img.badge === 'NEW' ? 'bg-green-500 text-white' :
                        img.badge === 'SALE' ? 'bg-red-500 text-white' :
                        img.badge === 'HOT' ? 'bg-orange-500 text-white' : 'text-white'
                      }" ${img.badge === 'FEATURED' ? `style="background-color: ${galleryThemeColor};"` : ''}>
                        ${img.badge}
                      </div>
                    ` : ""}
                    ${img.title ? `
                      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <div class="text-white">
                          <h3 class="text-sm font-bold mb-0.5">${img.title}</h3>
                          ${img.caption ? `<p class="text-xs opacity-90">${img.caption}</p>` : ''}
                        </div>
                      </div>
                    ` : galleryShowCaptions && img.caption ? `
                      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p class="text-xs text-white">${img.caption}</p>
                      </div>
                    ` : ""}
                    ${hasLink ? `
                      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div class="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <svg class="w-4 h-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </div>
                    ` : ""}
                  ` : ""}
                </${wrapperTag}>
              `;
            }).join("")}
          </div>
        `;
      }

      // Masonry Layout
      if (galleryLayout === "masonry") {
        return `
          <div class="columns-${galleryMobileColumns} sm:columns-${galleryTabletColumns} md:columns-${galleryColumns} ${galleryGapClass}">
            ${galleryImages.map((img: any) => {
              const hasLink = img.link && img.link.trim() !== '';
              const wrapperTag = hasLink ? 'a' : 'div';
              const wrapperAttrs = hasLink ? `href="${img.link}" target="_blank" rel="noopener noreferrer"` : '';
              
              return `
                <${wrapperTag} ${wrapperAttrs} class="group relative overflow-hidden transition-all duration-300 break-inside-avoid mb-${galleryGap === 'tight' ? '2' : galleryGap === 'loose' ? '6' : '4'} ${hasLink ? 'cursor-pointer' : ''}" style="border-radius: ${galleryBorderRadius}px;">
                  ${img.url ? `
                    <img 
                      src="${img.url}" 
                      alt="${img.alt || ""}"
                      title="${img.title || img.alt || ""}"
                      ${galleryLazyLoad ? 'loading="lazy"' : ""}
                      class="w-full transition-all duration-500 ${galleryHoverStyles} ${galleryFilterClass}"
                    />
                    ${galleryOverlayOpacity > 0 ? `
                      <div class="absolute inset-0 pointer-events-none transition-opacity duration-300 ${galleryOverlayHoverClass}" style="${galleryOverlayStyle}"></div>
                    ` : ""}
                    ${img.badge ? `
                      <div class="absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded-md shadow-lg z-10 ${
                        img.badge === 'NEW' ? 'bg-green-500 text-white' :
                        img.badge === 'SALE' ? 'bg-red-500 text-white' :
                        img.badge === 'HOT' ? 'bg-orange-500 text-white' : 'text-white'
                      }" ${img.badge === 'FEATURED' ? `style="background-color: ${galleryThemeColor};"` : ''}>
                        ${img.badge}
                      </div>
                    ` : ""}
                    ${img.title ? `
                      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <div class="text-white">
                          <h3 class="text-sm font-bold mb-0.5">${img.title}</h3>
                          ${img.caption ? `<p class="text-xs opacity-90">${img.caption}</p>` : ''}
                        </div>
                      </div>
                    ` : galleryShowCaptions && img.caption ? `
                      <div class="bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p class="text-xs text-white">${img.caption}</p>
                      </div>
                    ` : ""}
                    ${hasLink ? `
                      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div class="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <svg class="w-4 h-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </div>
                    ` : ""}
                  ` : ""}
                </${wrapperTag}>
              `;
            }).join("")}
          </div>
        `;
      }

      // Carousel Layout
      if (galleryLayout === "carousel") {
        const validImages = galleryImages.filter((img: any) => img.url);
        if (validImages.length === 0) return "";

        return `
          <div class="relative" data-carousel>
            <div class="relative aspect-video overflow-hidden group" style="border-radius: ${galleryBorderRadius}px;">
              <div class="carousel-inner" data-carousel-images>
                ${validImages.map((img: any, idx: number) => {
                  const hasLink = img.link && img.link.trim() !== '';
                  return `
                    <div class="carousel-item ${idx === 0 ? 'active' : ''}" data-carousel-item>
                      ${hasLink ? `
                        <a href="${img.link}" target="_blank" rel="noopener noreferrer" class="block w-full h-full">
                          <img 
                            src="${img.url}" 
                            alt="${img.alt || ""}"
                            title="${img.title || img.alt || ""}"
                            ${galleryLazyLoad ? 'loading="lazy"' : ""}
                            class="w-full h-full object-cover ${galleryFilterClass}"
                          />
                        </a>
                      ` : `
                        <img 
                          src="${img.url}" 
                          alt="${img.alt || ""}"
                          title="${img.title || img.alt || ""}"
                          ${galleryLazyLoad ? 'loading="lazy"' : ""}
                          class="w-full h-full object-cover ${galleryFilterClass}"
                        />
                      `}
                      ${galleryOverlayOpacity > 0 ? `
                        <div class="absolute inset-0 pointer-events-none transition-opacity duration-300 ${galleryOverlayHoverClass}" style="${galleryOverlayStyle}"></div>
                      ` : ""}
                      ${img.badge ? `
                        <div class="absolute top-4 left-4 px-2 py-1 text-xs font-bold rounded-md shadow-lg z-10 ${
                          img.badge === 'NEW' ? 'bg-green-500 text-white' :
                          img.badge === 'SALE' ? 'bg-red-500 text-white' :
                          img.badge === 'HOT' ? 'bg-orange-500 text-white' : 'text-white'
                        }" ${img.badge === 'FEATURED' ? `style="background-color: ${galleryThemeColor};"` : ''}>
                          ${img.badge}
                        </div>
                      ` : ""}
                      ${img.title ? `
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 pointer-events-none">
                          <div class="text-white">
                            <h3 class="text-lg font-bold mb-1">${img.title}</h3>
                            ${img.caption ? `<p class="text-sm opacity-90">${img.caption}</p>` : ''}
                          </div>
                        </div>
                      ` : galleryShowCaptions && img.caption ? `
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                          <p class="text-sm text-white text-center">${img.caption}</p>
                        </div>
                      ` : ""}
                      ${hasLink ? `
                        <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <div class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <svg class="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </div>
                      ` : ""}
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
            ${validImages.length > 1 ? `
              <button class="carousel-prev absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all" data-carousel-prev>
                <svg class="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button class="carousel-next absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all" data-carousel-next>
                <svg class="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div class="flex justify-center gap-2 mt-4" data-carousel-dots>
                ${validImages.map((_: any, idx: number) => `
                  <button class="h-2 rounded-full transition-all ${idx === 0 ? 'w-8' : 'w-2 bg-gray-300 hover:bg-gray-400'}" ${idx === 0 ? `style="background-color: ${galleryThemeColor};"` : ''} data-carousel-dot="${idx}"></button>
                `).join("")}
              </div>
            ` : ""}
          </div>
        `;
      }
      
      return "";
      
    case "countdown": {
      const targetDate = content.targetDate || new Date().toISOString();
      const countdownTitle = content.title || "Countdown";
      const countdownSubtitle = content.subtitle || "";
      const expiredMessage = content.expiredMessage || "Event has started!";
      const showLabels = content.showLabels !== false;
      const showDays = content.showDays !== false;
      const showHours = content.showHours !== false;
      const showMinutes = content.showMinutes !== false;
      const showSeconds = content.showSeconds !== false;
      const compactMode = content.compactMode || false;
      // Frontend style: 'elegant' | 'minimal' | 'glass' | 'gradient' | 'flip' | 'circular' | 'neon'
      const countdownStyle = content.style || "gradient";
      
      // Get theme colors
      const countdownThemeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const countdownThemeColorDark = adjustColorBrightness(countdownThemeColor, -15);
      const titleFont = getFontFamily(theme, 'title');
      const bodyFont = getFontFamily(theme, 'body');

      // Count visible units for grid
      const visibleUnits = [showDays, showHours, showMinutes, showSeconds].filter(Boolean).length;
      const gridCols = visibleUnits <= 2 ? "grid-cols-2" : visibleUnits === 3 ? "grid-cols-3" : "grid-cols-4";

      // Style-specific wrapper and unit styles
      const getWrapperStyle = () => {
        switch (countdownStyle) {
          case "elegant": return `background: white; border: 1px solid #e5e7eb; border-radius: 16px; color: #1f2937;`;
          case "minimal": return `background: transparent; color: ${getTitleColor(theme)};`;
          case "glass": return `background: rgba(255,255,255,0.1); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; color: white;`;
          case "neon": return `background: #0a0a0a; border: 1px solid ${countdownThemeColor}60; border-radius: 16px; color: white; box-shadow: 0 0 30px ${countdownThemeColor}20;`;
          case "flip": return `background: #1a1a2e; border-radius: 16px; color: white;`;
          case "circular": return `background: transparent; color: ${getTitleColor(theme)};`;
          case "gradient":
          default: return `background: linear-gradient(135deg, ${countdownThemeColor}, ${countdownThemeColorDark}); border-radius: 16px; color: white;`;
        }
      };

      const getUnitStyle = () => {
        switch (countdownStyle) {
          case "elegant": return `background: #f9fafb; border-radius: 12px; padding: 16px 8px;`;
          case "minimal": return `padding: 12px 8px;`;
          case "glass": return `background: rgba(255,255,255,0.1); border-radius: 12px; padding: 16px 8px;`;
          case "neon": return `background: rgba(255,255,255,0.05); border: 1px solid ${countdownThemeColor}40; border-radius: 12px; padding: 16px 8px; text-shadow: 0 0 10px ${countdownThemeColor};`;
          case "flip": return `background: #16213e; border-radius: 8px; padding: 16px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);`;
          case "circular": return `width: 80px; height: 80px; border-radius: 50%; border: 3px solid ${countdownThemeColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto;`;
          case "gradient":
          default: return `background: rgba(255,255,255,0.15); border-radius: 12px; padding: 16px 8px;`;
        }
      };

      const valueColor = countdownStyle === "elegant" ? countdownThemeColor : 
                          countdownStyle === "neon" ? countdownThemeColor : "inherit";
      const labelOpacity = countdownStyle === "elegant" ? "0.6" : "0.8";
      const valueSize = compactMode ? "text-2xl" : "text-3xl sm:text-4xl";
      
      return `
        <div class="countdown-block w-full px-4 py-6">
          <div class="p-6 sm:p-8" style="${getWrapperStyle()}" data-countdown="${targetDate}" data-expired-message="${expiredMessage}">
            <h3 class="${compactMode ? 'text-lg' : 'text-xl sm:text-2xl'} font-bold text-center mb-1" style="font-family: ${titleFont};">${countdownTitle}</h3>
            ${countdownSubtitle ? `<p class="text-sm text-center mb-4" style="opacity: 0.7; font-family: ${bodyFont};">${countdownSubtitle}</p>` : '<div class="mb-4"></div>'}
            <div class="grid ${gridCols} gap-3 sm:gap-4 text-center">
              ${showDays ? `
                <div style="${getUnitStyle()}">
                  <div class="${valueSize} font-bold" style="color: ${valueColor}; font-family: ${titleFont};" data-countdown-days>0</div>
                  ${showLabels ? `<div class="text-xs sm:text-sm mt-1" style="opacity: ${labelOpacity}; font-family: ${bodyFont};">Days</div>` : ''}
                </div>
              ` : ''}
              ${showHours ? `
                <div style="${getUnitStyle()}">
                  <div class="${valueSize} font-bold" style="color: ${valueColor}; font-family: ${titleFont};" data-countdown-hours>0</div>
                  ${showLabels ? `<div class="text-xs sm:text-sm mt-1" style="opacity: ${labelOpacity}; font-family: ${bodyFont};">Hours</div>` : ''}
                </div>
              ` : ''}
              ${showMinutes ? `
                <div style="${getUnitStyle()}">
                  <div class="${valueSize} font-bold" style="color: ${valueColor}; font-family: ${titleFont};" data-countdown-minutes>0</div>
                  ${showLabels ? `<div class="text-xs sm:text-sm mt-1" style="opacity: ${labelOpacity}; font-family: ${bodyFont};">Minutes</div>` : ''}
                </div>
              ` : ''}
              ${showSeconds ? `
                <div style="${getUnitStyle()}">
                  <div class="${valueSize} font-bold" style="color: ${valueColor}; font-family: ${titleFont};" data-countdown-seconds>0</div>
                  ${showLabels ? `<div class="text-xs sm:text-sm mt-1" style="opacity: ${labelOpacity}; font-family: ${bodyFont};">Seconds</div>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
      
    case "stats": {
      // Frontend uses content.stats, fallback to content.items for backward compat
      const statsItems = content.stats || content.items || [];
      const statsStyle = content.style || "gradient";
      // Frontend uses layout: 'grid-2' | 'grid-3' | 'list', fallback to columns
      const statsLayout = content.layout || (content.columns === 2 ? "grid-2" : content.columns === 4 ? "grid-4" : "grid-3");
      const statsAnimated = content.animated !== false;
      const statsShowIcons = content.showIcons !== false;
      
      // Get theme colors
      const statsThemeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const statsThemeColorDark = adjustColorBrightness(statsThemeColor, -15);
      const statsTitleColor = getTitleColor(theme);
      const statsBodyColor = getTextColor(theme);
      const statsTitleFont = getFontFamily(theme, 'title');
      const statsBodyFont = getFontFamily(theme, 'body');

      // Grid columns based on layout
      const statsGridCols = statsLayout === "grid-2" ? "grid-cols-2" : 
                            statsLayout === "grid-4" ? "grid-cols-2 sm:grid-cols-4" : 
                            statsLayout === "list" ? "grid-cols-1" :
                            "grid-cols-2 sm:grid-cols-3";

      // Style-specific card classes
      const getStatCardStyle = (style: string, color?: string) => {
        const c = color || statsThemeColor;
        switch (style) {
          case "elegant":
            return `background: white; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);`;
          case "minimal":
            return `background: transparent; border: none;`;
          case "glass":
            return `background: rgba(255,255,255,0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px;`;
          case "modern":
            return `background: ${c}08; border: 1px solid ${c}20; border-radius: 16px;`;
          case "bold":
            return `background: linear-gradient(135deg, ${c}, ${adjustColorBrightness(c, -20)}); border-radius: 16px; color: white;`;
          case "gradient":
          default:
            return `background: linear-gradient(135deg, ${c}10, ${c}05); border: 1px solid ${c}15; border-radius: 16px;`;
        }
      };

      const isBoldStyle = statsStyle === "bold";
      
      return `
        <div class="stats-block w-full px-4 py-6">
          <div class="grid ${statsGridCols} gap-4">
            ${statsItems.map((stat: any) => {
              const statColor = stat.color || statsThemeColor;
              const valueColor = isBoldStyle ? "white" : statColor;
              const labelColor = isBoldStyle ? "rgba(255,255,255,0.85)" : statsBodyColor;
              return `
                <div class="${statsLayout === 'list' ? 'flex items-center gap-4' : 'text-center'} p-5" style="${getStatCardStyle(statsStyle, statColor)}">
                  ${statsShowIcons && stat.icon ? `
                    <div class="flex items-center justify-center w-10 h-10 rounded-xl mb-3 mx-auto" style="background: ${isBoldStyle ? 'rgba(255,255,255,0.2)' : `${statColor}15`};">
                      <span class="text-xl">${stat.icon}</span>
                    </div>
                  ` : ""}
                  <div class="text-3xl sm:text-4xl font-bold mb-1" style="color: ${valueColor}; font-family: ${statsTitleFont};" ${statsAnimated ? `data-countup="${stat.value || 0}" data-countup-duration="${stat.duration || 2000}"` : ''}>
                    ${stat.prefix || ""}${statsAnimated ? '0' : (stat.value || '0')}${stat.suffix || ""}
                  </div>
                  <div class="text-sm font-medium" style="color: ${labelColor}; font-family: ${statsBodyFont};">
                    ${stat.label || ""}
                  </div>
                  ${stat.description ? `<div class="text-xs mt-1" style="color: ${labelColor}; opacity: 0.7;">${stat.description}</div>` : ''}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }
    case "pricing":
      const pricingTiers = content.tiers || [];
      const enableToggle = content.enableToggle ?? true;
      const yearlyDiscountLabel = content.yearlyDiscountLabel || "Save 20%";
      
      // Get theme colors for pricing
      const pricingThemeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const pricingThemeColorDark = adjustColorBrightness(pricingThemeColor, -15);
      const pricingThemeColorLight = adjustColorBrightness(pricingThemeColor, 90); // Very light for backgrounds
      const pricingThemeColorMedium = adjustColorBrightness(pricingThemeColor, 50); // Medium for borders
      
      return `
        <div class="space-y-6 px-4" data-pricing-block>
          ${enableToggle ? `
            <!-- Toggle Switch -->
            <div class="flex items-center justify-center">
              <div class="inline-flex items-center gap-2 sm:gap-3 p-1.5 bg-gray-100 rounded-full border-2 border-gray-200 w-full max-w-sm sm:w-auto touch-manipulation">
                <button
                  data-billing-period="monthly"
                  class="billing-toggle flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-2 rounded-full text-sm font-semibold transition-all duration-200 bg-white shadow-md text-gray-900 touch-manipulation"
                >
                  Monthly
                </button>
                <button
                  data-billing-period="yearly"
                  class="billing-toggle flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-2 rounded-full text-sm font-semibold transition-all duration-200 text-gray-500 hover:text-gray-900 touch-manipulation"
                >
                  Yearly
                  <span class="absolute -top-2 -right-1 sm:-right-2 px-1.5 sm:px-2 py-0.5 text-white text-xs font-bold rounded-full whitespace-nowrap" style="background: linear-gradient(to right, ${pricingThemeColor}, ${pricingThemeColorDark});">
                    ${yearlyDiscountLabel}
                  </span>
                </button>
              </div>
            </div>
          ` : ''}
          
          <!-- Pricing Tiers -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            ${pricingTiers.map((tier: any) => {
              const monthlyPrice = tier.monthlyPrice || tier.price || "$0";
              const yearlyPrice = tier.yearlyPrice || tier.price || "$0";
              const isHighlighted = tier.highlighted || false;
              
              return `
                <div class="relative rounded-2xl p-5 sm:p-6 transition-all duration-300 touch-manipulation ${
                  isHighlighted 
                    ? `border-2 shadow-lg lg:scale-105` 
                    : 'bg-white border border-gray-200 hover:shadow-md'
                }" style="${isHighlighted ? `background: linear-gradient(to bottom right, ${pricingThemeColorLight}, ${pricingThemeColorMedium}); border-color: ${pricingThemeColor}; box-shadow: 0 10px 25px -5px ${pricingThemeColor}33;` : `border-color: ${pricingThemeColor}33;`}">
                  ${isHighlighted ? `
                    <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div class="px-3 py-1 text-white text-xs font-bold rounded-full shadow-lg" style="background: linear-gradient(to right, ${pricingThemeColor}, ${pricingThemeColorDark});">
                        POPULAR
                      </div>
                    </div>
                  ` : ''}
                  
                  <div class="text-center space-y-4">
                    <h4 class="text-lg sm:text-xl font-bold text-gray-900">${tier.name || "Plan"}</h4>
                    ${tier.description ? `<p class="text-xs sm:text-sm text-gray-600">${tier.description}</p>` : ''}
                    
                    <div class="py-4">
                      <div class="text-3xl sm:text-4xl font-bold" style="background: linear-gradient(to right, ${pricingThemeColor}, ${pricingThemeColorDark}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        <span data-price-monthly="${monthlyPrice}" data-price-yearly="${yearlyPrice}" class="price-display">
                          ${monthlyPrice}
                        </span>
                      </div>
                      ${enableToggle ? `
                        <p class="text-xs sm:text-sm text-gray-500 mt-2">
                          per <span class="billing-period-text">month</span>
                        </p>
                      ` : ''}
                    </div>
                    
                    ${tier.features && tier.features.length > 0 ? `
                      <ul class="space-y-2 text-left text-sm">
                        ${tier.features.slice(0, 5).map((feature: string) => `
                          <li class="flex items-start gap-2">
                            <svg class="w-5 h-5 shrink-0 mt-0.5" style="color: ${pricingThemeColor};" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span class="text-gray-600">${feature}</span>
                          </li>
                        `).join("")}
                        ${tier.features.length > 5 ? `
                          <li class="text-xs text-gray-400 text-center pt-1">
                            +${tier.features.length - 5} more features
                          </li>
                        ` : ''}
                      </ul>
                    ` : ''}
                    
                    ${tier.buttonText ? `
                      <button 
                        onclick="window.location.href='${tier.buttonUrl || '#'}'"
                        class="w-full mt-4 px-6 py-3 text-white rounded-lg font-semibold transition-colors touch-manipulation"
                        style="background-color: ${pricingThemeColor};"
                        onmouseover="this.style.backgroundColor='${pricingThemeColorDark}'"
                        onmouseout="this.style.backgroundColor='${pricingThemeColor}'"
                        onmousedown="this.style.backgroundColor='${adjustColorBrightness(pricingThemeColor, -30)}'"
                      >
                        ${tier.buttonText}
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
      
    case "divider":
      const dividerStyle = content.style || 'solid';
      const dividerThickness = content.thickness || 2;
      const dividerWidth = content.width || '100%';
      const dividerColor = content.color || '#e5e7eb';
      const dividerAlignment = content.alignment || 'center';
      
      const justifyContent = dividerAlignment === 'left' ? 'flex-start' 
        : dividerAlignment === 'right' ? 'flex-end' 
        : 'center';
      
      if (dividerStyle === 'gradient') {
        // Use theme color for gradient divider
        const dividerThemeColor = theme?.branding?.primaryColor || "#9333ea";
        return `
          <div style="display: flex; justify-content: ${justifyContent}; padding: 1rem 0;">
            <div style="width: ${dividerWidth}; height: ${dividerThickness}px; background: linear-gradient(to right, transparent, ${dividerThemeColor}, transparent);"></div>
          </div>
        `;
      } else if (dividerStyle === 'double') {
        return `
          <div style="display: flex; justify-content: ${justifyContent}; padding: 1rem 0;">
            <div style="width: ${dividerWidth};">
              <hr style="border-style: solid; border-width: ${dividerThickness}px 0 0 0; border-color: ${dividerColor}; margin: 0;" />
              <hr style="border-style: solid; border-width: ${dividerThickness}px 0 0 0; border-color: ${dividerColor}; margin: ${dividerThickness * 2}px 0 0 0;" />
            </div>
          </div>
        `;
      } else {
        return `
          <div style="display: flex; justify-content: ${justifyContent}; padding: 1rem 0;">
            <hr style="width: ${dividerWidth}; border-style: ${dividerStyle}; border-width: ${dividerThickness}px 0 0 0; border-color: ${dividerColor};" />
          </div>
        `;
      }
      
    case "spacer":
      const spacerHeight = content.height || 40;
      const spacerMobileHeight = content.mobileHeight || 20;
      const spacerMobileHeightEnabled = content.mobileHeightEnabled || false;
      const spacerAutoCollapseMobile = content.autoCollapseMobile || false;
      const spacerDividerStyle = content.dividerStyle || 'none';
      const spacerDividerThickness = content.dividerThickness || 1;
      const spacerDividerWidth = content.dividerWidth || '100%';
      const spacerDividerAlignment = content.dividerAlignment || 'center';
      const spacerDividerColor = content.dividerColor || '#e5e7eb';
      const spacerIcon = content.icon || '';
      const spacerBackgroundEnabled = content.backgroundEnabled || false;
      const spacerBackgroundColor = content.backgroundColor || '#f3f4f6';
      const spacerBackgroundPattern = content.backgroundPattern || 'none';
      const spacerAnimation = content.animation || 'none';
      const spacerHideOnMobile = content.hideOnMobile || false;
      const spacerHideOnDesktop = content.hideOnDesktop || false;

      // Build background styles
      let spacerBgStyles = '';
      if (spacerBackgroundEnabled) {
        spacerBgStyles = `background-color: ${spacerBackgroundColor};`;
        if (spacerBackgroundPattern === 'dots') {
          spacerBgStyles += ' background-image: radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px); background-size: 20px 20px;';
        } else if (spacerBackgroundPattern === 'lines') {
          spacerBgStyles += ' background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px);';
        } else if (spacerBackgroundPattern === 'gradient') {
          spacerBgStyles += ' background-image: linear-gradient(to right, transparent, rgba(0,0,0,0.05), transparent);';
        }
      }

      // Build animation classes
      let spacerAnimationClass = '';
      if (spacerAnimation === 'fadeIn') {
        spacerAnimationClass = ' animate-fadeIn';
      } else if (spacerAnimation === 'slideUp') {
        spacerAnimationClass = ' animate-slideUp';
      } else if (spacerAnimation === 'scale') {
        spacerAnimationClass = ' animate-scale';
      }

      // Build responsive classes
      let spacerResponsiveClass = '';
      if (spacerHideOnMobile) {
        spacerResponsiveClass = ' hidden md:flex';
      } else if (spacerHideOnDesktop) {
        spacerResponsiveClass = ' flex md:hidden';
      }

      // Build divider HTML
      let spacerDividerHTML = '';
      if (spacerDividerStyle !== 'none') {
        const alignStyles = spacerDividerAlignment === 'left' ? 'left: 0;' 
          : spacerDividerAlignment === 'right' ? 'right: 0;'
          : 'left: 50%; transform: translateX(-50%) translateY(-50%);';
        
        // Use theme color for gradient divider
        const spacerThemeColor = theme?.branding?.primaryColor || "#9333ea";
        const borderOrBg = spacerDividerStyle === 'gradient'
          ? `background: linear-gradient(to right, transparent, ${spacerThemeColor}, transparent); height: ${spacerDividerThickness}px;`
          : `border-top: ${spacerDividerThickness}px ${spacerDividerStyle} ${spacerDividerColor}; height: ${spacerDividerThickness}px;`;

        spacerDividerHTML = `<div style="position: absolute; top: 50%; ${alignStyles} width: ${spacerDividerWidth}; ${borderOrBg}"></div>`;
      }

      // Build icon HTML
      let spacerIconHTML = '';
      if (spacerIcon) {
        spacerIconHTML = `<div style="position: relative; z-index: 10; background-color: white; padding: 0 12px; font-size: 24px; color: ${spacerDividerColor};">${spacerIcon}</div>`;
      }

      // Mobile height styles
      const spacerMobileHeightStyle = spacerMobileHeightEnabled 
        ? `<style>@media (max-width: 768px) { .spacer-${block.id} { height: ${spacerMobileHeight}px !important; } }</style>`
        : spacerAutoCollapseMobile
        ? `<style>@media (max-width: 768px) { .spacer-${block.id} { height: ${Math.floor(spacerHeight * 0.5)}px !important; } }</style>`
        : '';

      return `
        ${spacerMobileHeightStyle}
        <div class="spacer-${block.id}${spacerAnimationClass}${spacerResponsiveClass}" style="height: ${spacerHeight}px; ${spacerBgStyles} position: relative; display: flex; align-items: center; justify-content: center;">
          ${spacerDividerHTML}
          ${spacerIconHTML}
        </div>
      `;
      
    case "profile": {
      const avatarUrl = content.avatarUrl || "";
      // Frontend reads: content.name || content.displayName
      const displayName = content.name || content.displayName || "Your Name";
      const bio = content.bio || "";
      const location = content.location || "";
      const website = content.website || "";
      const verified = content.verified || false;
      const pronouns = content.pronouns || "";
      
      // Frontend uses block.style.avatarSize as string: 'small' | 'medium' | 'large' | 'xlarge'
      const avatarSizeKey = block.style?.avatarSize || content.avatarSize || "large";
      const avatarSizeMap: Record<string, number> = { small: 80, medium: 104, large: 128, xlarge: 160 };
      const avatarSize = typeof avatarSizeKey === 'number' ? avatarSizeKey : (avatarSizeMap[avatarSizeKey as string] || 128);
      
      // Frontend uses block.style.alignment
      const alignment = block.style?.alignment || content.textAlign || "center";
      const showLocation = content.showLocation ?? block.style?.showLocation ?? true;
      const showWebsite = content.showWebsite ?? block.style?.showWebsite ?? true;

      // Get theme colors
      const profileThemeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const profileThemeColorDark = adjustColorBrightness(profileThemeColor, -15);
      const titleColor = getTitleColor(theme);
      const bodyColor = getTextColor(theme);
      const titleFont = getFontFamily(theme, 'title');
      const bodyFont = getFontFamily(theme, 'body');

      const alignClass = alignment === "left" ? "items-start text-left" : alignment === "right" ? "items-end text-right" : "items-center text-center";
      
      // Text size based on avatar size
      const nameSizeClass = avatarSize >= 160 ? "text-4xl" : avatarSize >= 128 ? "text-3xl" : avatarSize >= 104 ? "text-2xl" : "text-xl";
      
      return `
        <div class="profile-block w-full px-4 py-8 flex flex-col ${alignClass}" style="gap: 1rem; --accent-color: ${profileThemeColor};">
          <!-- Avatar with border glow -->
          <div class="relative profile-avatar hover-scale" style="cursor: default;">
            <div 
              class="rounded-full overflow-hidden flex items-center justify-center glow-effect"
              style="width: ${avatarSize}px; height: ${avatarSize}px; --glow-color: ${profileThemeColor}30; ${avatarUrl ? '' : `background: ${profileThemeColor}15;`}"
            >
              ${avatarUrl ? `
                <img 
                  src="${avatarUrl}" 
                  alt="${displayName}"
                  class="w-full h-full object-cover"
                />
              ` : `
                <svg class="opacity-30" style="width: ${avatarSize * 0.45}px; height: ${avatarSize * 0.45}px; color: ${titleColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              `}
            </div>
            ${verified ? `
              <div class="absolute -bottom-2 -right-2 rounded-full p-1 shadow-xl float-animation" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                <svg class="w-7 h-7" viewBox="0 0 24 24" fill="white" stroke="#3b82f6" stroke-width="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>
            ` : ""}
          </div>

          <!-- Name & Pronouns -->
          <div class="profile-name flex items-center gap-2 flex-wrap ${alignment === 'center' ? 'justify-center' : ''}">
            <h1 class="${nameSizeClass} font-bold leading-tight" style="color: ${titleColor}; font-family: ${titleFont};">${displayName}</h1>
            ${pronouns ? `
              <span class="text-sm px-3 py-1.5 rounded-full font-medium hover-scale" style="background: ${profileThemeColor}15; color: ${bodyColor}; border: 1px solid ${profileThemeColor}20;">${pronouns}</span>
            ` : ""}
          </div>

          <!-- Location -->
          ${showLocation && location ? `
            <div class="profile-location flex items-center gap-2 text-sm font-medium" style="color: ${bodyColor};">
              <div class="flex items-center justify-center w-6 h-6 rounded-lg" style="background: ${profileThemeColor}15;">
                <svg class="w-4 h-4" style="color: ${profileThemeColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              ${location}
            </div>
          ` : ""}

          <!-- Bio -->
          ${bio ? `<p class="profile-bio text-sm sm:text-base max-w-md leading-relaxed" style="color: ${bodyColor}; font-family: ${bodyFont};">${bio}</p>` : ""}

          <!-- Website -->
          ${showWebsite && website ? `
            <a href="${website}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1 text-sm hover:underline hover-scale" style="color: ${profileThemeColor};">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>${website.replace(/^https?:\/\//, "")}</span>
            </a>
          ` : ""}
        </div>
      `;
    }

    case "header": {
      // Frontend uses siteName || title for the brand name
      const headerTitle = content.siteName || content.title || "";
      const headerSubtitle = content.subtitle || "";
      const headerLogoUrl = content.logoUrl || content.showLogo && content.logoUrl || "";
      const headerLogoSize = content.logoSize || 40;
      const headerAlignment = content.alignment || "center";
      // Frontend style variants: 'default' | 'minimal' | 'gradient' | 'glass' | 'transparent'
      const headerStyle = content.style || "default";
      // Nav links
      const headerNavLinks = content.navLinks || [];
      // CTA buttons
      const showCta = content.showCta || false;
      const ctaLabel = content.ctaLabel || "Get Started";
      const ctaUrl = content.ctaUrl || "#";
      const showSecondaryCta = content.showSecondaryCta || false;
      const secondaryCtaLabel = content.secondaryCtaLabel || "";
      const secondaryCtaUrl = content.secondaryCtaUrl || "#";
      // Announcement bar
      const showAnnouncement = content.showAnnouncement || false;
      const announcementText = content.announcementText || "";
      // Legacy fallback
      const headerBackgroundColor = content.backgroundColor || "";
      const headerTextColor = content.textColor || "";

      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const themeColorDark = adjustColorBrightness(themeColor, -15);
      const titleColor = headerTextColor || getTitleColor(theme);
      const bodyColor = headerTextColor || getTextColor(theme);
      const titleFont = getFontFamily(theme, 'title');
      const bodyFont = getFontFamily(theme, 'body');

      // Style-specific backgrounds
      const getHeaderBg = () => {
        if (headerBackgroundColor) return `background-color: ${headerBackgroundColor};`;
        switch (headerStyle) {
          case "gradient": return `background: linear-gradient(135deg, ${themeColor}, ${themeColorDark});`;
          case "glass": return `background: rgba(255,255,255,0.08); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.1);`;
          case "transparent": return `background: transparent;`;
          case "minimal": return `background: transparent; border-bottom: 1px solid rgba(0,0,0,0.06);`;
          default: return `background: white; border-bottom: 1px solid rgba(0,0,0,0.06);`;
        }
      };
      const isGradient = headerStyle === "gradient";
      const navTextColor = isGradient ? "rgba(255,255,255,0.85)" : bodyColor;
      const navHoverColor = isGradient ? "white" : themeColor;

      const alignClass = headerAlignment === "left" ? "justify-start" : headerAlignment === "right" ? "justify-end" : "justify-center";

      return `
        ${showAnnouncement && announcementText ? `
          <div class="w-full py-2 px-4 text-center text-sm font-medium text-white" style="background: linear-gradient(135deg, ${themeColor}, ${themeColorDark}); font-family: ${bodyFont};">
            ${announcementText}
          </div>
        ` : ""}
        <header class="w-full px-4 sm:px-6 py-4" style="${getHeaderBg()} color: ${titleColor};">
          <div class="flex items-center ${alignClass} gap-4 flex-wrap">
            <!-- Logo & Brand -->
            <div class="flex items-center gap-3">
              ${headerLogoUrl ? `
                <img src="${headerLogoUrl}" alt="Logo" style="width: ${headerLogoSize}px; height: ${headerLogoSize}px; object-fit: contain;" />
              ` : ""}
              ${headerTitle ? `<span class="text-lg font-bold" style="color: ${isGradient ? 'white' : titleColor}; font-family: ${titleFont};">${headerTitle}</span>` : ""}
            </div>
            
            ${headerNavLinks.length > 0 ? `
              <!-- Nav Links -->
              <nav class="flex items-center gap-4 sm:gap-6 text-sm font-medium">
                ${headerNavLinks.map((link: any) => `
                  <a href="${link.url || '#'}" class="transition-colors hover:opacity-80" style="color: ${navTextColor}; font-family: ${bodyFont};" ${link.newTab ? 'target="_blank" rel="noopener noreferrer"' : ""}>
                    ${link.label || link.text || ""}
                  </a>
                `).join("")}
              </nav>
            ` : ""}

            ${showCta || showSecondaryCta ? `
              <!-- CTA Buttons -->
              <div class="flex items-center gap-3 ml-auto">
                ${showSecondaryCta && secondaryCtaLabel ? `
                  <a href="${secondaryCtaUrl}" class="px-4 py-2 rounded-lg text-sm font-medium transition-all" style="color: ${isGradient ? 'white' : themeColor}; border: 1px solid ${isGradient ? 'rgba(255,255,255,0.3)' : themeColor + '40'}; font-family: ${bodyFont};">
                    ${secondaryCtaLabel}
                  </a>
                ` : ""}
                ${showCta ? `
                  <a href="${ctaUrl}" class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:shadow-lg" style="background: ${themeColor}; font-family: ${bodyFont};"
                     onmouseover="this.style.backgroundColor='${themeColorDark}'"
                     onmouseout="this.style.backgroundColor='${themeColor}'"
                  >
                    ${ctaLabel}
                  </a>
                ` : ""}
              </div>
            ` : ""}
          </div>
          ${headerSubtitle ? `<p class="text-sm mt-2 ${alignClass === 'justify-center' ? 'text-center' : ''}" style="color: ${isGradient ? 'rgba(255,255,255,0.8)' : bodyColor}; font-family: ${bodyFont};">${headerSubtitle}</p>` : ""}
        </header>
      `;
    }

    case "footer": {
      const footerText = content.text || "© 2024 All rights reserved";
      const footerAlignment = content.alignment || "center";
      const footerLinks = content.links || [];
      // Frontend style variants: 'simple' | 'minimal' | 'centered' | 'columns'
      const footerStyle = content.style || "simple";
      const footerShowBorder = content.showBorder !== false;
      const footerShowBranding = content.showBranding || false;
      // Social links (array format in frontend)
      const footerSocialLinks = content.socialLinks || [];
      const footerShowSocial = content.showSocial ?? (Array.isArray(footerSocialLinks) ? footerSocialLinks.length > 0 : Object.keys(footerSocialLinks).length > 0);
      // Contact info
      const footerEmail = content.email || "";
      const footerPhone = content.phone || "";
      const footerAddress = content.address || "";
      // Newsletter
      const footerShowNewsletter = content.showNewsletter || false;
      const footerNewsletterTitle = content.newsletterTitle || "Subscribe to our newsletter";
      const footerNewsletterSubtitle = content.newsletterSubtitle || "";
      // App badges
      const footerShowAppBadges = content.showAppBadges || false;
      const footerAppStoreUrl = content.appStoreUrl || "";
      const footerPlayStoreUrl = content.playStoreUrl || "";
      // Legacy fallback
      const footerBackgroundColor = content.backgroundColor || "";
      const footerTextColor = content.textColor || "";

      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const themeColorDark = adjustColorBrightness(themeColor, -15);
      const titleColor = footerTextColor || getTitleColor(theme);
      const bodyColor = footerTextColor || getTextColor(theme);
      const titleFont = getFontFamily(theme, 'title');
      const bodyFont = getFontFamily(theme, 'body');
      const bgColor = footerBackgroundColor || (theme?.background?.color ? adjustColorBrightness(theme.background.color, -5) : "#1f2937");

      const alignClass = footerAlignment === "left" ? "text-left items-start" : footerAlignment === "right" ? "text-right items-end" : "text-center items-center";

      // Handle social links as array or object
      const socialHtml = footerShowSocial ? `
        <div class="flex gap-3 ${footerAlignment === 'center' ? 'justify-center' : ''} mb-4">
          ${Array.isArray(footerSocialLinks) 
            ? footerSocialLinks.map((link: any) => link.url ? `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110" style="background: ${themeColor}20; color: ${themeColor};">
                  ${getSocialIcon(link.platform || link.type || '')}
                </a>
              ` : "").join("")
            : Object.entries(footerSocialLinks).map(([platform, url]) => url ? `
                <a href="${url}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110" style="background: ${themeColor}20; color: ${themeColor};">
                  ${getSocialIcon(platform)}
                </a>
              ` : "").join("")
          }
        </div>
      ` : "";

      return `
        <footer class="w-full px-4 sm:px-6 py-8 mt-8 flex flex-col ${alignClass}" style="background-color: ${bgColor}; color: ${bodyColor}; ${footerShowBorder ? `border-top: 1px solid ${themeColor}15;` : ''}">
          ${footerShowNewsletter ? `
            <div class="w-full max-w-md ${footerAlignment === 'center' ? 'mx-auto' : ''} mb-8">
              <h3 class="text-lg font-bold mb-1" style="color: ${titleColor}; font-family: ${titleFont};">${footerNewsletterTitle}</h3>
              ${footerNewsletterSubtitle ? `<p class="text-sm mb-3" style="color: ${bodyColor}; opacity: 0.7; font-family: ${bodyFont};">${footerNewsletterSubtitle}</p>` : ""}
              <form class="flex gap-2" onsubmit="event.preventDefault(); alert('Newsletter signup coming soon!');">
                <input type="email" placeholder="Enter your email" class="flex-1 px-4 py-2.5 rounded-lg text-sm border" style="border-color: ${themeColor}20; background: rgba(255,255,255,0.05); color: ${titleColor}; font-family: ${bodyFont};" />
                <button type="submit" class="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style="background: ${themeColor}; font-family: ${bodyFont};">Subscribe</button>
              </form>
            </div>
          ` : ""}

          ${footerLinks.length > 0 ? `
            <div class="flex flex-wrap gap-4 sm:gap-6 mb-4 text-sm ${footerAlignment === 'center' ? 'justify-center' : ''}" style="font-family: ${bodyFont};">
              ${footerLinks.map((link: any) => `
                <a href="${link.url || '#'}" class="footer-link transition-opacity hover:opacity-80" style="color: ${bodyColor}; --accent-color: ${themeColor};" ${link.newTab ? 'target="_blank" rel="noopener noreferrer"' : ""}>
                  ${link.label || link.text || ""}
                </a>
              `).join("")}
            </div>
          ` : ""}

          ${socialHtml}

          <!-- Contact info -->
          ${footerEmail || footerPhone || footerAddress ? `
            <div class="flex flex-wrap gap-4 mb-4 text-sm ${footerAlignment === 'center' ? 'justify-center' : ''}" style="color: ${bodyColor}; opacity: 0.7; font-family: ${bodyFont};">
              ${footerEmail ? `<a href="mailto:${footerEmail}" class="flex items-center gap-1 hover:opacity-100"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>${footerEmail}</a>` : ""}
              ${footerPhone ? `<a href="tel:${footerPhone}" class="flex items-center gap-1 hover:opacity-100"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>${footerPhone}</a>` : ""}
              ${footerAddress ? `<span class="flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>${footerAddress}</span>` : ""}
            </div>
          ` : ""}

          ${footerShowAppBadges && (footerAppStoreUrl || footerPlayStoreUrl) ? `
            <div class="flex gap-3 mb-4 ${footerAlignment === 'center' ? 'justify-center' : ''}">
              ${footerAppStoreUrl ? `<a href="${footerAppStoreUrl}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-lg text-sm font-medium border border-gray-600 flex items-center gap-2" style="color: ${titleColor};">🍎 App Store</a>` : ""}
              ${footerPlayStoreUrl ? `<a href="${footerPlayStoreUrl}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-lg text-sm font-medium border border-gray-600 flex items-center gap-2" style="color: ${titleColor};">▶️ Google Play</a>` : ""}
            </div>
          ` : ""}

          <p class="text-sm" style="color: ${bodyColor}; opacity: 0.6; font-family: ${bodyFont};">${footerText}</p>
          ${footerShowBranding ? `<p class="text-xs mt-2" style="color: ${bodyColor}; opacity: 0.4;">Powered by QR Platform</p>` : ""}
        </footer>
      `;
    }

    case "features": {
      const featureItems = content.items || [];
      const columns = content.columns || 3;
      const iconSize = content.iconSize || "md";
      const layout = content.layout || "grid";
      const cardStyle = content.cardStyle || "card";
      
      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const themeColorDark = adjustColorBrightness(themeColor, -15);
      
      const columnMap: Record<number, string> = {
        1: "grid-cols-1",
        2: "grid-cols-1 sm:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      };
      const columnClass = columnMap[columns as number] || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      
      const iconSizeMap: Record<string, string> = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-16 h-16",
        xl: "w-20 h-20"
      };
      const iconSizeClass = iconSizeMap[iconSize as string] || "w-12 h-12";
      
      return `
        <div class="features-block w-full px-4 py-8">
          <div class="grid ${columnClass} gap-6">
            ${featureItems.map((item: any) => {
              const iconHtml = item.icon ? `
                <div class="${iconSizeClass} mb-4 flex items-center justify-center rounded-full" style="background: linear-gradient(135deg, ${themeColor}, ${themeColorDark}); color: white;">
                  <span class="text-2xl">${item.icon.length <= 2 ? item.icon : '✨'}</span>
                </div>
              ` : "";
              
              return `
                <div class="feature-item feature-card flex flex-col items-center text-center p-6 rounded-xl ${
                  cardStyle === 'card' ? 'bg-white shadow-sm' : 
                  cardStyle === 'bordered' ? 'border-2' : 
                  ''
                }" style="${cardStyle === 'bordered' ? `border-color: ${themeColor}33;` : ''} --accent-color: ${themeColor};">
                  ${iconHtml}
                  <h3 class="text-lg font-semibold mb-2" style="color: ${themeColor};">${item.title || 'Feature'}</h3>
                  <p class="text-sm text-gray-600">${item.description || ''}</p>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }

    case "hero": {
      // Frontend uses headline/subheadline, fallback to title/subtitle for backward compat
      const heroTitle = content.headline || content.title || "Welcome";
      const heroSubtitle = content.subheadline || content.subtitle || "";
      const heroBackgroundImage = content.backgroundImage || "";
      const heroBackgroundVideo = content.backgroundVideo || "";
      const heroOverlay = content.overlay !== false;
      const heroOverlayOpacity = content.overlayOpacity ?? 0.5;
      const heroOverlayColor = content.overlayColor || "#000000";
      // Frontend uses content.alignment, fallback to textAlign
      const heroAlignment = content.alignment || content.textAlign || "center";
      // Frontend uses height as enum: 'small' | 'medium' | 'large' | 'full', fallback to CSS px
      const heroHeightMap: Record<string, string> = { small: "320px", medium: "420px", large: "520px", full: "100vh" };
      const heroHeight = heroHeightMap[content.height as string] || content.height || "420px";
      // Frontend uses flat button fields instead of buttons[] array
      const heroButtonText = content.buttonText || "";
      const heroButtonUrl = content.buttonUrl || "";
      const heroSecondaryButtonText = content.secondaryButtonText || "";
      const heroSecondaryButtonUrl = content.secondaryButtonUrl || "";
      // Legacy buttons[] array support
      const heroButtons = content.buttons || [];
      // Additional frontend fields
      const headlineSize = content.headlineSize || "text-5xl";
      const fontWeight = content.fontWeight || "bold";
      const showBadge = content.showBadge || false;
      const badgeText = content.badgeText || "";
      const pattern = content.pattern || "none";
      const showScrollIndicator = content.showScrollIndicator || false;
      
      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const themeColorDark = adjustColorBrightness(themeColor, -15);
      const titleFont = getFontFamily(theme, 'title');
      const bodyFont = getFontFamily(theme, 'body');
      
      const alignClass = heroAlignment === "left" ? "text-left items-start" : 
                        heroAlignment === "right" ? "text-right items-end" : 
                        "text-center items-center";

      // Pattern overlay
      const patternOverlay = pattern && pattern !== "none" ? `
        <div class="absolute inset-0 opacity-10" style="background-image: ${
          pattern === "dots" ? "radial-gradient(circle, white 1px, transparent 1px); background-size: 20px 20px" :
          pattern === "grid" ? "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px); background-size: 40px 40px" :
          pattern === "diagonal" ? "repeating-linear-gradient(45deg, white 0, white 1px, transparent 1px, transparent 20px)" :
          "none"
        };"></div>
      ` : "";

      // Build buttons HTML — prefer flat fields, fallback to buttons[] array
      let buttonsHtml = "";
      if (heroButtonText || heroSecondaryButtonText) {
        buttonsHtml = `<div class="flex flex-wrap gap-4 ${heroAlignment === 'center' ? 'justify-center' : ''} mt-8">`;
        if (heroButtonText) {
          buttonsHtml += `
            <a href="${heroButtonUrl || '#'}" 
               class="px-8 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:shadow-lg hover:scale-105"
               style="background-color: ${themeColor}; font-family: ${bodyFont};"
               onmouseover="this.style.backgroundColor='${themeColorDark}'"
               onmouseout="this.style.backgroundColor='${themeColor}'"
            >
              ${heroButtonText}
            </a>
          `;
        }
        if (heroSecondaryButtonText) {
          buttonsHtml += `
            <a href="${heroSecondaryButtonUrl || '#'}" 
               class="px-8 py-3.5 rounded-xl font-semibold border-2 border-white/40 text-white transition-all duration-200 hover:bg-white/10 backdrop-blur-sm"
               style="font-family: ${bodyFont};"
            >
              ${heroSecondaryButtonText}
            </a>
          `;
        }
        buttonsHtml += `</div>`;
      } else if (heroButtons.length > 0) {
        buttonsHtml = `
          <div class="flex flex-wrap gap-4 ${heroAlignment === 'center' ? 'justify-center' : ''} mt-8">
            ${heroButtons.map((btn: any) => `
              <a href="${btn.url || '#'}" 
                 class="px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 ${
                   btn.style === 'outline' ? 'border-2 border-white/40 text-white hover:bg-white/10' : 
                   'text-white hover:shadow-lg hover:scale-105'
                 }"
                 style="${btn.style !== 'outline' ? `background-color: ${themeColor};` : ''} font-family: ${bodyFont};"
                 ${btn.style !== 'outline' ? `onmouseover="this.style.backgroundColor='${themeColorDark}'" onmouseout="this.style.backgroundColor='${themeColor}'"` : ''}
              >
                ${btn.text || 'Learn More'}
              </a>
            `).join("")}
          </div>
        `;
      }
      
      return `
        <div class="hero-block relative w-full overflow-hidden" style="min-height: ${heroHeight};">
          ${heroBackgroundImage ? `
            <div class="absolute inset-0 bg-cover bg-center hero-parallax-bg" style="background-image: url('${heroBackgroundImage}'); transform: scale(1.1);"></div>
          ` : ""}
          ${heroBackgroundVideo ? `
            <video class="absolute inset-0 w-full h-full object-cover" autoplay muted loop playsinline>
              <source src="${heroBackgroundVideo}" type="video/mp4">
            </video>
          ` : ""}
          ${heroOverlay ? `<div class="absolute inset-0" style="background-color: ${heroOverlayColor}; opacity: ${heroOverlayOpacity};"></div>` : ""}
          ${patternOverlay}
          
          <div class="relative z-10 h-full flex flex-col ${alignClass} justify-center px-4 sm:px-6 py-12 sm:py-20" style="min-height: ${heroHeight};">
            ${showBadge && badgeText ? `
              <div class="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/90 mb-6 backdrop-blur-sm" style="background: ${themeColor}30; border: 1px solid ${themeColor}40;">
                <span class="w-2 h-2 rounded-full animate-pulse" style="background: ${themeColor};"></span>
                ${badgeText}
              </div>
            ` : ""}
            <h1 class="text-3xl sm:text-4xl md:${headlineSize} lg:text-6xl font-${fontWeight} text-white mb-4 max-w-4xl leading-tight" style="font-family: ${titleFont};">
              ${heroTitle}
            </h1>
            ${heroSubtitle ? `
              <h2 class="text-xl sm:text-2xl md:text-3xl text-white/90 mb-4 max-w-3xl" style="font-family: ${bodyFont};">
                ${heroSubtitle}
              </h2>
            ` : ""}
            <div class="hero-buttons">${buttonsHtml}</div>
            ${showScrollIndicator ? `
              <div class="absolute bottom-8 left-1/2 bounce-indicator">
                <svg class="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            ` : ""}
          </div>
        </div>
      `;
    }

    case "payment": {
      const paymentType = content.paymentMode || content.paymentType || "tips";
      const paymentTitle = content.title || "Support Me";
      const paymentDescription = content.description || "Your support helps me create more content!";
      const paymentAmounts = content.customAmounts || content.amounts || [5, 10, 25, 50];
      const paymentCustomAmount = content.allowCustomAmount !== false;
      const paymentCurrency = content.currency || "USD";
      const paymentButtonText = content.buttonText || "";
      const paymentStripeLink = content.stripePaymentLink || "";
      
      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const themeColorDark = adjustColorBrightness(themeColor, -15);
      
      return `
        <div class="payment-block w-full px-4 py-8 bg-white rounded-lg shadow-sm" data-payment-block>
          <div class="max-w-md mx-auto">
            <h3 class="text-2xl font-bold mb-2 text-center" style="color: ${themeColor};">${paymentTitle}</h3>
            ${paymentDescription ? `<p class="text-gray-600 text-center mb-6">${paymentDescription}</p>` : ""}
            
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                ${paymentAmounts.map((amount: number) => `
                  <button 
                    class="payment-amount-btn p-4 rounded-lg border-2 font-semibold text-lg transition-all hover:shadow-md"
                    data-amount="${amount}"
                    style="border-color: ${themeColor}33; color: ${themeColor};"
                    onclick="this.classList.add('ring-2'); this.style.borderColor='${themeColor}'; Array.from(this.parentElement.children).forEach(b => { if(b !== this) { b.classList.remove('ring-2'); b.style.borderColor='${themeColor}33'; }});"
                  >
                    $${amount}
                  </button>
                `).join("")}
              </div>
              
              ${paymentCustomAmount ? `
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Custom Amount</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input 
                      type="number" 
                      min="1" 
                      step="1"
                      class="w-full pl-8 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2"
                      placeholder="Enter amount"
                      style="border-color: ${themeColor}33;"
                      onfocus="this.style.borderColor='${themeColor}'; this.style.boxShadow='0 0 0 3px ${themeColor}22';"
                      onblur="this.style.borderColor='${themeColor}33'; this.style.boxShadow='none';"
                    />
                  </div>
                </div>
              ` : ""}
              
              <button 
                class="w-full py-4 rounded-lg text-white font-semibold text-lg transition-all hover:shadow-lg"
                style="background-color: ${themeColor};"
                onmouseover="this.style.backgroundColor='${themeColorDark}'"
                onmouseout="this.style.backgroundColor='${themeColor}'"
                ${paymentStripeLink ? `onclick="window.open('${paymentStripeLink}', '_blank');"` : `onclick="alert('Payment integration requires Stripe setup.');"`}
              >
                ${paymentButtonText || (paymentType === 'tips' ? '💝 Send Tip' : paymentType === 'donation' ? '🎁 Donate' : paymentType === 'products' ? '🛒 Buy Now' : '💳 Pay Now')}
              </button>
              
              <p class="text-xs text-gray-500 text-center">
                Secure payment powered by Stripe
              </p>
            </div>
          </div>
        </div>
      `;
    }

    case "map": {
      const mapAddress = content.address || "";
      const mapLatitude = content.latitude || 0;
      const mapLongitude = content.longitude || 0;
      const mapZoom = content.zoom || 15;
      const mapHeight = content.height || "400px";
      const mapTitle = content.title || "";
      
      const mapEmbedUrl = mapLatitude && mapLongitude 
        ? `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${mapLatitude},${mapLongitude}&zoom=${mapZoom}`
        : mapAddress 
        ? `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(mapAddress)}`
        : "";
      
      return `
        <div class="map-block w-full px-4 py-6">
          ${mapTitle ? `<h3 class="text-xl font-bold mb-4">${mapTitle}</h3>` : ""}
          ${mapEmbedUrl ? `
            <iframe
              src="${mapEmbedUrl}"
              width="100%"
              height="${mapHeight}"
              style="border:0; border-radius: 12px;"
              allowfullscreen=""
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
          ` : `
            <div class="w-full rounded-lg bg-gray-100 flex items-center justify-center" style="height: ${mapHeight};">
              <div class="text-center p-6">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p class="text-gray-500">Map location: ${mapAddress || 'No address set'}</p>
                <p class="text-xs text-gray-400 mt-2">Google Maps API key required for embed</p>
              </div>
            </div>
          `}
          ${mapAddress ? `
            <div class="mt-4 text-center">
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapAddress)}" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 class="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Get Directions
              </a>
            </div>
          ` : ""}
        </div>
      `;
    }

    case "schedule": {
      const scheduleTitle = content.title || "Book an Appointment";
      const scheduleDescription = content.description || content.subtitle || "";
      const scheduleType = content.type || "calendly";
      const scheduleUrl = content.calendlyUrl || content.url || "";
      const scheduleHeight = content.height || "600px";
      const scheduleShowForm = content.showForm !== false;
      
      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      
      return `
        <div class="schedule-block w-full px-4 py-8">
          <div class="max-w-3xl mx-auto">
            <h3 class="text-2xl font-bold mb-2 text-center" style="color: ${themeColor};">${scheduleTitle}</h3>
            ${scheduleDescription ? `<p class="text-gray-600 text-center mb-6">${scheduleDescription}</p>` : ""}
            
            ${scheduleUrl && scheduleType === 'calendly' ? `
              <div class="calendly-inline-widget" data-url="${scheduleUrl}" style="min-width:320px;height:${scheduleHeight};"></div>
              <script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>
            ` : scheduleShowForm ? `
              <div class="bg-white rounded-lg shadow-sm p-6 border-2" style="border-color: ${themeColor}22;">
                <form class="space-y-4" onsubmit="event.preventDefault(); alert('Booking submitted! We will contact you shortly.');">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2" style="border-color: ${themeColor}33;" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2" style="border-color: ${themeColor}33;" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2" style="border-color: ${themeColor}33;" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                    <input type="date" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2" style="border-color: ${themeColor}33;" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea rows="3" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2" style="border-color: ${themeColor}33;"></textarea>
                  </div>
                  <button type="submit" class="w-full py-3 rounded-lg text-white font-semibold" style="background-color: ${themeColor};">
                    📅 Request Booking
                  </button>
                </form>
              </div>
            ` : `
              <div class="text-center p-12 bg-gray-50 rounded-lg">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-gray-500">Configure Calendly URL or enable booking form</p>
              </div>
            `}
          </div>
        </div>
      `;
    }

    case "product": {
      const productName = content.name || "Product Name";
      const productDescription = content.description || "";
      const rawPrice = content.price;
      const productCurrency = content.currency || "USD";
      const currencySymbol = productCurrency === "EUR" ? "€" : productCurrency === "GBP" ? "£" : "$";
      const productPrice = typeof rawPrice === "number" ? `${currencySymbol}${rawPrice.toFixed(2)}` : (rawPrice || `${currencySymbol}0.00`);
      const rawOriginalPrice = content.originalPrice;
      const productOriginalPrice = typeof rawOriginalPrice === "number" ? `${currencySymbol}${rawOriginalPrice.toFixed(2)}` : (rawOriginalPrice || "");
      const productImage = content.imageUrl || content.image || "";
      const productImages = content.imageUrls || content.images || [];
      const productVariants = content.variants || [];
      const productButtonText = content.buttonText || "Add to Cart";
      const productButtonUrl = content.buttonUrl || "#";
      const productBadge = content.badge || "";
      const productRating = content.rating as number | undefined;
      const productReviewCount = content.reviewCount as number | undefined;
      const productFeatures = (content.features as string[]) || [];
      
      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const themeColorDark = adjustColorBrightness(themeColor, -15);
      
      const allImages = productImage ? [productImage, ...productImages] : productImages;
      
      return `
        <div class="product-block w-full px-4 py-8">
          <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div class="relative">
                ${allImages.length > 0 ? `
                  <img src="${allImages[0]}" alt="${productName}" class="w-full h-auto rounded-lg object-cover" />
                  ${productBadge ? `
                    <div class="absolute top-3 right-3 px-3 py-1 rounded-full text-white text-sm font-bold" style="background-color: ${themeColor};">
                      ${productBadge}
                    </div>
                  ` : ""}
                  ${allImages.length > 1 ? `
                    <div class="mt-3 grid grid-cols-4 gap-2">
                      ${allImages.slice(1, 5).map((img: string) => `
                        <img src="${img}" alt="${productName}" class="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition" />
                      `).join("")}
                    </div>
                  ` : ""}
                ` : `
                  <div class="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                `}
              </div>
              
              <div class="flex flex-col">
                <h3 class="text-2xl font-bold mb-2">${productName}</h3>
                ${productRating ? `
                  <div class="flex items-center gap-2 mb-2">
                    <div class="flex">${"★".repeat(Math.floor(productRating))}${productRating % 1 >= 0.5 ? "½" : ""}${"☆".repeat(5 - Math.ceil(productRating))}</div>
                    ${productReviewCount ? `<span class="text-sm text-gray-500">(${productReviewCount.toLocaleString()} reviews)</span>` : ""}
                  </div>
                ` : ""}
                <div class="flex items-center gap-3 mb-4">
                  <span class="text-3xl font-bold" style="color: ${themeColor};">${productPrice}</span>
                  ${productOriginalPrice ? `<span class="text-xl text-gray-400 line-through">${productOriginalPrice}</span>` : ""}
                </div>
                ${productDescription ? `<p class="text-gray-600 mb-4">${productDescription}</p>` : ""}
                ${productFeatures.length > 0 ? `
                  <ul class="mb-4 space-y-1">
                    ${productFeatures.map((f: string) => `<li class="flex items-center gap-2 text-sm text-gray-600"><span style="color: ${themeColor};">✓</span> ${f}</li>`).join("")}
                  </ul>
                ` : ""}
                
                ${productVariants.length > 0 ? `
                  <div class="space-y-3 mb-6">
                    ${productVariants.map((variant: any) => `
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">${variant.name}</label>
                        <select class="w-full px-4 py-2 border rounded-lg" style="border-color: ${themeColor}33;">
                          ${variant.options.map((opt: string) => `<option>${opt}</option>`).join("")}
                        </select>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
                
                <button 
                  class="w-full py-4 rounded-lg text-white font-semibold text-lg transition-all hover:shadow-lg mt-auto"
                  style="background-color: ${themeColor};"
                  onmouseover="this.style.backgroundColor='${themeColorDark}'"
                  onmouseout="this.style.backgroundColor='${themeColor}'"
                  ${productButtonUrl && productButtonUrl !== "#" ? `onclick="window.open('${productButtonUrl}', '_blank');"` : `onclick="alert('Product added to cart!');"`}
                >
                  ${productButtonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    case "shop": {
      const shopTitle = content.title || "Our Products";
      const shopProducts = content.products || [];
      const shopColumns = content.columns || 3;
      
      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const themeColorDark = adjustColorBrightness(themeColor, -15);
      
      const shopColumnMap: Record<number, string> = {
        2: "grid-cols-1 sm:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      };
      const columnClass = shopColumnMap[shopColumns as number] || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      
      return `
        <div class="shop-block w-full px-4 py-8">
          <h3 class="text-3xl font-bold mb-8 text-center" style="color: ${themeColor};">${shopTitle}</h3>
          <div class="grid ${columnClass} gap-6">
            ${shopProducts.map((product: any) => `
              <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                ${product.image ? `
                  <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover" />
                ` : `
                  <div class="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                `}
                <div class="p-4">
                  ${product.badge ? `<span class="inline-block px-2 py-0.5 rounded text-xs font-bold text-white mb-2" style="background-color: ${themeColor};">${product.badge}</span>` : ""}
                  <h4 class="font-semibold text-lg mb-1">${product.name || 'Product'}</h4>
                  <p class="text-sm text-gray-600 mb-3 line-clamp-2">${product.description || ''}</p>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-xl font-bold" style="color: ${themeColor};">${typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : (product.price || '$0')}</span>
                      ${product.comparePrice ? `<span class="text-sm text-gray-400 line-through">$${typeof product.comparePrice === 'number' ? product.comparePrice.toFixed(2) : product.comparePrice}</span>` : ""}
                    </div>
                    <button 
                      class="px-4 py-2 rounded-lg text-white font-medium transition-colors"
                      style="background-color: ${themeColor};"
                      onmouseover="this.style.backgroundColor='${themeColorDark}'"
                      onmouseout="this.style.backgroundColor='${themeColor}'"
                      onclick="alert('Added ${(product.name || 'item').replace(/'/g, "\\'")} to cart!');"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    case "artist": {
      const artistName = content.artistName || "Artist Name";
      const artistBio = content.bio || "";
      const artistImage = content.image || "";
      const artistTracks = content.tracks || [];
      const artistSpotifyUrl = content.spotifyUrl || "";
      const artistAppleMusicUrl = content.appleMusicUrl || "";
      const artistSoundCloudUrl = content.soundCloudUrl || "";
      
      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      
      return `
        <div class="artist-block w-full px-4 py-8">
          <div class="max-w-4xl mx-auto">
            <div class="flex flex-col sm:flex-row gap-6 mb-8">
              ${artistImage ? `
                <img src="${artistImage}" alt="${artistName}" class="w-32 h-32 rounded-full object-cover mx-auto sm:mx-0" />
              ` : ""}
              <div class="flex-1 text-center sm:text-left">
                <h3 class="text-3xl font-bold mb-2" style="color: ${themeColor};">${artistName}</h3>
                ${artistBio ? `<p class="text-gray-600 mb-4">${artistBio}</p>` : ""}
                <div class="flex gap-3 justify-center sm:justify-start">
                  ${artistSpotifyUrl ? `
                    <a href="${artistSpotifyUrl}" target="_blank" class="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600">
                      🎵 Spotify
                    </a>
                  ` : ""}
                  ${artistAppleMusicUrl ? `
                    <a href="${artistAppleMusicUrl}" target="_blank" class="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600">
                      🍎 Apple Music
                    </a>
                  ` : ""}
                  ${artistSoundCloudUrl ? `
                    <a href="${artistSoundCloudUrl}" target="_blank" class="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600">
                      ☁️ SoundCloud
                    </a>
                  ` : ""}
                </div>
              </div>
            </div>
            
            ${artistTracks.length > 0 ? `
              <div class="space-y-3">
                <h4 class="text-xl font-bold mb-4">Tracks</h4>
                ${artistTracks.map((track: any, idx: number) => `
                  <div class="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition">
                    <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style="background-color: ${themeColor};">
                      ${idx + 1}
                    </div>
                    ${track.coverArt ? `
                      <img src="${track.coverArt}" alt="${track.title}" class="w-12 h-12 rounded object-cover" />
                    ` : ""}
                    <div class="flex-1">
                      <div class="font-semibold">${track.title || 'Track'}</div>
                      ${track.duration ? `<div class="text-sm text-gray-500">${track.duration}</div>` : ""}
                    </div>
                    <button class="p-2 rounded-full hover:bg-gray-100" onclick="alert('Play ${track.title}');">
                      <svg class="w-6 h-6" style="color: ${themeColor};" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                `).join("")}
              </div>
            ` : ""}
          </div>
        </div>
      `;
    }

    case "deals": {
      const dealsTitle = content.title || "Special Offers";
      const dealsItems = content.deals || content.items || [];
      const dealsLayout = content.layout || "grid";
      
      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const themeColorDark = adjustColorBrightness(themeColor, -15);
      
      return `
        <div class="deals-block w-full px-4 py-8">
          <h3 class="text-3xl font-bold mb-8 text-center" style="color: ${themeColor};">${dealsTitle}</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${dealsItems.map((deal: any) => `
              <div class="relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-2" style="border-color: ${themeColor};">
                ${deal.badge ? `
                  <div class="absolute top-3 right-3 px-3 py-1 rounded-full text-white text-sm font-bold transform rotate-12" style="background-color: #ef4444;">
                    ${deal.badge}
                  </div>
                ` : ""}
                ${deal.image ? `
                  <img src="${deal.image}" alt="${deal.title}" class="w-full h-40 object-cover" />
                ` : ""}
                <div class="p-5">
                  <h4 class="text-xl font-bold mb-2" style="color: ${themeColor};">${deal.title || 'Deal'}</h4>
                  ${deal.description ? `<p class="text-gray-600 mb-3 text-sm">${deal.description}</p>` : ""}
                  ${deal.discountPercent ? `
                    <div class="inline-block px-2 py-1 rounded text-sm font-bold text-white mb-2" style="background-color: #ef4444;">
                      ${deal.discountPercent}% OFF
                    </div>
                  ` : ""}
                  ${(deal.originalPrice || deal.discountedPrice || deal.salePrice) ? `
                    <div class="flex items-center gap-3 mb-3">
                      ${deal.discountedPrice || deal.salePrice ? `<span class="text-2xl font-bold" style="color: ${themeColor};">$${typeof (deal.discountedPrice || deal.salePrice) === 'number' ? (deal.discountedPrice || deal.salePrice).toFixed(2) : (deal.discountedPrice || deal.salePrice)}</span>` : ""}
                      ${deal.originalPrice ? `<span class="text-lg text-gray-400 line-through">$${typeof deal.originalPrice === 'number' ? deal.originalPrice.toFixed(2) : deal.originalPrice}</span>` : ""}
                    </div>
                  ` : ""}
                  ${deal.expiresAt ? `
                    <div class="text-sm text-gray-500 mb-3">
                      ⏰ Expires: ${new Date(deal.expiresAt).toLocaleDateString()}
                    </div>
                  ` : ""}
                  ${deal.code ? `
                    <div class="mb-3 p-2 bg-gray-50 rounded border border-dashed" style="border-color: ${themeColor};">
                      <div class="text-xs text-gray-600 mb-1">Coupon Code:</div>
                      <div class="font-mono font-bold text-center" style="color: ${themeColor};">${deal.code}</div>
                    </div>
                  ` : ""}
                  <button 
                    class="w-full py-3 rounded-lg text-white font-semibold transition-colors"
                    style="background-color: ${themeColor};"
                    onmouseover="this.style.backgroundColor='${themeColorDark}'"
                    onmouseout="this.style.backgroundColor='${themeColor}'"
                    ${deal.url ? `onclick="window.open('${deal.url}', '_blank');"` : `onclick="alert('${deal.code ? `Use code: ${deal.code}` : 'Claim this deal!'}');"`}
                  >
                    ${deal.buttonText || (deal.url ? 'Shop Now' : 'Claim Deal')}
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    case "real-estate": {
      const realEstateTitle = content.title || "Featured Properties";
      const properties = content.properties || [];
      const showFilters = content.showFilters !== false;
      
      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      
      return `
        <div class="real-estate-block w-full px-4 py-8">
          <h3 class="text-3xl font-bold mb-8 text-center" style="color: ${themeColor};">${realEstateTitle}</h3>
          
          ${showFilters ? `
            <div class="flex flex-wrap gap-3 mb-6 justify-center">
              <select class="px-4 py-2 border rounded-lg" style="border-color: ${themeColor}33;">
                <option>All Types</option>
                <option>House</option>
                <option>Apartment</option>
                <option>Condo</option>
              </select>
              <select class="px-4 py-2 border rounded-lg" style="border-color: ${themeColor}33;">
                <option>All Prices</option>
                <option>Under $500k</option>
                <option>$500k - $1M</option>
                <option>Over $1M</option>
              </select>
              <select class="px-4 py-2 border rounded-lg" style="border-color: ${themeColor}33;">
                <option>Any Beds</option>
                <option>1+</option>
                <option>2+</option>
                <option>3+</option>
                <option>4+</option>
              </select>
            </div>
          ` : ""}
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${properties.map((property: any) => `
              <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                ${property.image ? `
                  <div class="relative">
                    <img src="${property.image}" alt="${property.title}" class="w-full h-48 object-cover" />
                    ${property.status ? `
                      <div class="absolute top-3 left-3 px-3 py-1 rounded-full text-white text-sm font-bold" style="background-color: ${themeColor};">
                        ${property.status}
                      </div>
                    ` : ""}
                  </div>
                ` : ""}
                <div class="p-5">
                  <div class="text-2xl font-bold mb-2" style="color: ${themeColor};">${property.price || '$0'}</div>
                  <h4 class="font-semibold text-lg mb-2">${property.title || 'Property'}</h4>
                  ${property.address ? `
                    <div class="text-sm text-gray-600 mb-3 flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      ${property.address}
                    </div>
                  ` : ""}
                  <div class="flex gap-4 text-sm text-gray-600 mb-4">
                    ${property.beds ? `<span>🛏️ ${property.beds} beds</span>` : ""}
                    ${property.baths ? `<span>🛁 ${property.baths} baths</span>` : ""}
                    ${property.sqft ? `<span>📐 ${property.sqft} sqft</span>` : ""}
                  </div>
                  <button 
                    class="w-full py-2 rounded-lg text-white font-semibold"
                    style="background-color: ${themeColor};"
                    onclick="alert('Schedule a viewing for ${property.title}');"
                  >
                    Schedule Viewing
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    case "menu": {
      const menuTitle = content.title || "";
      const categories = content.categories || [];
      const flatItems = content.items || [];
      const menuStyle = content.style || "elegant";
      const showImages = content.showImages !== false;
      const showDescriptions = content.showDescriptions !== false;
      const showBadges = content.showBadges !== false;
      const currency = content.currency || "USD";
      
      const themeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#6366f1";

      // Currency formatting
      const currencySymbols: Record<string, string> = {
        USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$',
        JPY: '¥', CNY: '¥', KRW: '₩', MXN: 'MX$', BRL: 'R$', AED: 'د.إ',
        SAR: '﷼', CHF: 'CHF', SGD: 'S$', HKD: 'HK$',
      };
      const formatPrice = (price: any): string => {
        if (typeof price === 'string') return price;
        const symbol = currencySymbols[currency] || '$';
        return `${symbol}${Number(price).toFixed(2)}`;
      };

      // Build categories from flat items if needed
      const menuCategories: any[] = categories.length > 0 
        ? categories 
        : flatItems.length > 0 
          ? [{ name: 'Menu', items: flatItems }]
          : [];

      if (menuCategories.length === 0) {
        return `<div class="menu-block w-full px-4 py-6 text-center text-gray-400">No menu items</div>`;
      }

      // Badge HTML helper
      const badgeConfig: Record<string, { emoji: string; color: string; label: string }> = {
        'popular': { emoji: '⭐', color: '#F59E0B', label: 'Popular' },
        'new': { emoji: '✨', color: '#8B5CF6', label: 'New' },
        'spicy': { emoji: '🌶️', color: '#EF4444', label: 'Spicy' },
        'vegetarian': { emoji: '🌿', color: '#22C55E', label: 'Vegetarian' },
        'vegan': { emoji: '🌱', color: '#10B981', label: 'Vegan' },
        'gluten-free': { emoji: '🥗', color: '#F97316', label: 'GF' },
        'chef-special': { emoji: '👨‍🍳', color: themeColor, label: "Chef's Special" },
      };
      const renderBadge = (badge: string): string => {
        const cfg = badgeConfig[badge];
        if (!cfg) return '';
        return `<span class="menu-badge" style="background-color: ${cfg.color}20; color: ${cfg.color};">${cfg.emoji} ${cfg.label}</span>`;
      };
      const renderBadges = (badges: string[]): string => {
        if (!showBadges || !badges || badges.length === 0) return '';
        return `<div class="flex flex-wrap gap-1.5">${badges.map(renderBadge).join('')}</div>`;
      };

      // ── Render item per style ──
      const renderItem = (item: any, index: number): string => {
        const badges = item.badges || [];
        const hasImage = showImages && item.image && !String(item.image).startsWith('{');
        const desc = showDescriptions && item.description ? item.description : '';

        // ─ ELEGANT ─
        if (menuStyle === 'elegant') {
          return `
            <div class="menu-item-elegant" style="--accent-color: ${themeColor};">
              ${hasImage ? `<div class="item-image"><img src="${item.image}" alt="${item.name || ''}" loading="lazy" /></div>` : ''}
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <h4 class="font-bold text-lg" style="color: inherit;">${item.name || 'Item'}</h4>
                  <div class="flex items-baseline gap-2 flex-shrink-0">
                    ${item.originalPrice ? `<span class="text-sm line-through text-gray-400">${formatPrice(item.originalPrice)}</span>` : ''}
                    <span class="font-black text-lg" style="color: ${item.originalPrice ? '#EF4444' : themeColor};">${formatPrice(item.price)}</span>
                  </div>
                </div>
                ${desc ? `<p class="text-sm text-gray-600 mb-3 leading-relaxed">${desc}</p>` : ''}
                <div class="flex items-center justify-between">
                  ${renderBadges(badges)}
                  ${item.prepTime ? `<span class="text-sm text-gray-500 flex items-center gap-1">🕐 ${item.prepTime}</span>` : ''}
                </div>
              </div>
            </div>
            ${index < (menuCategories.length > 1 ? menuCategories[0].items.length : flatItems.length) - 1 ? '<div class="menu-divider"></div>' : ''}
          `;
        }

        // ─ MODERN / CARDS ─
        if (menuStyle === 'modern' || menuStyle === 'cards') {
          return `
            <div class="menu-item-card">
              ${hasImage ? `
                <div class="card-image">
                  <img src="${item.image}" alt="${item.name || ''}" loading="lazy" />
                  ${showBadges && badges.length > 0 ? `<div class="badge-overlay">${badges.slice(0, 2).map(renderBadge).join('')}</div>` : ''}
                  <div class="price-tag" style="color: ${themeColor};">${formatPrice(item.price)}</div>
                </div>
              ` : ''}
              <div class="p-5">
                <h4 class="font-semibold text-base mb-1" style="color: inherit;">${item.name || 'Item'}</h4>
                ${desc ? `<p class="text-sm text-gray-500 mb-3 leading-relaxed line-clamp-2">${desc}</p>` : ''}
                <div class="flex items-center justify-between">
                  ${item.prepTime ? `<span class="text-xs text-gray-400 flex items-center gap-1">🕐 ${item.prepTime}</span>` : ''}
                  ${!hasImage ? `<span class="font-bold" style="color: ${themeColor};">${formatPrice(item.price)}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }

        // ─ MINIMAL ─
        if (menuStyle === 'minimal') {
          return `
            <div class="menu-item-minimal">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h4 class="font-medium" style="color: inherit;">${item.name || 'Item'}</h4>
                  ${showBadges && badges.includes('popular') ? '<span style="color: #F59E0B;">⭐</span>' : ''}
                </div>
                ${desc ? `<p class="text-sm text-gray-500 mt-0.5">${desc}</p>` : ''}
              </div>
              <div class="dotted-line"></div>
              <span class="font-semibold" style="color: ${themeColor};">${formatPrice(item.price)}</span>
            </div>
          `;
        }

        // ─ COMPACT ─
        if (menuStyle === 'compact') {
          return `
            <div class="menu-item-compact" style="--accent-color-light: ${themeColor}10;">
              ${hasImage ? `<img class="compact-image" src="${item.image}" alt="${item.name || ''}" loading="lazy" />` : ''}
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-sm" style="color: inherit;">${item.name || 'Item'}</h4>
                ${showBadges && badges.length > 0 ? `
                  <div class="flex gap-1 mt-0.5">
                    ${badges.slice(0, 2).map((b: string) => `<span class="text-xs px-1.5 py-0.5 rounded" style="background-color: ${themeColor}15; color: ${themeColor};">${b}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
              <span class="font-semibold text-sm" style="color: ${themeColor};">${formatPrice(item.price)}</span>
            </div>
          `;
        }

        // ─ PHOTO-GRID (default fallback) ─
        return `
          <div class="menu-item-photo">
            ${hasImage ? `<img src="${item.image}" alt="${item.name || ''}" loading="lazy" />` : `
              <div class="w-full h-full flex items-center justify-center" style="background-color: ${themeColor}20;">
                <span style="font-size: 3rem;">🍽️</span>
              </div>
            `}
            <div class="photo-overlay">
              <h4>${item.name || 'Item'}</h4>
              <div class="flex items-center justify-between mt-1">
                <span class="photo-price">${formatPrice(item.price)}</span>
                ${showBadges && badges.includes('popular') ? '<span style="color: #FBBF24; font-size: 0.75rem;">⭐ Popular</span>' : ''}
              </div>
            </div>
          </div>
        `;
      };

      // ── Grid class based on style ──
      const getGridClass = (): string => {
        if (menuStyle === 'modern' || menuStyle === 'cards') return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
        if (menuStyle === 'photo-grid') return 'grid grid-cols-2 sm:grid-cols-3 gap-3';
        return 'space-y-1';
      };

      // ── Category tabs (when multiple categories) ──
      const hasTabs = menuCategories.length > 1;
      const tabsHtml = hasTabs ? `
        <div class="menu-category-tabs" data-menu-tabs>
          ${menuCategories.map((cat: any, idx: number) => `
            <button class="menu-category-tab" 
              data-tab-index="${idx}"
              style="background-color: ${idx === 0 ? themeColor : themeColor + '10'}; color: ${idx === 0 ? '#ffffff' : themeColor};"
            >
              <span>${cat.name || 'Category'}</span>
              <span class="tab-count" style="background-color: ${idx === 0 ? 'rgba(255,255,255,0.2)' : themeColor + '20'};">${(cat.items || []).length}</span>
            </button>
          `).join('')}
        </div>
      ` : '';

      // ── Category content panels ──
      const categoriesHtml = menuCategories.map((cat: any, catIdx: number) => {
        const items = cat.items || [];
        if (hasTabs) {
          return `
            <div class="menu-category-content ${catIdx === 0 ? 'active' : ''}" data-tab-content="${catIdx}">
              <div class="${getGridClass()}">
                ${items.map((item: any, idx: number) => renderItem(item, idx)).join('')}
              </div>
            </div>
          `;
        }
        // No tabs — show all categories with headers
        return `
          <div class="mb-8">
            <h4 class="text-xl font-bold mb-4 pb-2 border-b-2" style="color: ${themeColor}; border-color: ${themeColor};">
              ${cat.name || 'Category'}
            </h4>
            <div class="${getGridClass()}">
              ${items.map((item: any, idx: number) => renderItem(item, idx)).join('')}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="menu-block w-full px-4 py-6" style="--accent-color: ${themeColor};">
          ${menuTitle ? `<h3 class="text-2xl sm:text-3xl font-bold mb-6 text-center" style="color: ${themeColor};">${menuTitle}</h3>` : ''}
          <div class="max-w-4xl mx-auto">
            ${tabsHtml}
            ${categoriesHtml}
          </div>
        </div>
      `;
    }
      
    // ══════════════════════════════════════════════════════════
    // LINK BUTTON - Linktree-style link buttons (core block)
    // ══════════════════════════════════════════════════════════
    case "linkButton": {
      const btnUrl = content.url || "#";
      const btnLabel = content.label || content.title || "Link";
      const btnDescription = content.description || "";
      const btnThumbnail = content.thumbnail || "";
      const btnIcon = content.icon || "";
      const blockStyle = block.style || {};
      const variant = blockStyle.variant || "fill";
      const bgColor = blockStyle.backgroundColor || theme?.button?.backgroundColor || theme?.branding?.primaryColor || "#3b82f6";
      const textColor = blockStyle.textColor || theme?.button?.textColor || "#ffffff";
      const borderRadius = blockStyle.borderRadius || "rounded-xl";
      const shadow = blockStyle.shadow || "md";
      const size = blockStyle.size || "medium";

      // Platform detection for branded buttons
      const platformColors: Record<string, string> = {
        "spotify.com": "#1DB954",
        "music.apple.com": "#FA243C",
        "youtube.com": "#FF0000", "youtu.be": "#FF0000",
        "instagram.com": "#E4405F",
        "tiktok.com": "#000000",
        "twitter.com": "#1DA1F2", "x.com": "#000000",
        "facebook.com": "#1877F2",
        "linkedin.com": "#0A66C2",
        "github.com": "#181717",
        "discord.gg": "#5865F2", "discord.com": "#5865F2",
        "twitch.tv": "#9146FF",
        "snapchat.com": "#FFFC00",
        "pinterest.com": "#E60023",
        "whatsapp.com": "#25D366", "wa.me": "#25D366",
      };

      let detectedColor = "";
      for (const [domain, color] of Object.entries(platformColors)) {
        if (String(btnUrl).includes(domain)) { detectedColor = color; break; }
      }

      const effectiveBg = blockStyle.backgroundColor || detectedColor || bgColor;

      // Variant styles
      const variantStyles: Record<string, string> = {
        fill: `background-color: ${effectiveBg}; color: ${textColor}; border: none;`,
        solid: `background-color: ${effectiveBg}; color: ${textColor}; border: none;`,
        outline: `background-color: transparent; color: ${effectiveBg}; border: 2px solid ${effectiveBg};`,
        soft: `background-color: ${effectiveBg}20; color: ${effectiveBg}; border: none;`,
        shadow: `background-color: ${effectiveBg}; color: ${textColor}; border: none; box-shadow: 0 8px 24px -6px ${effectiveBg}50;`,
        glass: `background-color: rgba(255,255,255,0.12); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: ${textColor}; border: 1px solid rgba(255,255,255,0.25);`,
        gradient: `background: linear-gradient(135deg, ${effectiveBg}, ${effectiveBg}dd); color: ${textColor}; border: none;`,
      };

      const shadowClasses: Record<string, string> = {
        none: "", sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg", xl: "shadow-xl",
      };

      const sizeClasses: Record<string, string> = {
        small: "py-2.5 px-4 text-sm",
        medium: "py-3.5 px-5 text-base",
        large: "py-4.5 px-6 text-lg",
      };

      const thumbnailHtml = btnThumbnail && !btnThumbnail.startsWith('{')
        ? `<img src="${btnThumbnail}" alt="" class="w-10 h-10 rounded-lg object-cover flex-shrink-0" onerror="this.style.display='none'" />`
        : "";

      const descriptionHtml = btnDescription && !btnDescription.startsWith('{')
        ? `<span class="text-xs opacity-70 block">${btnDescription}</span>`
        : "";

      return `
        <a href="${btnUrl}" target="_blank" rel="noopener noreferrer"
           class="link-button-hover btn-press block w-full ${borderRadius} ${shadowClasses[shadow] || 'shadow-md'} ${sizeClasses[size] || 'py-3.5 px-5 text-base'} font-semibold text-center no-underline"
           style="${variantStyles[variant] || variantStyles.fill} min-height: 48px; display: flex; align-items: center; justify-content: center; gap: 0.75rem; text-decoration: none;">
          ${thumbnailHtml}
          <div class="flex flex-col items-center flex-1">
            <span>${btnLabel}</span>
            ${descriptionHtml}
          </div>
        </a>
      `;
    }

    // ══════════════════════════════════════════════════════════
    // SOCIAL - Social media links (maps to frontend 'social' type)
    // ══════════════════════════════════════════════════════════
    case "social": {
      const blockStyle = block.style || {};
      const iconSize = blockStyle.iconSize || 40;
      const layout = blockStyle.layout || "row";
      const styleVariant = blockStyle.style || "filled";
      
      // Social platform definitions with colors and URL patterns
      const platformDefs: Record<string, { label: string; color: string; gradient: string; emoji: string; getUrl: (v: string) => string }> = {
        instagram: { label: "Instagram", color: "#E4405F", gradient: "linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)", emoji: "📷", getUrl: (v) => `https://instagram.com/${v.replace('@', '')}` },
        tiktok: { label: "TikTok", color: "#000000", gradient: "linear-gradient(135deg, #00f2ea 0%, #ff0050 100%)", emoji: "🎵", getUrl: (v) => `https://tiktok.com/@${v.replace('@', '')}` },
        youtube: { label: "YouTube", color: "#FF0000", gradient: "linear-gradient(135deg, #FF0000 0%, #CC0000 100%)", emoji: "📺", getUrl: (v) => `https://youtube.com/@${v.replace('@', '')}` },
        x: { label: "X", color: "#000000", gradient: "linear-gradient(135deg, #000000 0%, #14171A 100%)", emoji: "𝕏", getUrl: (v) => `https://x.com/${v.replace('@', '')}` },
        twitter: { label: "X", color: "#1DA1F2", gradient: "linear-gradient(135deg, #1DA1F2 0%, #0d8ecf 100%)", emoji: "𝕏", getUrl: (v) => `https://x.com/${v.replace('@', '')}` },
        threads: { label: "Threads", color: "#000000", gradient: "linear-gradient(135deg, #000000 0%, #333333 100%)", emoji: "🧵", getUrl: (v) => `https://threads.net/@${v.replace('@', '')}` },
        facebook: { label: "Facebook", color: "#1877F2", gradient: "linear-gradient(135deg, #1877F2 0%, #0C5ECF 100%)", emoji: "📘", getUrl: (v) => `https://facebook.com/${v}` },
        linkedin: { label: "LinkedIn", color: "#0A66C2", gradient: "linear-gradient(135deg, #0A66C2 0%, #004182 100%)", emoji: "💼", getUrl: (v) => `https://linkedin.com/in/${v}` },
        whatsapp: { label: "WhatsApp", color: "#25D366", gradient: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", emoji: "💬", getUrl: (v) => `https://wa.me/${v.replace(/[^0-9]/g, '')}` },
        telegram: { label: "Telegram", color: "#26A5E4", gradient: "linear-gradient(135deg, #26A5E4 0%, #0088cc 100%)", emoji: "✈️", getUrl: (v) => `https://t.me/${v}` },
        discord: { label: "Discord", color: "#5865F2", gradient: "linear-gradient(135deg, #5865F2 0%, #7289DA 100%)", emoji: "🎮", getUrl: (v) => `https://discord.gg/${v}` },
        twitch: { label: "Twitch", color: "#9146FF", gradient: "linear-gradient(135deg, #9146FF 0%, #6441A5 100%)", emoji: "🎮", getUrl: (v) => `https://twitch.tv/${v}` },
        snapchat: { label: "Snapchat", color: "#FFFC00", gradient: "linear-gradient(135deg, #FFFC00 0%, #FFE600 100%)", emoji: "👻", getUrl: (v) => `https://snapchat.com/add/${v}` },
        pinterest: { label: "Pinterest", color: "#E60023", gradient: "linear-gradient(135deg, #E60023 0%, #BD081C 100%)", emoji: "📌", getUrl: (v) => `https://pinterest.com/${v}` },
        spotify: { label: "Spotify", color: "#1DB954", gradient: "linear-gradient(135deg, #1DB954 0%, #1ed760 100%)", emoji: "🎵", getUrl: (v) => v.startsWith("http") ? v : `https://open.spotify.com/artist/${v}` },
        github: { label: "GitHub", color: "#181717", gradient: "linear-gradient(135deg, #181717 0%, #333333 100%)", emoji: "🐙", getUrl: (v) => `https://github.com/${v}` },
        phone: { label: "Phone", color: "#10B981", gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)", emoji: "📞", getUrl: (v) => `tel:${v}` },
        email: { label: "Email", color: "#EA4335", gradient: "linear-gradient(135deg, #EA4335 0%, #FBBC04 50%, #34A853 100%)", emoji: "📧", getUrl: (v) => `mailto:${v}` },
        website: { label: "Website", color: "#6366F1", gradient: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)", emoji: "🌐", getUrl: (v) => v.startsWith("http") ? v : `https://${v}` },
      };

      // Support both old format (links object) and new format (socialLinks array)
      const oldLinks = content.links || {};
      const newLinks = content.socialLinks || [];
      
      let socialItems: { platformId: string; value: string }[] = [];
      if (Array.isArray(newLinks) && newLinks.length > 0) {
        socialItems = newLinks.filter((l: any) => l.value).map((l: any) => ({ platformId: l.platformId, value: l.value }));
      } else if (typeof oldLinks === 'object' && !Array.isArray(oldLinks)) {
        socialItems = Object.entries(oldLinks as Record<string, string>)
          .filter(([_, v]) => v)
          .map(([platformId, value]) => ({ platformId: platformId === 'twitter' ? 'x' : platformId, value }));
      }

      if (socialItems.length === 0) return "";

      const iconSizePx = typeof iconSize === 'number' ? iconSize : 40;
      const innerIconPx = iconSizePx <= 32 ? 16 : iconSizePx <= 40 ? 20 : 24;
      const gapClass = layout === "grid" ? "gap-3" : "gap-2";
      const layoutClass = layout === "grid" 
        ? "flex flex-wrap justify-center" 
        : layout === "stacked" || layout === "column"
          ? "flex flex-col items-center"
          : "flex flex-wrap justify-center";

      const renderSocialIcon = (item: { platformId: string; value: string }) => {
        const platform = platformDefs[item.platformId];
        if (!platform) return "";
        const url = platform.getUrl(item.value);

        // SVG icons for common platforms (better than emojis)
        const svgIcons: Record<string, string> = {
          instagram: `<svg width="${innerIconPx}" height="${innerIconPx}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
          tiktok: `<svg width="${innerIconPx}" height="${innerIconPx}" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.4a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.8a4.83 4.83 0 0 1-1-.11z"/></svg>`,
          youtube: `<svg width="${innerIconPx}" height="${innerIconPx}" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
          x: `<svg width="${innerIconPx}" height="${innerIconPx}" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
          facebook: `<svg width="${innerIconPx}" height="${innerIconPx}" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
          linkedin: `<svg width="${innerIconPx}" height="${innerIconPx}" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
          spotify: `<svg width="${innerIconPx}" height="${innerIconPx}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`,
          github: `<svg width="${innerIconPx}" height="${innerIconPx}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
          whatsapp: `<svg width="${innerIconPx}" height="${innerIconPx}" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`,
          telegram: `<svg width="${innerIconPx}" height="${innerIconPx}" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
        };

        const svgIcon = svgIcons[item.platformId] || `<span style="font-size: ${innerIconPx}px;">${platform.emoji}</span>`;

        if (styleVariant === "filled") {
          return `
            <a href="${url}" target="_blank" rel="noopener noreferrer" title="${platform.label}"
               style="display: inline-flex; align-items: center; justify-content: center; width: ${iconSizePx}px; height: ${iconSizePx}px; border-radius: 50%; background: ${platform.gradient}; color: white; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px ${platform.color}40;"
               onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              ${svgIcon}
            </a>
          `;
        }
        if (styleVariant === "outline") {
          return `
            <a href="${url}" target="_blank" rel="noopener noreferrer" title="${platform.label}"
               style="display: inline-flex; align-items: center; justify-content: center; width: ${iconSizePx}px; height: ${iconSizePx}px; border-radius: 50%; border: 2px solid ${platform.color}; color: ${platform.color}; text-decoration: none; transition: transform 0.2s;"
               onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              ${svgIcon}
            </a>
          `;
        }
        // minimal
        return `
          <a href="${url}" target="_blank" rel="noopener noreferrer" title="${platform.label}"
             style="display: inline-flex; align-items: center; justify-content: center; width: ${iconSizePx}px; height: ${iconSizePx}px; color: ${platform.color}; text-decoration: none; transition: transform 0.2s, opacity 0.2s; opacity: 0.8;"
             onmouseover="this.style.transform='scale(1.1)'; this.style.opacity='1'" onmouseout="this.style.transform='scale(1)'; this.style.opacity='0.8'">
            ${svgIcon}
          </a>
        `;
      };

      return `
        <div class="${layoutClass} ${gapClass}" style="padding: 0.5rem 0;">
          ${socialItems.map(renderSocialIcon).join("")}
        </div>
      `;
    }

    // ══════════════════════════════════════════════════════════
    // TESTIMONIAL - Customer quotes/reviews
    // ══════════════════════════════════════════════════════════
    case "testimonial": {
      const items = content.items || [{ quote: "Great product!", author: "Customer", rating: 5 }];
      const testimonialLayout = content.layout || "single";
      const style = content.style || "elegant";
      const showRating = content.showRating ?? true;
      const showAvatar = content.showAvatar ?? true;
      const showCompany = content.showCompany ?? true;
      const primaryColor = theme?.branding?.primaryColor || "#6366f1";

      const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) =>
          `<svg class="w-4 h-4 ${i < rating ? '' : 'opacity-30'}" fill="${i < rating ? '#facc15' : '#d1d5db'}" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`
        ).join("");
      };

      const renderTestimonial = (item: any, index: number) => {
        return `
          <div class="p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm" style="break-inside: avoid;">
            ${showRating && item.rating ? `<div class="flex gap-0.5 mb-3">${renderStars(item.rating)}</div>` : ""}
            <blockquote class="text-gray-700 mb-4 leading-relaxed italic" style="font-size: clamp(0.875rem, 2.5vw, 1rem);">
              <svg class="w-6 h-6 mb-2 opacity-20" fill="${primaryColor}" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
              "${item.quote}"
            </blockquote>
            <div class="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
              ${showAvatar && item.avatar ? `<img src="${item.avatar}" alt="${item.author}" class="w-10 h-10 rounded-full object-cover" />` : `<div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style="background: ${primaryColor};">${(item.author || 'A')[0].toUpperCase()}</div>`}
              <div>
                <p class="font-semibold text-sm text-gray-900">${item.author || "Anonymous"}</p>
                ${showCompany && (item.role || item.company) ? `<p class="text-xs text-gray-500">${item.role || ""}${item.role && item.company ? " at " : ""}${item.company || ""}</p>` : ""}
              </div>
            </div>
          </div>
        `;
      };

      const gridClass = testimonialLayout === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4";

      return `
        <div class="${gridClass}">
          ${(items as any[]).map(renderTestimonial).join("")}
        </div>
      `;
    }

    // ══════════════════════════════════════════════════════════
    // FORM - Contact, newsletter, waitlist forms
    // ══════════════════════════════════════════════════════════
    case "form": {
      const formType = content.formType || "contact";
      const formTitle = content.title || (formType === "newsletter" ? "Subscribe" : formType === "waitlist" ? "Join the Waitlist" : "Get in Touch");
      const formSubtitle = content.subtitle || "";
      const submitLabel = content.submitLabel || (formType === "newsletter" ? "Subscribe" : formType === "waitlist" ? "Join Now" : "Send Message");
      const successMessage = content.successMessage || "Thank you! We'll be in touch.";
      const formStyle = content.style || "default";
      const accentColor = content.accentColor || theme?.button?.backgroundColor || theme?.branding?.primaryColor || "#8b5cf6";
      const fields = content.fields || [];
      const inputStyle = content.inputStyle || "rounded";
      
      const inputBorderRadius = inputStyle === "rounded" ? "0.75rem" : inputStyle === "pill" ? "9999px" : "0.375rem";

      // Default fields based on form type
      const defaultFields: Record<string, any[]> = {
        contact: [
          { type: "text", label: "Name", placeholder: "Your name", required: true },
          { type: "email", label: "Email", placeholder: "your@email.com", required: true },
          { type: "textarea", label: "Message", placeholder: "Your message...", required: true, rows: 4 },
        ],
        newsletter: [
          { type: "email", label: "Email", placeholder: "your@email.com", required: true },
        ],
        waitlist: [
          { type: "text", label: "Name", placeholder: "Your name", required: true },
          { type: "email", label: "Email", placeholder: "your@email.com", required: true },
        ],
        feedback: [
          { type: "email", label: "Email", placeholder: "your@email.com", required: false },
          { type: "textarea", label: "Feedback", placeholder: "Tell us what you think...", required: true, rows: 4 },
        ],
      };

      const formFields = (Array.isArray(fields) && fields.length > 0) ? fields : (defaultFields[formType as string] || defaultFields.contact);

      const isGradient = formStyle === "gradient";
      const containerStyle = isGradient
        ? `background: linear-gradient(135deg, ${accentColor}, ${adjustColorBrightness(accentColor, -20)}); border-radius: 1rem; padding: 2rem; color: white;`
        : formStyle === "glass"
          ? `background: rgba(255,255,255,0.1); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.2); border-radius: 1rem; padding: 2rem;`
          : formStyle === "card"
            ? `background: white; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 2rem; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);`
            : `padding: 1rem 0;`;

      const inputClasses = isGradient
        ? `background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; placeholder-color: rgba(255,255,255,0.6);`
        : `background: #f9fafb; border: 1px solid #e5e7eb; color: #111827;`;

      return `
        <div style="${containerStyle}">
          ${formTitle ? `<h3 class="text-xl font-bold mb-1" style="color: ${isGradient ? 'white' : 'inherit'};">${formTitle}</h3>` : ""}
          ${formSubtitle ? `<p class="text-sm mb-4 opacity-70">${formSubtitle}</p>` : ""}
          <form data-microsite-form="${formType}" onsubmit="event.preventDefault(); this.querySelector('.form-success').style.display='flex'; this.querySelector('.form-fields').style.display='none';">
            <div class="form-fields space-y-3">
              ${(formFields as any[]).map((field: any) => {
                if (field.type === "textarea") {
                  return `<textarea name="${field.label}" placeholder="${field.placeholder || field.label}" rows="${field.rows || 3}" ${field.required ? "required" : ""} class="w-full px-4 py-3 transition-colors focus:outline-none focus:ring-2" style="${inputClasses} border-radius: ${inputBorderRadius}; focus-ring-color: ${accentColor};"></textarea>`;
                }
                return `<input type="${field.type || 'text'}" name="${field.label}" placeholder="${field.placeholder || field.label}" ${field.required ? "required" : ""} class="w-full px-4 py-3 transition-colors focus:outline-none focus:ring-2" style="${inputClasses} border-radius: ${inputBorderRadius};" />`;
              }).join("")}
              <button type="submit" class="w-full py-3 px-6 font-semibold rounded-xl text-white transition-all hover:opacity-90 active:scale-[0.98]" style="background: ${accentColor}; border: none; cursor: pointer; min-height: 48px;">
                ${submitLabel}
              </button>
            </div>
            <div class="form-success hidden items-center justify-center gap-2 py-8 text-center" style="display: none;">
              <svg class="w-8 h-8" fill="${isGradient ? 'white' : accentColor}" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <p class="text-lg font-semibold">${successMessage}</p>
            </div>
          </form>
        </div>
      `;
    }

    // ══════════════════════════════════════════════════════════
    // CALENDAR / EVENTS - Event listings
    // ══════════════════════════════════════════════════════════
    case "calendar":
    case "events": {
      const events = content.events || content.items || [];
      const eventsTitle = content.title || "Upcoming Events";
      const showDescription = content.showDescription ?? true;
      const showLocation = content.showLocation ?? true;
      const primaryColor = theme?.branding?.primaryColor || "#6366f1";

      if (!Array.isArray(events) || events.length === 0) {
        return `<div class="text-center py-8 text-gray-400">No upcoming events</div>`;
      }

      return `
        <div class="space-y-3">
          <h3 class="text-xl font-bold mb-4">${eventsTitle}</h3>
          ${(events as any[]).map((event: any) => {
            const date = event.date ? new Date(event.date) : null;
            const month = date ? date.toLocaleString('en', { month: 'short' }).toUpperCase() : "";
            const day = date ? date.getDate() : "";
            return `
              <div class="flex gap-4 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-100 shadow-sm">
                ${date ? `
                  <div class="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold" style="background: ${primaryColor};">
                    <span class="text-[10px] font-semibold uppercase tracking-wider opacity-80">${month}</span>
                    <span class="text-xl font-bold leading-none">${day}</span>
                  </div>
                ` : ""}
                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-sm truncate">${event.title || "Event"}</h4>
                  ${event.time ? `<p class="text-xs text-gray-500 mt-0.5">🕐 ${event.time}</p>` : ""}
                  ${showLocation && event.location ? `<p class="text-xs text-gray-500 mt-0.5">📍 ${event.location}</p>` : ""}
                  ${showDescription && event.description ? `<p class="text-xs text-gray-400 mt-1 line-clamp-2">${event.description}</p>` : ""}
                  ${event.link ? `<a href="${event.link}" target="_blank" class="inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full text-white" style="background: ${primaryColor};">Details</a>` : ""}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    default:
      return `<!-- Unknown block type: ${block.type} -->`;
  }
}

// Helper to extract YouTube video ID
function extractYouTubeId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return "";
}

// Helper to get social media icons
function getSocialIcon(platform: string): string {
  const icons: Record<string, string> = {
    facebook: "📘",
    twitter: "🐦",
    instagram: "📷",
    linkedin: "💼",
    github: "🐙",
    youtube: "📺",
    tiktok: "🎵",
    email: "📧",
    website: "🌐",
  };
  
  return icons[platform?.toLowerCase()] || "🔗";
}
