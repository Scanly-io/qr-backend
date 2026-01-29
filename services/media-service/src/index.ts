/**
 * MEDIA SERVICE
 * 
 * Handles file uploads for microsites:
 * - Images for blocks (profile, image, product, etc.)
 * - Logo uploads for themes
 * - Product images for e-commerce
 * 
 * Storage Options:
 * 1. Cloudflare R2 (production) - S3-compatible, zero egress fees
 * 2. Local filesystem (development)
 * 
 * Features:
 * - Image optimization via Sharp (resize, compress)
 * - Presigned URLs for direct client uploads
 * - Multiple file formats (JPG, PNG, WebP, GIF)
 * - Size limits and validation
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

// Configuration
const USE_R2 = process.env.USE_R2 === 'true' || !!process.env.R2_ACCOUNT_ID;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'qr-platform-assets';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://${R2_BUCKET_NAME}.r2.dev`;
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

// S3 Client for R2 (only initialize if R2 is configured)
let s3Client: S3Client | null = null;
if (USE_R2 && R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

// Ensure local upload directory exists
async function ensureUploadDir() {
  if (!s3Client) {
    await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    await fs.mkdir(path.join(LOCAL_UPLOAD_DIR, 'images'), { recursive: true });
  }
}

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 10,
    },
  });

  // Health check
  fastify.get('/health', async () => ({
    status: 'healthy',
    service: 'media-service',
    storage: s3Client ? 'cloudflare-r2' : 'local',
    timestamp: new Date().toISOString(),
  }));

  // ============================================
  // UPLOAD SINGLE IMAGE
  // ============================================
  fastify.post('/upload', async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }
      
      const { filename, mimetype, file } = data;
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
      if (!allowedTypes.includes(mimetype)) {
        return reply.status(400).send({ 
          error: 'Invalid file type',
          allowed: allowedTypes,
        });
      }
      
      // Generate unique filename
      const ext = path.extname(filename) || '.jpg';
      const uniqueId = nanoid(12);
      const newFilename = `${uniqueId}${ext}`;
      const key = `images/${newFilename}`;
      
      // Read file buffer
      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      // Optimize image with Sharp (except SVGs and GIFs)
      let optimizedBuffer = buffer;
      let optimizedMimetype = mimetype;
      
      if (!['image/svg+xml', 'image/gif'].includes(mimetype)) {
        try {
          optimizedBuffer = await sharp(buffer)
            .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
          optimizedMimetype = 'image/webp';
        } catch (err) {
          fastify.log.warn({ err }, 'Image optimization failed, using original');
          optimizedBuffer = buffer;
        }
      }
      
      let publicUrl: string;
      
      if (s3Client) {
        // Upload to R2
        await s3Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: optimizedBuffer,
          ContentType: optimizedMimetype,
          CacheControl: 'public, max-age=31536000',
        }));
        
        publicUrl = `${R2_PUBLIC_URL}/${key}`;
      } else {
        // Save to local filesystem
        const localPath = path.join(LOCAL_UPLOAD_DIR, key);
        await fs.writeFile(localPath, optimizedBuffer);
        
        const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3025}`;
        publicUrl = `${baseUrl}/files/${key}`;
      }
      
      fastify.log.info({ filename, key, size: optimizedBuffer.length }, 'File uploaded');
      
      return reply.send({
        success: true,
        url: publicUrl,
        key,
        size: optimizedBuffer.length,
        originalSize: buffer.length,
        mimetype: optimizedMimetype,
      });
      
    } catch (error) {
      fastify.log.error({ error }, 'Upload failed');
      return reply.status(500).send({ error: 'Upload failed' });
    }
  });

  // ============================================
  // UPLOAD MULTIPLE IMAGES
  // ============================================
  fastify.post('/upload-multiple', async (request, reply) => {
    try {
      const parts = request.files();
      const results: Array<{ url: string; key: string; filename: string }> = [];
      
      for await (const part of parts) {
        const { filename, mimetype, file } = part;
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
        if (!allowedTypes.includes(mimetype)) {
          continue;
        }
        
        const ext = path.extname(filename) || '.jpg';
        const uniqueId = nanoid(12);
        const newFilename = `${uniqueId}${ext}`;
        const key = `images/${newFilename}`;
        
        const chunks: Buffer[] = [];
        for await (const chunk of file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        let optimizedBuffer = buffer;
        let optimizedMimetype = mimetype;
        
        if (!['image/svg+xml', 'image/gif'].includes(mimetype)) {
          try {
            optimizedBuffer = await sharp(buffer)
              .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 85 })
              .toBuffer();
            optimizedMimetype = 'image/webp';
          } catch {
            optimizedBuffer = buffer;
          }
        }
        
        let publicUrl: string;
        
        if (s3Client) {
          await s3Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: optimizedBuffer,
            ContentType: optimizedMimetype,
            CacheControl: 'public, max-age=31536000',
          }));
          publicUrl = `${R2_PUBLIC_URL}/${key}`;
        } else {
          const localPath = path.join(LOCAL_UPLOAD_DIR, key);
          await fs.writeFile(localPath, optimizedBuffer);
          const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3025}`;
          publicUrl = `${baseUrl}/files/${key}`;
        }
        
        results.push({ url: publicUrl, key, filename });
      }
      
      return reply.send({
        success: true,
        files: results,
        count: results.length,
      });
      
    } catch (error) {
      fastify.log.error({ error }, 'Multi-upload failed');
      return reply.status(500).send({ error: 'Upload failed' });
    }
  });

  // ============================================
  // GET PRESIGNED UPLOAD URL
  // ============================================
  fastify.post('/presigned-url', async (request, reply) => {
    if (!s3Client) {
      return reply.status(400).send({ 
        error: 'Presigned URLs only available with R2 storage',
      });
    }
    
    const { filename, contentType } = request.body as { 
      filename: string; 
      contentType: string;
    };
    
    if (!filename || !contentType) {
      return reply.status(400).send({ error: 'filename and contentType required' });
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(contentType)) {
      return reply.status(400).send({ 
        error: 'Invalid content type',
        allowed: allowedTypes,
      });
    }
    
    const ext = path.extname(filename) || '.jpg';
    const uniqueId = nanoid(12);
    const key = `images/${uniqueId}${ext}`;
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    
    return reply.send({
      uploadUrl,
      publicUrl,
      key,
      expiresIn: 3600,
    });
  });

  // ============================================
  // DELETE FILE
  // ============================================
  fastify.delete('/files/:folder/:filename', async (request, reply) => {
    const { folder, filename } = request.params as { folder: string; filename: string };
    const key = `${folder}/${filename}`;
    
    try {
      if (s3Client) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
        }));
      } else {
        const localPath = path.join(LOCAL_UPLOAD_DIR, key);
        await fs.unlink(localPath);
      }
      
      return reply.send({ success: true, deleted: key });
    } catch (error) {
      fastify.log.error({ error, key }, 'Delete failed');
      return reply.status(500).send({ error: 'Delete failed' });
    }
  });

  // ============================================
  // SERVE LOCAL FILES (development only)
  // ============================================
  fastify.get('/files/:folder/:filename', async (request, reply) => {
    if (s3Client) {
      return reply.status(404).send({ error: 'Local file serving disabled with R2' });
    }
    
    const { folder, filename } = request.params as { folder: string; filename: string };
    const filePath = path.join(LOCAL_UPLOAD_DIR, folder, filename);
    
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      const ext = path.extname(filename).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
      };
      
      reply.header('Content-Type', contentTypes[ext] || 'application/octet-stream');
      reply.header('Cache-Control', 'public, max-age=31536000');
      
      return reply.send(fileBuffer);
    } catch {
      return reply.status(404).send({ error: 'File not found' });
    }
  });

  return fastify;
}

// Start server
async function start() {
  try {
    await ensureUploadDir();
    
    const fastify = await buildServer();
    const port = parseInt(process.env.PORT || '3025');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log(`🖼️  Media Service running on http://${host}:${port}`);
    console.log(`📤 Upload endpoint: POST http://${host}:${port}/upload`);
    console.log(`📤 Multi-upload: POST http://${host}:${port}/upload-multiple`);
    console.log(`📁 Storage: ${s3Client ? 'Cloudflare R2' : `Local (${LOCAL_UPLOAD_DIR})`}`);
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
