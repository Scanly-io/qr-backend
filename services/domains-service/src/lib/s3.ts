/**
 * AWS S3 Integration
 * 
 * Handles asset storage for microsites:
 * - Upload images, CSS, JS files
 * - Generate CDN URLs
 * - Delete assets
 * - List assets for a subdomain
 */

import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@qr/common';

interface UploadOptions {
  subdomain: string;
  fileName: string;
  fileContent: Buffer | string;
  contentType: string;
  isPublic?: boolean;
}

export class S3Service {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private cdnDomain: string;
  private provider: 'aws' | 'r2'; // Support both AWS S3 and Cloudflare R2

  constructor() {
    this.provider = (process.env.STORAGE_PROVIDER || 'r2') as 'aws' | 'r2';
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET || 'qr-platform-assets';
    
    // Cloudflare R2 vs AWS S3 endpoints
    const endpoint = this.provider === 'r2'
      ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined; // AWS S3 uses default endpoint

    // CDN domain (for public URLs)
    this.cdnDomain = process.env.CDN_DOMAIN || 
      (this.provider === 'r2' 
        ? `${this.bucket}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev` // R2 public URL
        : `${this.bucket}.s3.amazonaws.com`); // S3 public URL

    this.client = new S3Client({
      region: this.provider === 'r2' ? 'auto' : this.region,
      endpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    logger.info({ provider: this.provider, bucket: this.bucket }, 'Storage service initialized');
  }

  /**
   * Upload asset to S3
   * Path structure: {subdomain}/{type}/{filename}
   * Example: john/images/profile.jpg
   */
  async uploadAsset(options: UploadOptions): Promise<string> {
    try {
      const { subdomain, fileName, fileContent, contentType, isPublic = true } = options;
      
      // Organize by subdomain and file type
      const fileType = this.getFileType(fileName);
      const key = `${subdomain}/${fileType}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        ACL: isPublic ? 'public-read' : 'private',
        CacheControl: 'public, max-age=31536000', // 1 year cache
        Metadata: {
          subdomain,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.client.send(command);

      const url = `https://${this.cdnDomain}/${key}`;
      
      logger.info({ subdomain, fileName, url }, 'Asset uploaded to S3');

      return url;
    } catch (error) {
      logger.error({ error, ...options }, 'Failed to upload asset to S3');
      throw error;
    }
  }

  /**
   * Upload multiple assets in batch
   */
  async uploadAssets(subdomain: string, files: Array<{
    name: string;
    content: Buffer;
    contentType: string;
  }>): Promise<string[]> {
    const uploads = files.map(file => 
      this.uploadAsset({
        subdomain,
        fileName: file.name,
        fileContent: file.content,
        contentType: file.contentType,
      })
    );

    return Promise.all(uploads);
  }

  /**
   * Delete asset from S3
   */
  async deleteAsset(subdomain: string, fileName: string): Promise<void> {
    try {
      const fileType = this.getFileType(fileName);
      const key = `${subdomain}/${fileType}/${fileName}`;

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      
      logger.info({ subdomain, fileName }, 'Asset deleted from S3');
    } catch (error) {
      logger.error({ error, subdomain, fileName }, 'Failed to delete asset');
      throw error;
    }
  }

  /**
   * Delete all assets for a subdomain
   * Called when subdomain is deleted
   */
  async deleteAllAssets(subdomain: string): Promise<void> {
    try {
      // List all objects with subdomain prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: `${subdomain}/`,
      });

      const response = await this.client.send(listCommand);

      if (!response.Contents || response.Contents.length === 0) {
        logger.info({ subdomain }, 'No assets to delete');
        return;
      }

      // Delete all objects
      const deletePromises = response.Contents.map(obj => {
        if (!obj.Key) return Promise.resolve();
        
        return this.client.send(new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: obj.Key,
        }));
      });

      await Promise.all(deletePromises);

      logger.info({ subdomain, count: response.Contents.length }, 'All assets deleted');
    } catch (error) {
      logger.error({ error, subdomain }, 'Failed to delete all assets');
      throw error;
    }
  }

  /**
   * List all assets for a subdomain
   */
  async listAssets(subdomain: string): Promise<Array<{
    fileName: string;
    url: string;
    size: number;
    lastModified: Date;
  }>> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: `${subdomain}/`,
      });

      const response = await this.client.send(command);

      if (!response.Contents) {
        return [];
      }

      return response.Contents.map(obj => ({
        fileName: obj.Key?.split('/').pop() || '',
        url: `https://${this.cdnDomain}/${obj.Key}`,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
      }));
    } catch (error) {
      logger.error({ error, subdomain }, 'Failed to list assets');
      return [];
    }
  }

  /**
   * Generate presigned URL for temporary upload access
   * Used for direct browser uploads
   */
  async generateUploadUrl(
    subdomain: string, 
    fileName: string, 
    contentType: string,
    expiresIn: number = 3600 // 1 hour
  ): Promise<string> {
    try {
      const fileType = this.getFileType(fileName);
      const key = `${subdomain}/${fileType}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });

      logger.info({ subdomain, fileName, expiresIn }, 'Generated presigned upload URL');

      return url;
    } catch (error) {
      logger.error({ error, subdomain, fileName }, 'Failed to generate upload URL');
      throw error;
    }
  }

  /**
   * Get file type category from filename
   */
  private getFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'];
    const videoExts = ['mp4', 'webm', 'mov', 'avi'];
    const documentExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
    
    if (imageExts.includes(ext || '')) return 'images';
    if (videoExts.includes(ext || '')) return 'videos';
    if (documentExts.includes(ext || '')) return 'documents';
    if (ext === 'css') return 'styles';
    if (ext === 'js') return 'scripts';
    
    return 'files';
  }

  /**
   * Check if asset exists
   */
  async assetExists(subdomain: string, fileName: string): Promise<boolean> {
    try {
      const fileType = this.getFileType(fileName);
      const key = `${subdomain}/${fileType}/${fileName}`;

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const s3Service = new S3Service();
