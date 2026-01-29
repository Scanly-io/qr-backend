import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { printJobs, printTemplates } from '../schema.js';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { Readable } from 'stream';

const createBatchJobSchema = z.object({
  name: z.string().min(1),
  templateId: z.string().uuid(),
  qrCodes: z.array(z.object({
    id: z.string(),
    url: z.string().url(),
    data: z.record(z.any()).optional(),
  })).min(1).max(10000), // Support up to 10K QR codes
});

export default async function batchRoutes(fastify: FastifyInstance) {
  
  // Create batch print job
  fastify.post('/', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const userId = (request.user as any)?.id || 'system';
    const validatedData = createBatchJobSchema.parse(request.body);
    
    // Verify template exists and belongs to organization
    const [template] = await db.select()
      .from(printTemplates)
      .where(and(
        eq(printTemplates.id, validatedData.templateId),
        eq(printTemplates.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!template) {
      return reply.code(404).send({ error: 'Template not found' });
    }
    
    // Create print job
    const [job] = await db.insert(printJobs).values({
      organizationId,
      name: validatedData.name,
      templateId: validatedData.templateId,
      qrCodes: validatedData.qrCodes,
      totalQRs: validatedData.qrCodes.length,
      status: 'pending',
      createdBy: userId,
    }).returning();
    
    // Start async processing (in production, this would be a queue job)
    processJob(job.id, template, validatedData.qrCodes).catch(err => {
      console.error('Job processing error:', err);
    });
    
    reply.code(201).send(job);
  });
  
  // List print jobs
  fastify.get('/', async (request, reply) => {
    const { status, limit = 50, offset = 0 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(printJobs.organizationId, organizationId)];
    
    if (status) {
      conditions.push(eq(printJobs.status, status));
    }
    
    const jobs = await db.select()
      .from(printJobs)
      .where(and(...conditions))
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    return { jobs };
  });
  
  // Get job status
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [job] = await db.select()
      .from(printJobs)
      .where(and(
        eq(printJobs.id, id),
        eq(printJobs.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }
    
    return job;
  });
  
  // Download PDF
  fastify.get('/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [job] = await db.select()
      .from(printJobs)
      .where(and(
        eq(printJobs.id, id),
        eq(printJobs.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!job || job.status !== 'completed' || !job.pdfUrl) {
      return reply.code(404).send({ error: 'PDF not available' });
    }
    
    // In production, redirect to S3/R2 URL
    // For now, return the URL
    return { downloadUrl: job.pdfUrl };
  });
  
  // Generate preview (single page)
  fastify.post('/preview', async (request, reply) => {
    const { templateId, sampleData } = request.body as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [template] = await db.select()
      .from(printTemplates)
      .where(and(
        eq(printTemplates.id, templateId),
        eq(printTemplates.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!template) {
      return reply.code(404).send({ error: 'Template not found' });
    }
    
    // Generate single preview QR
    const sampleQR = sampleData?.url || 'https://app.scanly.io/demo';
    const qrBuffer = await QRCode.toBuffer(sampleQR, {
      width: 200,
      margin: 1,
    });
    
    // Create minimal PDF with one label
    const doc = new PDFDocument({
      size: [template.labelWidth, template.labelHeight],
      margin: 0,
    });
    
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    // Render QR code
    doc.image(qrBuffer, 10, 10, { width: 50, height: 50 });
    
    // Render text elements from template design
    if (template.design?.elements) {
      for (const element of template.design.elements) {
        if (element.type === 'text') {
          doc.fontSize(element.fontSize || 12)
            .text(element.content || '', element.x, element.y, {
              width: element.width,
              align: element.align as any,
            });
        }
      }
    }
    
    doc.end();
    
    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        reply.type('application/pdf').send(pdfBuffer);
        resolve(null);
      });
    });
  });
}

// Background job processor
async function processJob(jobId: string, template: any, qrCodes: any[]) {
  try {
    // Update status to processing
    await db.update(printJobs)
      .set({ status: 'processing', startedAt: new Date() })
      .where(eq(printJobs.id, jobId));
    
    // Create PDF document
    const doc = new PDFDocument({
      size: [template.pageWidth, template.pageHeight],
      margin: 0,
    });
    
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    const labelsPerPage = (template.columns || 3) * (template.rows || 10);
    let currentLabel = 0;
    let currentPage = 0;
    
    // Generate QR codes and layout
    for (const qr of qrCodes) {
      if (currentLabel > 0 && currentLabel % labelsPerPage === 0) {
        doc.addPage();
        currentPage++;
      }
      
      const labelIndex = currentLabel % labelsPerPage;
      const col = labelIndex % (template.columns || 3);
      const row = Math.floor(labelIndex / (template.columns || 3));
      
      const x = (template.marginLeft || 0) + col * ((template.labelWidth || 0) + (template.gapX || 0));
      const y = (template.marginTop || 0) + row * ((template.labelHeight || 0) + (template.gapY || 0));
      
      // Generate QR code
      const qrBuffer = await QRCode.toBuffer(qr.url, {
        width: template.design?.qrSize || 150,
        margin: template.design?.qrMargin || 1,
      });
      
      // Place QR code
      doc.image(qrBuffer, x + 10, y + 10, { 
        width: template.design?.qrSize || 50, 
        height: template.design?.qrSize || 50 
      });
      
      // Render template elements
      if (template.design?.elements) {
        for (const element of template.design.elements) {
          if (element.type === 'text') {
            let content = element.content || '';
            
            // Replace data fields like {asset_name}
            if (element.dataField && qr.data) {
              content = qr.data[element.dataField] || content;
            }
            
            doc.fontSize(element.fontSize || 10)
              .text(content, x + element.x, y + element.y, {
                width: element.width,
                align: element.align as any,
              });
          }
        }
      }
      
      currentLabel++;
    }
    
    doc.end();
    
    // Wait for PDF generation to complete
    await new Promise((resolve) => {
      doc.on('end', resolve);
    });
    
    const pdfBuffer = Buffer.concat(chunks);
    
    // In production: Upload to S3/R2 and get URL
    const pdfUrl = `https://storage.scanly.io/print-jobs/${jobId}.pdf`;
    
    // Update job with results
    await db.update(printJobs)
      .set({
        status: 'completed',
        pdfUrl,
        pdfSize: pdfBuffer.length,
        pageCount: currentPage + 1,
        completedAt: new Date(),
      })
      .where(eq(printJobs.id, jobId));
    
  } catch (error: any) {
    console.error('Job processing failed:', error);
    
    await db.update(printJobs)
      .set({
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
      })
      .where(eq(printJobs.id, jobId));
  }
}
