import { FastifyInstance } from "fastify";
import { verifyJWT } from "@qr/common";
import { db } from "../db.js";
import QRCode from "qrcode";

// Social platforms for "Add to bio"
const SOCIAL_PLATFORMS = [
  { id: 'snapchat', name: 'Snapchat', icon: 'snapchat', bioUrl: 'https://www.snapchat.com/add/{username}' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', bioUrl: 'https://www.instagram.com/{username}' },
  { id: 'facebook_profile', name: 'Facebook Profile', icon: 'facebook', bioUrl: 'https://www.facebook.com/{username}' },
  { id: 'tiktok', name: 'TikTok', icon: 'tiktok', bioUrl: 'https://www.tiktok.com/@{username}' },
  { id: 'twitch', name: 'Twitch', icon: 'twitch', bioUrl: 'https://www.twitch.tv/{username}' },
  { id: 'facebook_page', name: 'Facebook Page', icon: 'facebook', bioUrl: 'https://www.facebook.com/{pagename}' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube', bioUrl: 'https://www.youtube.com/@{username}' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', bioUrl: 'https://www.linkedin.com/in/{username}' },
  { id: 'pinterest', name: 'Pinterest', icon: 'pinterest', bioUrl: 'https://www.pinterest.com/{username}' },
  { id: 'x', name: 'X', icon: 'x', bioUrl: 'https://x.com/{username}' },
  { id: 'threads', name: 'Threads', icon: 'threads', bioUrl: 'https://www.threads.net/@{username}' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'whatsapp', bioUrl: 'https://wa.me/{phone}' }
];

export default async function shareRoutes(app: FastifyInstance) {

  // Get available social platforms for "Add to bio"
  app.get("/platforms", { preHandler: [verifyJWT] }, async () => {
    return {
      success: true,
      platforms: SOCIAL_PLATFORMS
    };
  });

  // Generate share card data (like Linktree's share card)
  app.get("/card", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    const { username, slug } = req.query as any;

    const profileUrl = `${process.env.APP_URL || 'https://scanly.io'}/${slug || username || user.id}`;

    return {
      success: true,
      card: {
        username: `@${username || slug || user.id}`,
        displayName: username || slug || user.id,
        profileUrl,
        avatarUrl: user.avatar || null,
        qrCodeUrl: `/share/qr?url=${encodeURIComponent(profileUrl)}`,
        shortUrl: profileUrl
      }
    };
  });

  // Generate QR Code for Linktree URL
  app.get("/qr", async (req: any, res) => {
    const { url, size = 400, format = 'png' } = req.query as any;

    if (!url) {
      return res.code(400).send({ error: "URL required" });
    }

    try {
      const qrOptions = {
        width: parseInt(size),
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      if (format === 'svg') {
        const svg = await QRCode.toString(url, { ...qrOptions, type: 'svg' });
        res.header('Content-Type', 'image/svg+xml');
        return svg;
      }

      // PNG format
      const buffer = await QRCode.toBuffer(url, qrOptions);
      res.header('Content-Type', 'image/png');
      return buffer;
    } catch (error) {
      return res.code(500).send({ error: "Failed to generate QR code" });
    }
  });

  // Generate QR Code with custom branding
  app.post("/qr/custom", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const { url, logo, color, size = 400 } = req.body;

    if (!url) {
      return res.code(400).send({ error: "URL required" });
    }

    try {
      const qrOptions = {
        width: parseInt(size),
        margin: 2,
        color: {
          dark: color || '#000000',
          light: '#FFFFFF'
        }
      };

      const qrDataUrl = await QRCode.toDataURL(url, qrOptions);

      return {
        success: true,
        qrCode: qrDataUrl,
        downloadUrl: `/share/qr?url=${encodeURIComponent(url)}&size=${size}`
      };
    } catch (error) {
      return res.code(500).send({ error: "Failed to generate QR code" });
    }
  });

  // Generate shareable link with tracking
  app.post("/link", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    const { slug, utm_source, utm_medium, utm_campaign } = req.body;

    const baseUrl = `${process.env.APP_URL || 'https://scanly.io'}/${slug || user.id}`;
    const params = new URLSearchParams();

    if (utm_source) params.append('utm_source', utm_source);
    if (utm_medium) params.append('utm_medium', utm_medium);
    if (utm_campaign) params.append('utm_campaign', utm_campaign);

    const shareableUrl = params.toString() 
      ? `${baseUrl}?${params.toString()}`
      : baseUrl;

    return {
      success: true,
      link: {
        url: shareableUrl,
        shortUrl: baseUrl,
        qrCodeUrl: `/share/qr?url=${encodeURIComponent(shareableUrl)}`,
        copyable: true
      }
    };
  });

  // Get social platform deep links for "Add to bio"
  app.post("/add-to-bio", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { platform, username, slug } = req.body;

    if (!platform) {
      return res.code(400).send({ error: "Platform required" });
    }

    const platformConfig = SOCIAL_PLATFORMS.find(p => p.id === platform);
    if (!platformConfig) {
      return res.code(400).send({ error: "Invalid platform" });
    }

    const linktreeUrl = `${process.env.APP_URL || 'https://scanly.io'}/${slug || username || user.id}`;

    // Generate platform-specific instructions
    const instructions: Record<string, string> = {
      snapchat: "1. Open Snapchat\n2. Tap your profile icon\n3. Tap the gear icon\n4. Scroll to 'My Account' and tap 'Website'\n5. Paste your link",
      instagram: "1. Open Instagram app\n2. Go to your profile\n3. Tap 'Edit Profile'\n4. Tap 'Website'\n5. Paste your link and save",
      facebook_profile: "1. Open Facebook app\n2. Go to your profile\n3. Tap 'Edit Profile'\n4. Scroll to 'Website'\n5. Add your link",
      tiktok: "1. Open TikTok app\n2. Go to your profile\n3. Tap 'Edit Profile'\n4. Tap 'Add bio'\n5. Add your link",
      twitch: "1. Go to Twitch.tv\n2. Click your profile icon\n3. Go to Settings\n4. Scroll to 'About Panels'\n5. Add a panel with your link",
      youtube: "1. Go to YouTube Studio\n2. Click 'Customization'\n3. Click 'Basic info'\n4. Add your link under 'Links'\n5. Click 'Publish'",
      linkedin: "1. Open LinkedIn\n2. Click 'Me' > 'View profile'\n3. Click 'Add profile section'\n4. Select 'Contact info'\n5. Add your website",
      pinterest: "1. Go to Pinterest\n2. Click your profile picture\n3. Click 'Edit profile'\n4. Add your website\n5. Click 'Save'",
      x: "1. Open X (Twitter)\n2. Go to 'Edit profile'\n3. Add your link under 'Website'\n4. Click 'Save'",
      threads: "1. Open Threads app\n2. Go to your profile\n3. Tap 'Edit profile'\n4. Add link to bio\n5. Save",
      whatsapp: "1. Open WhatsApp\n2. Tap Settings\n3. Tap your profile photo\n4. Tap 'About'\n5. Add your link"
    };

    return {
      success: true,
      platform: platformConfig,
      linktreeUrl,
      instructions: instructions[platform] || "Add your link to your bio",
      copyable: true
    };
  });

  // Share to social media (native share)
  app.post("/native", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    const { platform, slug, message } = req.body;

    const shareUrl = `${process.env.APP_URL || 'https://scanly.io'}/${slug || user.id}`;
    const defaultMessage = message || `Check out my link in bio: ${shareUrl}`;

    // Generate platform-specific share URLs
    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(defaultMessage)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(defaultMessage)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message || 'Check out my link')}`,
      email: `mailto:?subject=${encodeURIComponent('Check out my link')}&body=${encodeURIComponent(defaultMessage)}`,
      sms: `sms:?body=${encodeURIComponent(defaultMessage)}`
    };

    return {
      success: true,
      shareUrl: shareUrls[platform] || shareUrl,
      platform,
      message: defaultMessage
    };
  });

  // Get share analytics (how many times link was shared)
  app.get("/analytics", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;

    // This would integrate with actual analytics tracking
    // For now, return mock data structure
    return {
      success: true,
      analytics: {
        totalShares: 0,
        platforms: {
          instagram: 0,
          facebook: 0,
          twitter: 0,
          tiktok: 0,
          linkedin: 0,
          whatsapp: 0,
          other: 0
        },
        qrScans: 0,
        directLinks: 0
      }
    };
  });
}
