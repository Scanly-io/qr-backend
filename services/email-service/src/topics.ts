/**
 * Kafka topic constants for the email service.
 * Centralizes topic names to avoid string literals across routes.
 */
export const TOPICS = {
  // Subscribe to these events
  USER_REGISTERED: 'user.registered',
  USER_PASSWORD_RESET: 'user.password_reset',
  QR_CREATED: 'qr.created',
  QR_SCANNED: 'qr.scanned',
  CONVERSION_TRACKED: 'conversion.tracked',
  EXPERIMENT_COMPLETED: 'experiment.completed',
  INTEGRATION_CONNECTED: 'integration.connected',
  
  // Publish these events
  EMAIL_SENT: 'email.sent',
  EMAIL_DELIVERED: 'email.delivered',
  EMAIL_OPENED: 'email.opened',
  EMAIL_CLICKED: 'email.clicked',
  EMAIL_BOUNCED: 'email.bounced',
  EMAIL_FAILED: 'email.failed',
  CAMPAIGN_STARTED: 'campaign.started',
  CAMPAIGN_COMPLETED: 'campaign.completed',
} as const;
