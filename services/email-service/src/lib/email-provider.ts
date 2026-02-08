import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { db } from '../db';
import { emailLogs } from '../schema';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';

/**
 * EMAIL PROVIDER
 * 
 * Supports multiple providers:
 * - SendGrid (recommended for production)
 * - Mailgun
 * - SMTP (for development)
 */

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '1025');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const DEFAULT_FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL || 'noreply@yourapp.com';
const DEFAULT_FROM_NAME = process.env.DEFAULT_FROM_NAME || 'QR Platform';

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Initialize SMTP transporter
const smtpTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
});

export interface SendEmailOptions {
  to: string;
  toName?: string;
  from?: string;
  fromName?: string;
  subject: string;
  html: string;
  text?: string;
  userId: string;
  type?: 'transactional' | 'campaign' | 'automation';
  campaignId?: string;
  automationId?: string;
  templateId?: string;
  metadata?: Record<string, any>;
}

export async function sendEmail(options: SendEmailOptions) {
  const {
    to,
    toName,
    from = DEFAULT_FROM_EMAIL,
    fromName = DEFAULT_FROM_NAME,
    subject,
    html,
    text,
    userId,
    type = 'transactional',
    campaignId,
    automationId,
    templateId,
    metadata = {},
  } = options;

  const provider = SENDGRID_API_KEY ? 'sendgrid' : 'smtp';
  
  try {
    let providerId: string | undefined;

    if (provider === 'sendgrid') {
      // Send via SendGrid
      const msg = {
        to: toName ? `${toName} <${to}>` : to,
        from: fromName ? `${fromName} <${from}>` : from,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      };

      const response = await sgMail.send(msg);
      providerId = response[0].headers['x-message-id'] as string;
      
    } else {
      // Send via SMTP
      const info = await smtpTransporter.sendMail({
        from: fromName ? `"${fromName}" <${from}>` : from,
        to: toName ? `"${toName}" <${to}>` : to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      });

      providerId = info.messageId;
    }

    // Log successful send
    const [log] = await db.insert(emailLogs).values({
      userId,
      recipientEmail: to,
      recipientName: toName,
      subject,
      campaignId,
      automationId,
      templateId,
      type,
      status: 'sent',
      provider,
      providerId,
      sentAt: new Date(),
      metadata,
    }).returning();

    // Publish event
    await publishEvent(TOPICS.EMAIL_SENT, {
      emailLogId: log.id,
      userId,
      recipientEmail: to,
      subject,
      type,
      campaignId,
      automationId,
      timestamp: new Date().toISOString(),
    });

    return { success: true, emailLogId: log.id, providerId };

  } catch (error: any) {
    // Log failed send
    await db.insert(emailLogs).values({
      userId,
      recipientEmail: to,
      recipientName: toName,
      subject,
      campaignId,
      automationId,
      templateId,
      type,
      status: 'failed',
      provider,
      error: error.message,
      metadata,
    });

    // Publish failure event
    await publishEvent(TOPICS.EMAIL_FAILED, {
      userId,
      recipientEmail: to,
      subject,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

// Bulk send for campaigns
export async function sendBulkEmails(emails: SendEmailOptions[]) {
  const results = [];
  
  for (const emailOptions of emails) {
    try {
      const result = await sendEmail(emailOptions);
      results.push({ ...result, email: emailOptions.to });
    } catch (error: any) {
      results.push({ 
        success: false, 
        email: emailOptions.to, 
        error: error.message 
      });
    }
  }

  return results;
}
