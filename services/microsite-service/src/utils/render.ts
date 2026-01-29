/**
 * Generate CSS for theme background (supports solid colors and gradients)
 */
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
        layout?.map((block: any) => renderBlock(block, theme)).join("") || ""
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
          console.error("Error parsing video URL:", error);
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
      const socialLinks = content.links || [];
      return `
        <div class="flex gap-4 justify-center">
          ${socialLinks.map((link: any) => `
            <a href="${link.url}" target="_blank" class="text-gray-600 hover:text-gray-900 transition-colors">
              <span class="text-2xl">${getSocialIcon(link.platform)}</span>
            </a>
          `).join("")}
        </div>
      `;
      
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
                <${wrapperTag} ${wrapperAttrs} class="group relative ${galleryAspectClass} overflow-hidden transition-all duration-300 ${hasLink ? 'cursor-pointer' : ''}" style="border-radius: ${galleryBorderRadius}px;">
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
      
    case "countdown":
      const targetDate = content.targetDate || new Date().toISOString();
      const countdownTitle = content.title || "Countdown";
      const showLabels = content.showLabels !== false;
      
      // Get theme color for countdown background
      const countdownThemeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const countdownThemeColorDark = adjustColorBrightness(countdownThemeColor, -15);
      
      return `
        <div class="rounded-xl p-6 text-white" style="background: linear-gradient(to bottom right, ${countdownThemeColor}, ${countdownThemeColorDark});">
          <h3 class="text-xl font-bold text-center mb-4">${countdownTitle}</h3>
          <div class="grid grid-cols-4 gap-4 text-center" data-countdown="${targetDate}">
            <div>
              <div class="text-3xl font-bold" data-countdown-days>0</div>
              ${showLabels ? '<div class="text-sm opacity-80 mt-1">Days</div>' : ''}
            </div>
            <div>
              <div class="text-3xl font-bold" data-countdown-hours>0</div>
              ${showLabels ? '<div class="text-sm opacity-80 mt-1">Hours</div>' : ''}
            </div>
            <div>
              <div class="text-3xl font-bold" data-countdown-minutes>0</div>
              ${showLabels ? '<div class="text-sm opacity-80 mt-1">Minutes</div>' : ''}
            </div>
            <div>
              <div class="text-3xl font-bold" data-countdown-seconds>0</div>
              ${showLabels ? '<div class="text-sm opacity-80 mt-1">Seconds</div>' : ''}
            </div>
          </div>
        </div>
      `;
      
    case "stats":
      const statsItems = content.items || [];
      const statsColumns = content.columns || 3;
      const statsGridCols = statsColumns === 2 ? "grid-cols-2" : statsColumns === 4 ? "grid-cols-4" : "grid-cols-3";
      
      // Get theme color for stats
      const statsThemeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      
      return `
        <div class="grid ${statsGridCols} gap-6">
          ${statsItems.map((stat: any) => `
            <div class="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <div class="text-4xl font-bold mb-2" style="color: ${statsThemeColor};" data-countup="${stat.value || 0}" data-countup-duration="${stat.duration || 2000}">
                0
              </div>
              <div class="text-sm font-medium text-gray-600">
                ${stat.label || ""}
              </div>
              ${stat.description ? `<div class="text-xs text-gray-500 mt-1">${stat.description}</div>` : ''}
            </div>
          `).join("")}
        </div>
      `;
      
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
      const displayName = content.displayName || "Your Name";
      const bio = content.bio || "";
      const location = content.location || "";
      const website = content.website || "";
      const avatarSize = content.avatarSize || block.style?.avatarSize || 96;
      const textAlign = content.textAlign || block.style?.textAlign || "center";
      const nameSize = content.nameSize || block.style?.nameSize || "text-2xl";
      const bioSize = content.bioSize || block.style?.bioSize || "text-base";
      const showLocation = content.showLocation ?? block.style?.showLocation ?? true;
      const showWebsite = content.showWebsite ?? block.style?.showWebsite ?? true;

      // Get theme color for profile avatar gradient
      const profileThemeColor = theme?.branding?.primaryColor || theme?.button?.backgroundColor || "#8b5cf6";
      const profileThemeColorDark = adjustColorBrightness(profileThemeColor, -15);

      const alignClass = textAlign === "left" ? "items-start text-left" : textAlign === "right" ? "items-end text-right" : "items-center text-center";
      
      return `
        <div class="profile-block w-full px-4 py-6 flex flex-col ${alignClass}">
          <!-- Avatar -->
          <div class="mb-4">
            ${avatarUrl ? `
              <img 
                src="${avatarUrl}" 
                alt="${displayName}"
                class="rounded-full object-cover shadow-lg border-4 border-white"
                style="width: ${avatarSize}px; height: ${avatarSize}px;"
              />
            ` : `
              <div 
                class="rounded-full flex items-center justify-center shadow-lg"
                style="width: ${avatarSize}px; height: ${avatarSize}px; background: linear-gradient(to bottom right, ${profileThemeColor}, ${profileThemeColorDark});"
              >
                <svg class="w-1/2 h-1/2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            `}
          </div>

          <!-- Display Name -->
          <h1 class="${nameSize} font-bold mb-2">${displayName}</h1>

          <!-- Bio -->
          ${bio ? `<p class="${bioSize} mb-3" style="opacity: 0.8;">${bio}</p>` : ""}

          <!-- Location & Website -->
          <div class="flex flex-wrap gap-3 text-sm" style="opacity: 0.7;">
            ${showLocation && location ? `
              <div class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>${location}</span>
              </div>
            ` : ""}
            ${showWebsite && website ? `
              <a href="${website}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1 hover:underline">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>${website.replace(/^https?:\/\//, "")}</span>
              </a>
            ` : ""}
          </div>
        </div>
      `;
    }

    case "header": {
      const headerTitle = content.title || "Header Title";
      const headerSubtitle = content.subtitle || "";
      const headerBackgroundColor = content.backgroundColor || "#8b5cf6";
      const headerTextColor = content.textColor || "#ffffff";
      const headerHeight = content.height || "auto";
      const headerAlignment = content.alignment || "center";
      const headerLogoUrl = content.logoUrl || "";
      const headerLogoSize = content.logoSize || 48;

      const alignClass = headerAlignment === "left" ? "text-left items-start" : headerAlignment === "right" ? "text-right items-end" : "text-center items-center";

      return `
        <header class="w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col ${alignClass}" style="background-color: ${headerBackgroundColor}; color: ${headerTextColor}; min-height: ${headerHeight};">
          ${headerLogoUrl ? `
            <img src="${headerLogoUrl}" alt="Logo" class="mb-4" style="width: ${headerLogoSize}px; height: ${headerLogoSize}px; object-fit: contain;" />
          ` : ""}
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">${headerTitle}</h1>
          ${headerSubtitle ? `<p class="text-base sm:text-lg opacity-90">${headerSubtitle}</p>` : ""}
        </header>
      `;
    }

    case "footer": {
      const footerText = content.text || "© 2024 All rights reserved";
      const footerBackgroundColor = content.backgroundColor || "#1f2937";
      const footerTextColor = content.textColor || "#9ca3af";
      const footerAlignment = content.alignment || "center";
      const footerLinks = content.links || [];
      const footerShowSocial = content.showSocial ?? false;
      const footerSocialLinks = content.socialLinks || {};

      const alignClass = footerAlignment === "left" ? "text-left items-start" : footerAlignment === "right" ? "text-right items-end" : "text-center items-center";

      return `
        <footer class="w-full px-4 sm:px-6 py-6 sm:py-8 mt-8 sm:mt-12 flex flex-col ${alignClass}" style="background-color: ${footerBackgroundColor}; color: ${footerTextColor};">
          ${footerLinks.length > 0 ? `
            <div class="flex flex-wrap gap-4 sm:gap-6 mb-4 text-sm justify-${footerAlignment}">
              ${footerLinks.map((link: any) => `
                <a href="${link.url}" class="hover:underline" ${link.newTab ? 'target="_blank" rel="noopener noreferrer"' : ""}>
                  ${link.label}
                </a>
              `).join("")}
            </div>
          ` : ""}
          
          ${footerShowSocial ? `
            <div class="flex gap-4 mb-4 justify-${footerAlignment}">
              ${Object.entries(footerSocialLinks).map(([platform, url]) => url ? `
                <a href="${url}" target="_blank" rel="noopener noreferrer" class="hover:opacity-70 transition-opacity">
                  ${getSocialIcon(platform)}
                </a>
              ` : "").join("")}
            </div>
          ` : ""}
          
          <p class="text-sm">${footerText}</p>
        </footer>
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
