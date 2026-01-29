import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendEmail } from '../lib/email-provider';

/**
 * TEST EMAIL ROUTE
 * 
 * Simple route to test email sending
 */

const sendTestEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
  userId: z.string().uuid(),
});

export const testRoutes: FastifyPluginAsync = async (server) => {
  
  // Send test email
  server.post('/send', async (request, reply) => {
    try {
      const { to, subject, html, userId } = sendTestEmailSchema.parse(request.body);

      const result = await sendEmail({
        to,
        subject,
        html,
        userId,
        type: 'transactional',
      });

      return reply.send({
        message: 'Email sent successfully',
        ...result,
      });

    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
};
