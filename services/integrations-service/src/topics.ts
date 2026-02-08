/**
 * Kafka topic constants for the integrations service.
 */
export const TOPICS = {
  // Subscribe to these events
  QR_SCANNED: 'qr.scanned',
  QR_CREATED: 'qr.created',
  CONVERSION_TRACKED: 'analytics.conversion',
  EXPERIMENT_COMPLETED: 'experiments.completed',
  
  // Publish these events
  WEBHOOK_TRIGGERED: 'integrations.webhook.triggered',
  WEBHOOK_FAILED: 'integrations.webhook.failed',
  INTEGRATION_CONNECTED: 'integrations.connected',
  INTEGRATION_ERROR: 'integrations.error',
} as const;
