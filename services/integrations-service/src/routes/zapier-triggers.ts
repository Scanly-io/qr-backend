import { verifyJWT } from '@qr/common';

export default async function zapierTriggersRoute(server: any) {
  server.get('/zapier/triggers', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    // Return available triggers for Zapier
    return reply.send({
      triggers: [
        {
          key: 'qr_scanned',
          name: 'QR Code Scanned',
          description: 'Triggers when a QR code is scanned',
        },
        {
          key: 'conversion_tracked',
          name: 'Conversion Tracked',
          description: 'Triggers when a conversion is tracked',
        },
        {
          key: 'experiment_completed',
          name: 'Experiment Completed',
          description: 'Triggers when an A/B test completes',
        },
      ],
    });
  });
}
