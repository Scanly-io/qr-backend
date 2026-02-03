# Cloudflare R2 Setup Guide

## Why Cloudflare R2?

**Cost Comparison (10,000 active users):**

| Service | Storage | Requests | Egress | CDN | **Total** |
|---------|---------|----------|--------|-----|-----------|
| **AWS S3 + CloudFront** | $2.30 | $0.90 | $45.00 | $42.50 | **~$90/month** |
| **AWS S3 + Cloudflare CDN** | $2.30 | $0.90 | $9.00 | $20.00 | **~$32/month** |
| **Cloudflare R2** 🎉 | $1.50 | $0.81 | $0.00 | $0.00 | **~$2.31/month** |

**Savings: 97% cheaper than AWS S3!**

---

## 🎯 Key Benefits

1. **Zero Egress Fees** - Unlimited free downloads (biggest cost in S3!)
2. **Built-in CDN** - Cloudflare's 300+ edge locations included
3. **S3-Compatible** - Same API as AWS S3 (easy migration)
4. **Automatic SSL** - HTTPS out of the box
5. **Fast Global Delivery** - Sub-50ms response times worldwide
6. **No Bandwidth Charges** - Perfect for high-traffic QR platforms

---

## 📋 Setup Steps

### Step 1: Create Cloudflare Account
1. Go to https://dash.cloudflare.com/sign-up
2. Sign up (free account works!)
3. Verify your email

### Step 2: Enable R2 Storage
1. Log into Cloudflare Dashboard
2. Go to **R2 Object Storage** in left sidebar
3. Click **"Purchase R2 Plan"**
   - Free: 10GB storage, 1M Class A operations/month
   - Paid: $0.015/GB storage, $4.50/million writes, $0.36/million reads
4. Accept terms

### Step 3: Create R2 Bucket
1. Click **"Create bucket"**
2. Bucket name: `qr-platform-assets` (must be unique globally)
3. Location: Automatic (Cloudflare distributes globally)
4. Click **"Create bucket"**

### Step 4: Generate R2 API Tokens
1. In R2 dashboard, click **"Manage R2 API Tokens"**
2. Click **"Create API Token"**
3. Token name: `qr-platform-access`
4. Permissions: **Object Read & Write**
5. Choose specific buckets: Select `qr-platform-assets`
6. Click **"Create API Token"**
7. **SAVE THESE CREDENTIALS** (shown once!):
   ```
   Access Key ID: xxxxxxxxxxxxxxxxxxxx
   Secret Access Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
   ```

### Step 5: Get Account ID
1. In Cloudflare Dashboard, look at the URL
2. URL format: `https://dash.cloudflare.com/{ACCOUNT_ID}/r2/overview`
3. Copy the `{ACCOUNT_ID}` (it's a hex string like `abc123def456`)
4. OR: Go to **R2 → Settings** to see your Account ID

### Step 6: Configure Public Access (Optional)
**For public assets (images, CSS, JS):**

1. Go to your bucket → **Settings**
2. Find **"Public Access"** section
3. Click **"Allow Access"**
4. Choose domain: `qr-platform-assets.YOUR_ACCOUNT_ID.r2.dev`
5. Enable **"Bucket Public URL"**

**Security Note:** Only do this if you want assets publicly accessible. For private assets, use presigned URLs.

### Step 7: Update Environment Variables
Edit `/services/domains-service/.env`:

```bash
# Storage Provider (use R2!)
STORAGE_PROVIDER=r2

# Cloudflare R2 Credentials
AWS_ACCESS_KEY_ID=your_r2_access_key_id_from_step_4
AWS_SECRET_ACCESS_KEY=your_r2_secret_access_key_from_step_4
AWS_S3_BUCKET=qr-platform-assets
AWS_REGION=auto

# CDN Domain (R2 public URL)
CDN_DOMAIN=qr-platform-assets.YOUR_ACCOUNT_ID.r2.dev

# Cloudflare Account ID (from step 5)
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

### Step 8: Test Connection
```bash
# Start domains service
npm run dev:domains

# Test upload via API
curl -X POST http://localhost:3010/subdomains/publish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assets": [{
      "name": "test.txt",
      "content": "SGVsbG8gV29ybGQ=",
      "contentType": "text/plain"
    }]
  }'

# Check if file exists
curl https://qr-platform-assets.YOUR_ACCOUNT_ID.r2.dev/yoursubdomain/files/test.txt
```

---

## 🔄 Migrating from AWS S3 to R2

### Option 1: Fresh Start (Recommended for new projects)
Just set `STORAGE_PROVIDER=r2` and all new uploads go to R2.

### Option 2: Migrate Existing Data
Use `rclone` to copy from S3 to R2:

```bash
# Install rclone
brew install rclone  # macOS
# or
curl https://rclone.org/install.sh | sudo bash  # Linux

# Configure AWS S3
rclone config create s3 s3 \
  provider=AWS \
  access_key_id=YOUR_AWS_KEY \
  secret_access_key=YOUR_AWS_SECRET \
  region=us-east-1

# Configure Cloudflare R2
rclone config create r2 s3 \
  provider=Cloudflare \
  access_key_id=YOUR_R2_KEY \
  secret_access_key=YOUR_R2_SECRET \
  endpoint=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# Copy all files
rclone copy s3:qr-platform-assets r2:qr-platform-assets --progress

