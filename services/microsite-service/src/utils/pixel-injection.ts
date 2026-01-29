/**
 * ==========================================
 * PIXEL INJECTION UTILITY
 * ==========================================
 * 
 * Injects retargeting pixels into microsite HTML.
 * Called by microsite-service when rendering pages.
 * 
 * FLOW:
 * 1. User scans QR code
 * 2. Microsite service fetches active pixels for this QR
 * 3. Pixels injected into <head> before page render
 * 4. Pixels fire when page loads
 * 5. Log pixel fires to analytics
 * 
 * BUSINESS VALUE:
 * - Automatically retarget all QR scanners
 * - No manual pixel installation needed
 * - Works with all major ad platforms
 */

interface Pixel {
  id: string;
  platform: string;
  pixelId: string;
  triggerEvent: string;
  config?: any;
}

/**
 * Generate HTML for all active pixels
 */
export function generatePixelInjectionHTML(pixels: Pixel[]): string {
  if (!pixels || pixels.length === 0) {
    return '';
  }

  const pixelScripts = pixels
    .filter(pixel => pixel.triggerEvent === 'page_view') // Only page_view pixels for now
    .map(pixel => generatePixelScript(pixel))
    .join('\n\n');

  return `
<!-- Retargeting Pixels -->
${pixelScripts}
<!-- End Retargeting Pixels -->
`;
}

/**
 * Generate platform-specific pixel script
 */
function generatePixelScript(pixel: Pixel): string {
  const { platform, pixelId, config } = pixel;

  switch (platform) {
    case 'facebook':
      return `<!-- Facebook Pixel -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
${config?.events?.map((e: string) => `fbq('track', '${e}');`).join('\n') || ''}
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
/></noscript>`;

    case 'google_ads':
      return `<!-- Google Ads -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${pixelId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${pixelId}');
</script>`;

    case 'tiktok':
      return `<!-- TikTok Pixel -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${pixelId}');
  ttq.page();
}(window, document, 'ttq');
</script>`;

    case 'linkedin':
      return `<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
_linkedin_partner_id = "${pixelId}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script><script type="text/javascript">
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=${pixelId}&fmt=gif" />
</noscript>`;

    case 'twitter':
      return `<!-- Twitter Pixel -->
<script>
!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${pixelId}');
</script>`;

    case 'snapchat':
      return `<!-- Snapchat Pixel -->
<script type='text/javascript'>
(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
{a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
r.src=n;var u=t.getElementsByTagName(s)[0];
u.parentNode.insertBefore(r,u);})(window,document,
'https://sc-static.net/scevent.min.js');
snaptr('init', '${pixelId}');
snaptr('track', 'PAGE_VIEW');
</script>`;

    case 'pinterest':
      return `<!-- Pinterest Tag -->
<script>
!function(e){if(!window.pintrk){window.pintrk = function () {
window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
  n=window.pintrk;n.queue=[],n.version="3.0";var
  t=document.createElement("script");t.async=!0,t.src=e;var
  r=document.getElementsByTagName("script")[0];
  r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', '${pixelId}');
pintrk('page');
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt=""
  src="https://ct.pinterest.com/v3/?event=init&tid=${pixelId}&noscript=1" />
</noscript>`;

    case 'custom':
      return `<!-- Custom Pixel -->
${config?.code || ''}`;

    default:
      return '';
  }
}

/**
 * Generate button click tracking script
 * For pixels with triggerEvent = 'button_click'
 */
export function generateButtonClickTracking(pixels: Pixel[]): string {
  const clickPixels = pixels.filter(pixel => pixel.triggerEvent === 'button_click');
  
  if (clickPixels.length === 0) {
    return '';
  }

  const trackingCalls = clickPixels.map(pixel => {
    switch (pixel.platform) {
      case 'facebook':
        return `fbq('track', 'Lead');`;
      case 'google_ads':
        return `gtag('event', 'conversion', {'send_to': '${pixel.pixelId}/button_click'});`;
      case 'tiktok':
        return `ttq.track('ClickButton');`;
      case 'linkedin':
        return `lintrk('track', { conversion_id: ${pixel.pixelId} });`;
      case 'twitter':
        return `twq('track', 'Click');`;
      default:
        return '';
    }
  }).filter(Boolean).join('\n  ');

  return `
<script>
// Button click tracking for retargeting pixels
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.cta-button, [data-track="button"]').forEach(function(button) {
    button.addEventListener('click', function() {
      ${trackingCalls}
    });
  });
});
</script>
`;
}

/**
 * Log pixel fire to analytics
 */
export async function logPixelFire(
  pixelId: string,
  qrId: string,
  sessionId: string,
  eventType: string,
  metadata: any
) {
  try {
    // Send to Kafka for analytics logging
    // This will be picked up by analytics-service
    const event = {
      eventType: 'pixel.fired',
      pixelId,
      qrId,
      sessionId,
      triggerEvent: eventType,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // TODO: Send to Kafka analytics.events topic
    console.log('Pixel fired:', event);
  } catch (error) {
    console.error('Error logging pixel fire:', error);
  }
}
