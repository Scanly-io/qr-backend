import { FastifyInstance } from 'fastify';
import QRCode from 'qrcode';
import { nanoid } from 'nanoid';

interface QRCodeStyle {
  dotStyle?: 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded';
  cornerStyle?: 'square' | 'extra-rounded' | 'dot';
  backgroundColor?: string;
  foregroundColor?: string;
  gradientType?: 'linear' | 'radial' | null;
  gradientStartColor?: string;
  gradientEndColor?: string;
  logoUrl?: string;
  logoSize?: number; // percentage of QR size (default 20)
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // L=7%, M=15%, Q=25%, H=30%
}

interface GeneratedQRCode {
  id: string;
  url: string;
  shortUrl: string;
  qrCodeDataUrl: string;
  svg?: string;
  png?: string;
  pdf?: string;
  style: QRCodeStyle;
  scanCount: number;
  createdAt: Date;
  expiresAt?: Date;
  isDynamic: boolean;
}

// In-memory storage (in production, use database)
const qrCodes = new Map<string, GeneratedQRCode>();

export async function qrCodeRoutes(fastify: FastifyInstance) {
  // Generate basic QR code
  fastify.post('/generate', async (request, reply) => {
    const { url, style, format, size, isDynamic, expiresIn } = request.body as {
      url: string;
      style?: QRCodeStyle;
      format?: 'svg' | 'png' | 'dataurl';
      size?: number;
      isDynamic?: boolean;
      expiresIn?: number; // days
    };

    if (!url) {
      return reply.status(400).send({ error: 'URL is required' });
    }

    try {
      const qrId = nanoid(10);
      const shortUrl = `${process.env.APP_URL || 'http://localhost:3000'}/qr/${qrId}`;
      const targetUrl = isDynamic ? shortUrl : url;

      // Default style
      const qrStyle: QRCodeStyle = {
        backgroundColor: style?.backgroundColor || '#ffffff',
        foregroundColor: style?.foregroundColor || '#000000',
        errorCorrectionLevel: style?.errorCorrectionLevel || 'M',
        dotStyle: style?.dotStyle || 'square',
        cornerStyle: style?.cornerStyle || 'square',
        logoSize: style?.logoSize || 20,
        ...style,
      };

      // Generate QR code
      const qrSize = size || 1000;
      const qrOptions = {
        errorCorrectionLevel: qrStyle.errorCorrectionLevel,
        type: 'image/png' as const,
        quality: 1,
        margin: 2,
        width: qrSize,
        color: {
          dark: qrStyle.foregroundColor,
          light: qrStyle.backgroundColor,
        },
      };

      let qrCodeDataUrl = '';
      let svg = '';
      let png = '';

      if (format === 'svg') {
        svg = await QRCode.toString(targetUrl, {
          ...qrOptions,
          type: 'svg',
        });
        qrCodeDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      } else {
        qrCodeDataUrl = await QRCode.toDataURL(targetUrl, qrOptions);
        png = qrCodeDataUrl;
      }

      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : undefined;

      const qrCode: GeneratedQRCode = {
        id: qrId,
        url,
        shortUrl,
        qrCodeDataUrl,
        svg,
        png,
        style: qrStyle,
        scanCount: 0,
        createdAt: new Date(),
        expiresAt,
        isDynamic: isDynamic || false,
      };

      if (isDynamic) {
        qrCodes.set(qrId, qrCode);
      }

      return {
        id: qrId,
        qrCode: qrCodeDataUrl,
        svg,
        shortUrl: isDynamic ? shortUrl : undefined,
        targetUrl,
        downloadUrl: `/qr-code/download/${qrId}`,
        isDynamic,
        expiresAt,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate QR code', message: error.message });
    }
  });

  // Generate advanced styled QR code
  fastify.post('/generate-styled', async (request, reply) => {
    const {
      url,
      template,
      foregroundColor,
      backgroundColor,
      gradientType,
      gradientColors,
      dotStyle,
      cornerStyle,
      logoUrl,
      size,
      format,
    } = request.body as {
      url: string;
      template?: 'minimal' | 'gradient' | 'branded' | 'vibrant';
      foregroundColor?: string;
      backgroundColor?: string;
      gradientType?: 'linear' | 'radial';
      gradientColors?: [string, string];
      dotStyle?: QRCodeStyle['dotStyle'];
      cornerStyle?: QRCodeStyle['cornerStyle'];
      logoUrl?: string;
      size?: number;
      format?: 'svg' | 'png';
    };

    if (!url) {
      return reply.status(400).send({ error: 'URL is required' });
    }

    // Template presets
    const templates: Record<string, Partial<QRCodeStyle>> = {
      minimal: {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
        dotStyle: 'square',
        cornerStyle: 'square',
      },
      gradient: {
        foregroundColor: '#6366f1',
        backgroundColor: '#ffffff',
        gradientType: 'linear',
        gradientStartColor: '#6366f1',
        gradientEndColor: '#8b5cf6',
        dotStyle: 'rounded',
        cornerStyle: 'extra-rounded',
      },
      branded: {
        foregroundColor: '#1e293b',
        backgroundColor: '#f8fafc',
        dotStyle: 'classy-rounded',
        cornerStyle: 'extra-rounded',
        logoSize: 25,
      },
      vibrant: {
        foregroundColor: '#f59e0b',
        backgroundColor: '#fffbeb',
        dotStyle: 'dots',
        cornerStyle: 'dot',
      },
    };

    const templateStyle = template ? templates[template] : {};

    const style: QRCodeStyle = {
      ...templateStyle,
      foregroundColor: foregroundColor || templateStyle.foregroundColor || '#000000',
      backgroundColor: backgroundColor || templateStyle.backgroundColor || '#ffffff',
      gradientType: gradientType || templateStyle.gradientType || null,
      gradientStartColor: gradientColors?.[0] || templateStyle.gradientStartColor,
      gradientEndColor: gradientColors?.[1] || templateStyle.gradientEndColor,
      dotStyle: dotStyle || templateStyle.dotStyle || 'square',
      cornerStyle: cornerStyle || templateStyle.cornerStyle || 'square',
      logoUrl: logoUrl || templateStyle.logoUrl,
      logoSize: templateStyle.logoSize || 20,
      errorCorrectionLevel: 'H', // High error correction for logos
    };

    try {
      // Generate styled QR code
      const qrSize = size || 1000;
      
      // Note: For advanced styling, you would integrate qr-code-styling here
      // For now, using basic QRCode library
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: style.errorCorrectionLevel,
        width: qrSize,
        margin: 2,
        color: {
          dark: style.foregroundColor!,
          light: style.backgroundColor!,
        },
      });

      return {
        qrCode: qrCodeDataUrl,
        style,
        downloadFormats: ['png', 'svg', 'pdf'],
        message: 'For advanced styling (gradients, logos, custom shapes), upgrade to premium',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate styled QR code', message: error.message });
    }
  });

  // Generate QR code for microsite
  fastify.post('/generate-for-microsite', async (request, reply) => {
    const { micrositeId, customDomain, style } = request.body as {
      micrositeId: string;
      customDomain?: string;
      style?: QRCodeStyle;
    };

    if (!micrositeId) {
      return reply.status(400).send({ error: 'Microsite ID is required' });
    }

    const baseUrl = customDomain || process.env.APP_URL || 'http://localhost:3000';
    const micrositeUrl = `${baseUrl}/${micrositeId}`;

    try {
      const generateResponse = await fetch('http://localhost:3016/qr-code/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: micrositeUrl,
          style,
          isDynamic: true,
          format: 'png',
        }),
      });

      const data = await generateResponse.json();

      return {
        ...data,
        micrositeId,
        micrositeUrl,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate QR for microsite', message: error.message });
    }
  });

  // Bulk generate QR codes
  fastify.post('/bulk-generate', async (request, reply) => {
    const { urls, style, format } = request.body as {
      urls: string[];
      style?: QRCodeStyle;
      format?: 'svg' | 'png';
    };

    if (!urls || urls.length === 0) {
      return reply.status(400).send({ error: 'URLs array is required' });
    }

    if (urls.length > 100) {
      return reply.status(400).send({ error: 'Maximum 100 QR codes per bulk request' });
    }

    try {
      const results = await Promise.all(
        urls.map(async (url, index) => {
          try {
            const qrCodeDataUrl = await QRCode.toDataURL(url, {
              errorCorrectionLevel: style?.errorCorrectionLevel || 'M',
              width: 500,
              margin: 2,
              color: {
                dark: style?.foregroundColor || '#000000',
                light: style?.backgroundColor || '#ffffff',
              },
            });

            return {
              url,
              index,
              qrCode: qrCodeDataUrl,
              success: true,
            };
          } catch (error: any) {
            return {
              url,
              index,
              error: error.message,
              success: false,
            };
          }
        })
      );

      const successful = results.filter((r) => r.success).length;

      return {
        total: urls.length,
        successful,
        failed: urls.length - successful,
        results,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to bulk generate QR codes', message: error.message });
    }
  });

  // Redirect dynamic QR code
  fastify.get('/redirect/:qrId', async (request, reply) => {
    const { qrId } = request.params as { qrId: string };

    const qrCode = qrCodes.get(qrId);

    if (!qrCode) {
      return reply.status(404).send({ error: 'QR code not found' });
    }

    // Check expiry
    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      return reply.status(410).send({ error: 'QR code has expired' });
    }

    // Increment scan count
    qrCode.scanCount++;

    // Redirect to target URL
    return reply.redirect(302, qrCode.url);
  });

  // Update dynamic QR destination
  fastify.put('/update/:qrId', async (request, reply) => {
    const { qrId } = request.params as { qrId: string };
    const { newUrl } = request.body as { newUrl: string };

    const qrCode = qrCodes.get(qrId);

    if (!qrCode) {
      return reply.status(404).send({ error: 'QR code not found' });
    }

    if (!qrCode.isDynamic) {
      return reply.status(400).send({ error: 'Cannot update static QR code' });
    }

    if (!newUrl) {
      return reply.status(400).send({ error: 'New URL is required' });
    }

    qrCode.url = newUrl;

    return {
      id: qrId,
      newUrl,
      shortUrl: qrCode.shortUrl,
      message: 'QR code destination updated successfully',
      scanCount: qrCode.scanCount,
    };
  });

  // Get QR code analytics
  fastify.get('/analytics/:qrId', async (request, reply) => {
    const { qrId } = request.params as { qrId: string };

    const qrCode = qrCodes.get(qrId);

    if (!qrCode) {
      return reply.status(404).send({ error: 'QR code not found' });
    }

    return {
      id: qrId,
      url: qrCode.url,
      shortUrl: qrCode.shortUrl,
      scanCount: qrCode.scanCount,
      createdAt: qrCode.createdAt,
      expiresAt: qrCode.expiresAt,
      isExpired: qrCode.expiresAt ? qrCode.expiresAt < new Date() : false,
      isDynamic: qrCode.isDynamic,
    };
  });

  // Download QR code in different formats
  fastify.get('/download/:qrId/:format', async (request, reply) => {
    const { qrId, format } = request.params as { qrId: string; format: 'png' | 'svg' | 'pdf' };

    const qrCode = qrCodes.get(qrId);

    if (!qrCode) {
      return reply.status(404).send({ error: 'QR code not found' });
    }

    try {
      if (format === 'png') {
        const base64Data = qrCode.png?.replace(/^data:image\/png;base64,/, '') || '';
        const buffer = Buffer.from(base64Data, 'base64');

        reply.header('Content-Type', 'image/png');
        reply.header('Content-Disposition', `attachment; filename="qr-code-${qrId}.png"`);
        return reply.send(buffer);
      } else if (format === 'svg') {
        reply.header('Content-Type', 'image/svg+xml');
        reply.header('Content-Disposition', `attachment; filename="qr-code-${qrId}.svg"`);
        return reply.send(qrCode.svg || '');
      } else if (format === 'pdf') {
        return reply.status(501).send({ error: 'PDF generation not yet implemented' });
      }

      return reply.status(400).send({ error: 'Invalid format. Use png, svg, or pdf' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to download QR code', message: error.message });
    }
  });

  // List all QR codes for a user/organization
  fastify.get('/list', async (request, reply) => {
    const qrCodesList = Array.from(qrCodes.values()).map((qr) => ({
      id: qr.id,
      url: qr.url,
      shortUrl: qr.shortUrl,
      scanCount: qr.scanCount,
      isDynamic: qr.isDynamic,
      createdAt: qr.createdAt,
      expiresAt: qr.expiresAt,
      isExpired: qr.expiresAt ? qr.expiresAt < new Date() : false,
    }));

    return {
      qrCodes: qrCodesList,
      total: qrCodesList.length,
    };
  });

  // Delete QR code
  fastify.delete('/:qrId', async (request, reply) => {
    const { qrId } = request.params as { qrId: string };

    const existed = qrCodes.has(qrId);
    qrCodes.delete(qrId);

    return {
      success: existed,
      message: existed ? 'QR code deleted successfully' : 'QR code not found',
    };
  });
}
