# Media Storage Implementation Plan

## Current Status
- ❌ No file upload service
- ✅ Images: External URLs only
- ✅ Videos: YouTube/Vimeo embeds

## Recommended Solution: Cloudflare R2

### Why R2?
1. **S3-compatible** - Easy migration path
2. **Free egress** - No bandwidth charges
3. **Global CDN** - Fast delivery worldwide
4. **Simple pricing** - $0.015/GB/month
5. **Easy integration** - Use AWS SDK

### Implementation Steps

#### 1. Create Upload Service
```bash
cd /Users/saurabhbansal/qr-backend/services
mkdir upload-service
```

#### 2. Setup R2 Bucket
- Sign up: https://dash.cloudflare.com/
- Create R2 bucket: "qr-media"
- Get API credentials

#### 3. Install Dependencies
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer
```

#### 4. Create Upload Route
```typescript
// services/upload-service/src/routes/upload.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // https://xxx.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function uploadRoutes(app: any) {
  // Upload endpoint
  app.post("/upload", {
    preHandler: [verifyJWT],
  }, async (req: any, res: any) => {
    const file = req.file;
    const userId = req.user.id;
    
    // Generate unique filename
    const filename = `${userId}/${Date.now()}-${file.originalname}`;
    
    // Upload to R2
    await s3Client.send(new PutObjectCommand({
      Bucket: "qr-media",
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    
    // Return public URL
    const url = `https://media.yourapp.com/${filename}`;
    return { url };
  });
}
```

#### 5. Frontend Integration
```typescript
// qr-frontend/src/lib/api/upload.ts
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  
  const { url } = await response.json();
  return url;
}
```

### Cost Estimation

**For 1,000 users with 10 images each:**
- Storage: 10GB × $0.015 = **$0.15/month**
- Bandwidth: FREE with R2 ✅
- Total: **~$0.15/month**

**For 10,000 users:**
- Storage: 100GB × $0.015 = **$1.50/month**
- Bandwidth: Still FREE ✅
- Total: **~$1.50/month**

**Compare to S3:**
- Storage: 100GB × $0.023 = $2.30/month
- Bandwidth: 1TB × $0.09 = $90/month
- Total: **~$92/month** ❌

**Savings: $90/month with R2!** 🎉

## Alternative: Keep External URLs (Current)

### Pros
- ✅ $0 cost
- ✅ Simple implementation
- ✅ No infrastructure to manage

### Cons
- ❌ Users must host images elsewhere
- ❌ Links can break
- ❌ Less professional
- ❌ No image optimization

## Decision

**Recommendation: Start with external URLs (now), add R2 later (when you have 100+ users)**

### Timeline
- **Now - Month 3**: External URLs only
- **Month 3+**: Add R2 upload service
- **Later**: Add image optimization (Cloudflare Images or imgix)

## Video Strategy

**Keep using YouTube/Vimeo embeds:**
- ✅ Free hosting
- ✅ Unlimited bandwidth
- ✅ Built-in player
- ✅ Mobile optimized

**Don't host videos yourself unless:**
- Users specifically need private videos
- Ready to spend $$$$ on bandwidth
