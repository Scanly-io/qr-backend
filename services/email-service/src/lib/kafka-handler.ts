import { consumer, TOPICS } from '../kafka';
import { sendEmail } from './email-provider';
import { db } from '../db';
import { emailAutomations, emailSubscribers } from '../schema';
import { eq } from 'drizzle-orm';
import { renderTemplate } from './template-engine';

/**
 * KAFKA MESSAGE HANDLER
 * 
 * Listens to events and triggers automated emails:
 * - user.registered → Welcome email
 * - user.password_reset → Password reset email  
 * - qr.created → QR created confirmation
 * - qr.scanned → Scan alert (if enabled)
 * - conversion.tracked → Conversion notification
 */

export async function handleKafkaMessages() {
  await consumer.connect();
  
  await consumer.subscribe({
    topics: [
      TOPICS.USER_REGISTERED,
      TOPICS.USER_PASSWORD_RESET,
      TOPICS.QR_CREATED,
      TOPICS.QR_SCANNED,
      TOPICS.CONVERSION_TRACKED,
      TOPICS.EXPERIMENT_COMPLETED,
      TOPICS.INTEGRATION_CONNECTED,
    ],
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value?.toString() || '{}');
        
        // Route to appropriate handler
        switch (topic) {
          case TOPICS.USER_REGISTERED:
            await handleUserRegistered(data);
            break;
          case TOPICS.USER_PASSWORD_RESET:
            await handlePasswordReset(data);
            break;
          case TOPICS.QR_CREATED:
            await handleQRCreated(data);
            break;
          case TOPICS.QR_SCANNED:
            await handleQRScanned(data);
            break;
          case TOPICS.CONVERSION_TRACKED:
            await handleConversion(data);
            break;
          case TOPICS.EXPERIMENT_COMPLETED:
            await handleExperimentCompleted(data);
            break;
          case TOPICS.INTEGRATION_CONNECTED:
            await handleIntegrationConnected(data);
            break;
        }
        
      } catch (error) {
        console.error('Kafka message processing error:', error);
      }
    },
  });
}

// Welcome email on user registration
async function handleUserRegistered(data: any) {
  const { userId, email, firstName } = data;

  const { html, text } = renderTemplate({
    template: WELCOME_EMAIL_TEMPLATE,
    variables: {
      firstName: firstName || 'there',
      loginUrl: `${process.env.APP_URL}/login`,
    },
  });

  await sendEmail({
    to: email,
    subject: 'Welcome to QR Platform! 🎉',
    html,
    text,
    userId,
    type: 'transactional',
  });
}

// Password reset email
async function handlePasswordReset(data: any) {
  const { userId, email, resetToken } = data;

  const { html, text } = renderTemplate({
    template: PASSWORD_RESET_TEMPLATE,
    variables: {
      resetUrl: `${process.env.APP_URL}/reset-password?token=${resetToken}`,
    },
  });

  await sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html,
    text,
    userId,
    type: 'transactional',
  });
}

// QR code created confirmation
async function handleQRCreated(data: any) {
  const { userId, qrId, qrName, email } = data;

  const { html, text } = renderTemplate({
    template: QR_CREATED_TEMPLATE,
    variables: {
      qrName,
      qrUrl: `${process.env.APP_URL}/qr/${qrId}`,
      dashboardUrl: `${process.env.APP_URL}/dashboard`,
    },
  });

  await sendEmail({
    to: email,
    subject: `Your QR Code "${qrName}" is Ready!`,
    html,
    text,
    userId,
    type: 'transactional',
  });
}

// QR scan alert (if user has enabled notifications)
async function handleQRScanned(data: any) {
  const { userId, qrId, qrName, location, device } = data;

  // Check if user wants scan alerts
  // TODO: Check email preferences
  
  const { html, text } = renderTemplate({
    template: SCAN_ALERT_TEMPLATE,
    variables: {
      qrName,
      location: location || 'Unknown',
      device: device || 'Unknown',
      analyticsUrl: `${process.env.APP_URL}/analytics/${qrId}`,
    },
  });

  // Send notification
  // TODO: Get user email from userId
}

// Conversion tracked
async function handleConversion(data: any) {
  // TODO: Implement conversion notification
}

// A/B test completed
async function handleExperimentCompleted(data: any) {
  // TODO: Implement experiment results email
}

// Integration connected
async function handleIntegrationConnected(data: any) {
  const { userId, email, type } = data;

  const { html, text } = renderTemplate({
    template: INTEGRATION_CONNECTED_TEMPLATE,
    variables: {
      integrationType: type,
      integrationsUrl: `${process.env.APP_URL}/integrations`,
    },
  });

  await sendEmail({
    to: email,
    subject: `${type} Integration Connected Successfully`,
    html,
    text,
    userId,
    type: 'transactional',
  });
}

// Simple email templates (will be moved to database later)
const WELCOME_EMAIL_TEMPLATE = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #4F46E5;">Welcome to QR Platform!</h1>
    <p>Hi {{firstName}},</p>
    <p>Thanks for signing up! We're excited to have you on board.</p>
    <p>With QR Platform, you can create beautiful QR code microsites, track analytics, and integrate with your favorite tools.</p>
    <p style="margin: 30px 0;">
      <a href="{{loginUrl}}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Get Started →
      </a>
    </p>
    <p>If you have any questions, just reply to this email!</p>
    <p>Cheers,<br>The QR Platform Team</p>
  </div>
</body>
</html>
`;

const PASSWORD_RESET_TEMPLATE = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1>Reset Your Password</h1>
    <p>We received a request to reset your password.</p>
    <p style="margin: 30px 0;">
      <a href="{{resetUrl}}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Reset Password →
      </a>
    </p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  </div>
</body>
</html>
`;

const QR_CREATED_TEMPLATE = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #10B981;">Your QR Code is Ready! ✅</h1>
    <p>Your QR code "{{qrName}}" has been created successfully.</p>
    <p style="margin: 30px 0;">
      <a href="{{qrUrl}}" style="background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        View QR Code →
      </a>
    </p>
    <p>Start sharing it to track scans and conversions!</p>
    <p><a href="{{dashboardUrl}}">Go to Dashboard</a></p>
  </div>
</body>
</html>
`;

const SCAN_ALERT_TEMPLATE = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1>🔔 New QR Code Scan!</h1>
    <p>Your QR code "{{qrName}}" was just scanned:</p>
    <ul>
      <li><strong>Location:</strong> {{location}}</li>
      <li><strong>Device:</strong> {{device}}</li>
    </ul>
    <p style="margin: 30px 0;">
      <a href="{{analyticsUrl}}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        View Analytics →
      </a>
    </p>
  </div>
</body>
</html>
`;

const INTEGRATION_CONNECTED_TEMPLATE = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #10B981;">Integration Connected! ✅</h1>
    <p>Your {{integrationType}} integration is now active.</p>
    <p>You can now sync data and automate workflows!</p>
    <p style="margin: 30px 0;">
      <a href="{{integrationsUrl}}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Manage Integrations →
      </a>
    </p>
  </div>
</body>
</html>
`;
