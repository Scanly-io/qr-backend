/**
 * Kafka topic constants for the ML service.
 */
export const TOPICS = {
  // Subscribe to these events
  MICROSITE_CREATED: 'microsite.created',
  MICROSITE_UPDATED: 'microsite.updated',
  QR_CREATED: 'qr.created',
  QR_SCANNED: 'qr.scanned',
  USER_REGISTERED: 'user.registered',
  CONVERSION_TRACKED: 'conversion.tracked',
  INTEGRATION_CONNECTED: 'integration.connected',
  
  // Publish these events
  AI_GENERATION_STARTED: 'ai.generation.started',
  AI_GENERATION_COMPLETED: 'ai.generation.completed',
  AI_GENERATION_FAILED: 'ai.generation.failed',
  ACCESSIBILITY_SCAN_COMPLETED: 'accessibility.scan.completed',
  CTA_IMPRESSION: 'cta.impression',
  CTA_CLICK: 'cta.click',
  ML_PREDICTION_GENERATED: 'ml.prediction.generated',
  PERSONALIZATION_APPLIED: 'personalization.applied',
} as const;
