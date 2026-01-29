/**
 * INTEGRATIONS SERVICE
 * 
 * Purpose: Connect QR platform to external tools and services
 * Port: 3014
 * 
 * What This Service Does:
 * - Webhooks (trigger external URLs when events happen)
 * - Zapier integration (connect to 5,000+ apps)
 * - Shopify integration (sync products, track sales)
 * - Stripe integration (payment processing)
 * - Email tools (Mailchimp, SendGrid, etc.)
 * - CRM integrations (HubSpot, Salesforce)
 * - Custom API connections
 * 
 * Real Example:
 * User creates QR code for product →
 * Someone scans it →
 * Webhook fires to Zapier →
 * Zapier adds lead to Google Sheets →
 * Zapier sends notification to Slack
 * 
 * Or:
 * Restaurant creates menu QR →
 * Customer scans & orders →
 * Integration sends order to POS system →
 * Integration triggers kitchen printer →
 * Integration updates inventory
 * 
 * Integrations Supported:
 * 1. Webhooks (custom HTTP callbacks)
 * 2. Zapier (via webhook triggers)
 * 3. Make/Integromat (similar to Zapier)
 * 4. Shopify (e-commerce)
 * 5. Stripe (payments)
 * 6. Mailchimp (email marketing)
 * 7. SendGrid (transactional email)
 * 8. HubSpot (CRM)
 * 9. Salesforce (enterprise CRM)
 * 10. Slack (team notifications)
 * 
 * How It Works:
 * 1. User connects an integration (OAuth or API key)
 * 2. User sets up trigger (e.g., "when QR is scanned")
 * 3. User configures action (e.g., "send to webhook")
 * 4. Service listens to Kafka events
 * 5. When event matches trigger, execute action
 * 6. Retry failed webhooks automatically
 * 
 * Database: integrations_db
 * Tables:
 * - integrations (connected apps)
 * - webhooks (webhook configurations)
 * - webhook_logs (delivery history)
 * - oauth_tokens (OAuth credentials)
 * - integration_mappings (field mappings)
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { db } from './db';
// import { producer, consumer } from './kafka';
// import { handleKafkaMessages } from './lib/kafka-handler';
import { verifyJWT } from '@qr/common';

// Import routes
import createWebhookRoute from './routes/create-webhook';
import listWebhooksRoute from './routes/list-webhooks';
import getWebhookRoute from './routes/get-webhook';
import updateWebhookRoute from './routes/update-webhook';
import deleteWebhookRoute from './routes/delete-webhook';
import testWebhookRoute from './routes/test-webhook';
import getWebhookLogsRoute from './routes/get-webhook-logs';

import connectIntegrationRoute from './routes/connect-integration';
import disconnectIntegrationRoute from './routes/disconnect-integration';
import listIntegrationsRoute from './routes/list-integrations';
import getIntegrationRoute from './routes/get-integration';

import zapierAuthRoute from './routes/zapier-auth';
import zapierTriggersRoute from './routes/zapier-triggers';
import shopifyOAuthRoute from './routes/shopify-oauth';
import stripeConnectRoute from './routes/stripe-connect';
import stripeCheckoutRoute from './routes/stripe-checkout';
import mailchimpOAuthRoute from './routes/mailchimp-oauth';
import hubspotOAuthRoute from './routes/hubspot-oauth';
import slackOAuthRoute from './routes/slack-oauth';
import googleSheetsOAuthRoute from './routes/google-sheets-oauth';
import woocommerceRoute from './routes/woocommerce';
import sendgridRoute from './routes/sendgrid';
import salesforceOAuthRoute from './routes/salesforce-oauth';
import paypalRoute from './routes/paypal';
// import appointmentsRoute from './routes/appointments'; // TODO: Convert to Fastify

const PORT = parseInt(process.env.PORT || '3014');
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// Register CORS
server.register(cors, {
  origin: true,
});

// Export verifyJWT for use in routes
export { verifyJWT };

// Health check
server.get('/health', async () => {
  return { status: 'ok', service: 'integrations-service' };
});

// Webhook routes
server.register(createWebhookRoute);
server.register(listWebhooksRoute);
server.register(getWebhookRoute);
server.register(updateWebhookRoute);
server.register(deleteWebhookRoute);
server.register(testWebhookRoute);
server.register(getWebhookLogsRoute);

// Integration routes
server.register(connectIntegrationRoute);
server.register(disconnectIntegrationRoute);
server.register(listIntegrationsRoute);
server.register(getIntegrationRoute);

// OAuth & specific integrations
server.register(zapierAuthRoute);
server.register(zapierTriggersRoute);
server.register(shopifyOAuthRoute);
server.register(stripeConnectRoute);
server.register(stripeCheckoutRoute);
server.register(mailchimpOAuthRoute);
server.register(hubspotOAuthRoute);
server.register(slackOAuthRoute);
server.register(googleSheetsOAuthRoute);
server.register(woocommerceRoute);
server.register(sendgridRoute);
server.register(salesforceOAuthRoute);
server.register(paypalRoute);

// Appointments & scheduling
// server.register(appointmentsRoute, { prefix: '/appointments' }); // TODO: Convert to Fastify

// Start Kafka consumer (disabled for now)
// handleKafkaMessages();

const start = async () => {
  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Integrations service listening on ${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

// Graceful shutdown
process.on('SIGINT', async () => {
  // await producer.disconnect();
  // await consumer.disconnect();
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  // await producer.disconnect();
  // await consumer.disconnect();
  await server.close();
  process.exit(0);
});
