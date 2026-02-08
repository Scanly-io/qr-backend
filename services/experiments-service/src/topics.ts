/**
 * Kafka topic constants for the experiments service.
 */
export const TOPICS = {
  // Published by this service
  EXPERIMENT_CREATED: 'experiment.created',
  EXPERIMENT_STARTED: 'experiment.started',
  EXPERIMENT_PAUSED: 'experiment.paused',
  EXPERIMENT_RESUMED: 'experiment.resumed',
  EXPERIMENT_COMPLETED: 'experiment.completed',
  VARIANT_ASSIGNED: 'variant.assigned',
  CONVERSION_TRACKED: 'conversion.tracked',
  WINNER_DECLARED: 'experiment.winner_declared',
  
  // Subscribed topics
  QR_SCANNED: 'qr.scanned',
  USER_ACTION: 'user.action',
} as const;