# Verify
rclone check s3:qr-platform-assets r2:qr-platform-assets
```

---

## 💰 Cost Breakdown

### Storage Costs
- **10GB:** $0.15/month
- **100GB:** $1.50/month
- **1TB:** $15/month

### Request Costs
- **Class A (writes):** $4.50 per million operations
- **Class B (reads):** $0.36 per million operations

### Egress (Data Transfer OUT)
- **ANY amount:** **$0.00** (FREE!) 🎉

### Example: 10,000 Active Users
```
Scenario:
- Each user has 10 images (1MB each) = 10MB per user
- 100K users × 10MB = 1TB storage
- Each image viewed 10 times/month = 1M reads
- Users upload 10K new images/month = 10K writes

Costs:
Storage: 1,000GB × $0.015 = $15.00
Writes: 10,000 × $4.50/1M = $0.045
Reads: 1,000,000 × $0.36/1M = $0.36
Egress: ∞ downloads × $0.00 = $0.00
────────────────────────────────────
TOTAL: $15.41/month

Compare to AWS S3:
Storage: 1TB × $0.023 = $23.00
Requests: ~$1.00
Egress: 10TB × $0.09 = $900.00 💸
────────────────────────────────────
TOTAL: $924/month (60x more expensive!)
```

---

## 🚀 Custom Domain for R2 (Optional)

Make assets accessible at `cdn.yourdomain.com` instead of R2's URL:

### Step 1: Add Custom Domain in R2
1. Go to your R2 bucket → **Settings**
2. Find **"Custom Domains"**
3. Click **"Connect Domain"**
4. Enter: `cdn.yourdomain.com`

### Step 2: Add DNS Record
In Cloudflare DNS:
```
Type: CNAME
Name: cdn
Target: qr-platform-assets.YOUR_ACCOUNT_ID.r2.dev
Proxy: ON (orange cloud)
```

### Step 3: Update .env
```bash
CDN_DOMAIN=cdn.yourdomain.com
```

Now all asset URLs will be:
- `https://cdn.yourdomain.com/username/images/photo.jpg`

---

## 🔐 Security Best Practices

### 1. Token Permissions
- Use **minimal permissions** (only what you need)
- Create separate tokens for dev/staging/prod
- Rotate tokens every 90 days

### 2. Bucket Access
- Keep buckets **private** by default
- Use presigned URLs for temporary access
- Only enable public access for truly public assets

### 3. CORS Configuration
In R2 bucket settings, configure CORS:
```json
{
  "AllowedOrigins": ["https://yourdomain.com"],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}
```

### 4. Lifecycle Rules (Coming Soon)
R2 will support lifecycle rules to:
- Auto-delete old files
- Move to cheaper storage tiers
- Clean up abandoned uploads

---

## 📊 Monitoring & Analytics

### View R2 Metrics
1. Cloudflare Dashboard → **R2**
2. Select your bucket
3. View metrics:
   - Storage usage
   - Request counts
   - Egress (always $0!)
   - Errors

### Set Up Alerts
1. Go to **Notifications**
2. Create alert for:
   - Storage > 80% quota
   - High error rates
   - Unusual request patterns

---

## 🆚 When to Use AWS S3 Instead

**Use AWS S3 if:**
- ❌ You need versioning (R2 doesn't support yet)
- ❌ You need object locking for compliance
- ❌ You need complex lifecycle policies
- ❌ You're already deep in AWS ecosystem
- ❌ You need HIPAA/PCI compliance (R2 coming soon)

**Use Cloudflare R2 if:**
- ✅ You want to save 90%+ on costs
- ✅ You have high egress (downloads)
- ✅ You want simple S3-compatible storage
- ✅ You're already using Cloudflare
- ✅ You want built-in CDN
- ✅ You prioritize cost over advanced features

---

## 🎓 Quick Start Checklist

- [ ] Create Cloudflare account
- [ ] Enable R2 in dashboard
- [ ] Create bucket: `qr-platform-assets`
- [ ] Generate R2 API token
- [ ] Copy Access Key ID and Secret
- [ ] Get your Account ID
- [ ] Update `.env` with credentials
- [ ] Set `STORAGE_PROVIDER=r2`
- [ ] Test file upload
- [ ] Configure public access (optional)
- [ ] Set up custom domain (optional)
- [ ] Configure CORS rules

---

## 📞 Support

**Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/
**Community Discord:** https://discord.cloudflare.com
**Status Page:** https://www.cloudflarestatus.com/

---

## 💡 Pro Tips

1. **Use R2 for everything with high egress**
   - User uploads (profile pics, documents)
   - Microsite assets (images, videos)
   - QR code images
   - Static website files

2. **Enable public access carefully**
   - Only for truly public assets
   - Private files → use presigned URLs

3. **Combine with Cloudflare Workers**
   - Add authentication layer
   - Image resizing on-the-fly
   - Dynamic watermarking
   - Custom access rules

4. **Monitor costs in dashboard**
   - Set budget alerts
   - Track growth trends
   - Optimize if needed

5. **Use cache control headers**
   ```typescript
   CacheControl: 'public, max-age=31536000' // 1 year
   ```
   This ensures assets are cached at the edge!

---

**Recommendation: Start with Cloudflare R2!**

The cost savings alone make it worth it, especially as you scale. You can always migrate to S3 later if you need advanced features.

**Estimated Savings:**
- Year 1 (10K users): **Save $1,056**
- Year 2 (100K users): **Save $10,560**
- Year 3 (1M users): **Save $105,600**

That's significant money you can reinvest in growth! 🚀
