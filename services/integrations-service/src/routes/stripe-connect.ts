import axios from 'axios';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { integrations, oauthTokens, payments } from '../schema';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';
import { verifyJWT } from '@qr/common';

/**
 * STRIPE CONNECT INTEGRATION
 * 
 * THIS IS CRITICAL FOR MARKETPLACE FUNCTIONALITY
 * 
 * Purpose: Enable automatic revenue splitting on payments
 * - User connects their Stripe account
 * - We process payments on their behalf
 * - Automatic platform fee deduction (e.g., 2-5%)
 * - No manual invoicing needed
 * 
 * Revenue Model Example:
 * - Customer buys $100 product via QR
 * - $95 → User's Stripe account
 * - $5 → Our platform account (automatic)
 * 
 * This is how Shopify, Patreon, Airbnb make money!
 */

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID || '';
const STRIPE_API_KEY = process.env.STRIPE_SECRET_KEY || '';
const REDIRECT_URI = process.env.APP_URL + '/api/integrations/stripe/callback';

export default async function stripeConnectRoute(server: any) {
  
  // Step 1: Initiate Stripe Connect OAuth
  server.get('/stripe/connect', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Stripe Connect OAuth URL
    const authUrl = 'https://connect.stripe.com/oauth/authorize?' +
      `response_type=code&` +
      `client_id=${STRIPE_CLIENT_ID}&` +
      `scope=read_write&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `state=${userId}`; // Pass userId in state for security

    return reply.redirect(authUrl);
  });

  // Step 2: OAuth Callback (no auth needed - callback from Stripe)
  server.get('/stripe/callback', async (request: any, reply: any) => {
    const { code, state, error } = request.query as { 
      code?: string; 
      state?: string;
      error?: string;
    };

    if (error) {
      server.log.error({ error }, 'Stripe Connect authorization failed');
      return reply.redirect(`${process.env.FRONTEND_URL}/integrations?error=stripe`);
    }

    if (!code || !state) {
      return reply.status(400).send({ error: 'Missing required parameters' });
    }

    const userId = state; // state contains userId

    try {
      // Exchange authorization code for access token
      const tokenResponse = await axios.post(
        'https://connect.stripe.com/oauth/token',
        {
          grant_type: 'authorization_code',
          code,
          client_secret: STRIPE_API_KEY,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { 
        access_token, 
        refresh_token, 
        stripe_user_id,
        scope,
        token_type,
      } = tokenResponse.data;

      // Get connected account details
      const accountResponse = await axios.get(
        `https://api.stripe.com/v1/accounts/${stripe_user_id}`,
        {
          headers: {
            Authorization: `Bearer ${STRIPE_API_KEY}`,
          },
        }
      );

      const accountData = accountResponse.data;

      // Store integration
      const [integration] = await db.insert(integrations).values({
        userId,
        type: 'stripe',
        name: accountData.business_profile?.name || accountData.email || 'Stripe Account',
        authType: 'oauth',
        credentials: {
          accessToken: access_token,
          refreshToken: refresh_token,
          stripeUserId: stripe_user_id,
        },
        config: {
          email: accountData.email,
          country: accountData.country,
          currency: accountData.default_currency,
          chargesEnabled: accountData.charges_enabled,
          payoutsEnabled: accountData.payouts_enabled,
          accountType: accountData.type,
        },
        isActive: accountData.charges_enabled,
      }).returning();

      // Store OAuth token
      await db.insert(oauthTokens).values({
        userId,
        integrationId: integration.id,
        provider: 'stripe',
        accessToken: access_token,
        refreshToken: refresh_token,
        scope: scope || 'read_write',
      });

      // Publish event
      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId,
        integrationId: integration.id,
        type: 'stripe',
        stripeUserId: stripe_user_id,
        timestamp: new Date().toISOString(),
      });

      server.log.info({ userId, stripeUserId: stripe_user_id }, 'Stripe Connect successful');

      // Redirect to success page
      return reply.redirect(`${process.env.FRONTEND_URL}/integrations?success=stripe`);

    } catch (error) {
      server.log.error({ error }, 'Stripe Connect OAuth error');
      return reply.status(500).send({ error: 'Failed to connect Stripe account' });
    }
  });

  // Get connected Stripe account details
  server.get('/stripe/:integrationId/account', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };

    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, userId)
      ))
      .limit(1);

    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }

    const { stripeUserId, accessToken } = integration.credentials as any;

    try {
      const response = await axios.get(
        `https://api.stripe.com/v1/accounts/${stripeUserId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return reply.send({ account: response.data });
    } catch (error) {
      server.log.error({ error }, 'Failed to fetch Stripe account');
      return reply.status(500).send({ error: 'Failed to fetch account details' });
    }
  });

  // Create payment with application fee (CORE MARKETPLACE FUNCTIONALITY)
  server.post('/stripe/:integrationId/charge', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };
    const { 
      amount, 
      currency, 
      source, 
      description,
      platformFeePercent = 2, // Default 2% platform fee
    } = request.body as any;

    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, userId)
      ))
      .limit(1);

    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }

    const { stripeUserId } = integration.credentials as any;

    // Calculate platform fee
    const applicationFeeAmount = Math.round(amount * (platformFeePercent / 100));

    try {
      // Create charge on connected account with application fee
      const response = await axios.post(
        'https://api.stripe.com/v1/charges',
        new URLSearchParams({
          amount: amount.toString(),
          currency: currency || 'usd',
          source,
          description: description || 'QR Platform Purchase',
          application_fee_amount: applicationFeeAmount.toString(),
        }),
        {
          headers: {
            Authorization: `Bearer ${STRIPE_API_KEY}`,
            'Stripe-Account': stripeUserId,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      server.log.info({
        userId,
        amount,
        platformFee: applicationFeeAmount,
        chargeId: response.data.id,
      }, 'Stripe charge created with platform fee');

      return reply.send({ 
        charge: response.data,
        platformFee: applicationFeeAmount,
        userReceives: amount - applicationFeeAmount,
      });
    } catch (error) {
      server.log.error({ error }, 'Failed to create Stripe charge');
      return reply.status(500).send({ error: 'Failed to process payment' });
    }
  });

  // Disconnect account
  server.delete('/stripe/:integrationId/disconnect', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };

    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, userId)
      ))
      .limit(1);

    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }

    try {
      // Deauthorize the connected account
      await axios.post(
        'https://connect.stripe.com/oauth/deauthorize',
        new URLSearchParams({
          client_id: STRIPE_CLIENT_ID,
          stripe_user_id: (integration.credentials as any).stripeUserId,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Mark integration as inactive
      await db
        .update(integrations)
        .set({ isActive: false })
        .where(eq(integrations.id, integrationId));

      return reply.send({ message: 'Stripe account disconnected successfully' });
    } catch (error) {
      server.log.error({ error }, 'Failed to disconnect Stripe account');
      return reply.status(500).send({ error: 'Failed to disconnect account' });
    }
  });

  // ====================================================================
  // CREATE CHECKOUT SESSION - For Payment Block in Microsites
  // ====================================================================
  // Supports two modes:
  // 1. Direct Charges: When user has connected Stripe account, payments go directly to them
  // 2. Platform Charges: Fallback to platform's Stripe account (for demos/testing)
  // ====================================================================
  server.post('/stripe/create-checkout', async (request: any, reply: any) => {
    const { 
      amount, 
      currency = 'USD', 
      description,
      successUrl,
      cancelUrl,
      micrositeId,
      blockId,
      customerEmail,
      mode = 'payment', // 'payment' | 'subscription'
      lineItems,        // Multi-product support
      metadata = {},
      userId,           // Optional: microsite owner's userId for connected account lookup
    } = request.body as {
      amount?: number;
      currency?: string;
      description?: string;
      successUrl: string;
      cancelUrl: string;
      micrositeId?: string;
      blockId?: string;
      customerEmail?: string;
      mode?: 'payment' | 'subscription';
      lineItems?: Array<{
        name: string;
        description?: string;
        price: number;
        quantity: number;
        imageUrl?: string;
        stripePriceId?: string;
      }>;
      metadata?: Record<string, string>;
      userId?: string;
    };

    // Validate - either amount or lineItems required
    if (!lineItems?.length && (!amount || amount <= 0)) {
      return reply.status(400).send({ error: 'Amount or line items are required' });
    }

    if (!successUrl || !cancelUrl) {
      return reply.status(400).send({ error: 'Success and cancel URLs are required' });
    }

    try {
      // Check if microsite owner has a connected Stripe account
      let connectedAccountId: string | null = null;
      let applicationFeePercent = 0; // Platform fee percentage (e.g., 5 = 5%)
      let ownerUserId = userId;
      
      // If micrositeId is provided but not userId, look up the microsite owner
      if (micrositeId && !userId) {
        try {
          // Call microsite service to get owner (internal service call)
          const micrositeResponse = await axios.get(
            `http://microsite-service:3012/internal/microsite/${micrositeId}/owner`,
            { timeout: 5000 }
          );
          ownerUserId = micrositeResponse.data?.userId;
          server.log.info({ micrositeId, ownerUserId }, 'Looked up microsite owner');
        } catch (err) {
          server.log.warn({ micrositeId, error: err }, 'Could not look up microsite owner, using platform account');
        }
      }
      
      if (ownerUserId) {
        // Look up user's connected Stripe account
        const [integration] = await db
          .select()
          .from(integrations)
          .where(and(
            eq(integrations.userId, ownerUserId),
            eq(integrations.type, 'stripe'),
            eq(integrations.isActive, true)
          ))
          .limit(1);
        
        if (integration) {
          const credentials = integration.credentials as { stripeUserId?: string };
          if (credentials?.stripeUserId) {
            connectedAccountId = credentials.stripeUserId;
            applicationFeePercent = 5; // 5% platform fee
            server.log.info({ 
              userId: ownerUserId, 
              connectedAccountId 
            }, 'Using connected Stripe account for direct charge');
          }
        }
      }

      // Create Stripe Checkout Session
      const params = new URLSearchParams();
      params.append('mode', mode);
      params.append('success_url', successUrl);
      params.append('cancel_url', cancelUrl);
      
      if (lineItems && lineItems.length > 0) {
        // Multi-product checkout
        lineItems.forEach((item, index) => {
          if (item.stripePriceId) {
            // Use existing Stripe price ID
            params.append(`line_items[${index}][price]`, item.stripePriceId);
            params.append(`line_items[${index}][quantity]`, String(item.quantity));
          } else {
            // Create price on the fly
            params.append(`line_items[${index}][price_data][currency]`, currency.toLowerCase());
            params.append(`line_items[${index}][price_data][unit_amount]`, String(Math.round(item.price * 100)));
            params.append(`line_items[${index}][price_data][product_data][name]`, item.name);
            if (item.description) {
              params.append(`line_items[${index}][price_data][product_data][description]`, item.description);
            }
            if (item.imageUrl) {
              params.append(`line_items[${index}][price_data][product_data][images][0]`, item.imageUrl);
            }
            params.append(`line_items[${index}][quantity]`, String(item.quantity));
          }
        });
      } else {
        // Single amount payment
        params.append('line_items[0][price_data][currency]', currency.toLowerCase());
        params.append('line_items[0][price_data][unit_amount]', String(Math.round(amount! * 100))); // Convert to cents
        params.append('line_items[0][price_data][product_data][name]', description || 'Payment');
        params.append('line_items[0][quantity]', '1');
      }
      
      if (customerEmail) {
        params.append('customer_email', customerEmail);
      }
      
      // Add metadata for tracking
      if (micrositeId) {
        params.append('metadata[micrositeId]', micrositeId);
      }
      if (blockId) {
        params.append('metadata[blockId]', blockId);
      }
      if (userId) {
        params.append('metadata[userId]', userId);
      }
      // Add custom metadata
      Object.entries(metadata).forEach(([key, value]) => {
        params.append(`metadata[${key}]`, value);
      });

      // Calculate total for application fee
      const totalAmount = amount 
        ? Math.round(amount * 100) 
        : lineItems?.reduce((sum, i) => sum + Math.round(i.price * 100) * i.quantity, 0) || 0;

      // If connected account, add application fee for platform revenue
      if (connectedAccountId && applicationFeePercent > 0) {
        const applicationFeeAmount = Math.round(totalAmount * (applicationFeePercent / 100));
        params.append('payment_intent_data[application_fee_amount]', String(applicationFeeAmount));
        params.append('metadata[platformFee]', String(applicationFeeAmount / 100));
        params.append('metadata[chargeType]', 'direct');
      } else {
        params.append('metadata[chargeType]', 'platform');
      }

      // Build headers - use Stripe-Account header for connected accounts (Direct Charges)
      const headers: Record<string, string> = {
        Authorization: `Bearer ${STRIPE_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      
      if (connectedAccountId) {
        // Direct Charges: Create checkout session on the connected account
        headers['Stripe-Account'] = connectedAccountId;
      }

      const response = await axios.post(
        'https://api.stripe.com/v1/checkout/sessions',
        params.toString(),
        { headers }
      );

      const session = response.data;

      server.log.info({ 
        sessionId: session.id, 
        amount: totalAmount / 100,
        currency,
        micrositeId,
        itemCount: lineItems?.length || 1,
        connectedAccountId: connectedAccountId || 'platform',
        chargeType: connectedAccountId ? 'direct' : 'platform',
      }, 'Stripe checkout session created');

      // Track the payment attempt
      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        type: 'checkout_created',
        sessionId: session.id,
        amount: totalAmount / 100,
        currency,
        micrositeId,
        itemCount: lineItems?.length || 1,
        connectedAccountId,
        chargeType: connectedAccountId ? 'direct' : 'platform',
        timestamp: new Date().toISOString(),
      });

      return reply.send({ 
        sessionId: session.id,
        checkoutUrl: session.url,
        chargeType: connectedAccountId ? 'direct' : 'platform',
      });
    } catch (error: any) {
      server.log.error({ error: error.response?.data || error.message }, 'Failed to create checkout session');
      return reply.status(500).send({ 
        error: 'Failed to create checkout session',
        details: error.response?.data?.error?.message || error.message 
      });
    }
  });

  // ====================================================================
  // WEBHOOK HANDLER - For tracking successful payments
  // ====================================================================
  server.post('/stripe/webhook', async (request: any, reply: any) => {
    const sig = request.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret && !sig) {
      return reply.status(400).send({ error: 'Missing Stripe signature' });
    }

    try {
      const event = request.body;

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          server.log.info({ 
            sessionId: session.id,
            paymentStatus: session.payment_status,
            micrositeId: session.metadata?.micrositeId,
          }, 'Checkout session completed');

          // Store payment record
          try {
            await db.insert(payments).values({
              stripeSessionId: session.id,
              stripePaymentIntentId: session.payment_intent,
              amount: session.amount_total,
              currency: session.currency,
              status: session.payment_status === 'paid' ? 'completed' : 'pending',
              paymentStatus: session.payment_status,
              userId: session.metadata?.creatorId,
              micrositeId: session.metadata?.micrositeId,
              customerEmail: session.customer_details?.email || session.customer_email,
              metadata: session.metadata,
              completedAt: session.payment_status === 'paid' ? new Date() : null,
            });

            server.log.info({ sessionId: session.id }, 'Payment record stored');
          } catch (error) {
            server.log.error({ error, sessionId: session.id }, 'Failed to store payment record');
          }

          // Track successful payment
          if (process.env.KAFKA_DISABLED !== 'true') {
            await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
              type: 'payment_completed',
              sessionId: session.id,
              amount: session.amount_total / 100,
              currency: session.currency,
              micrositeId: session.metadata?.micrositeId,
              customerEmail: session.customer_email,
              timestamp: new Date().toISOString(),
            });
          }
          break;
        }
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          server.log.info({ 
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount 
          }, 'Payment intent succeeded');

          // Update payment record if exists
          try {
            await db.update(payments)
              .set({
                status: 'completed',
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
          } catch (error) {
            server.log.error({ error }, 'Failed to update payment record');
          }
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          server.log.error({ 
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            error: paymentIntent.last_payment_error,
          }, 'Payment failed');

          // Update payment record
          try {
            await db.update(payments)
              .set({
                status: 'failed',
                updatedAt: new Date(),
              })
              .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
          } catch (error) {
            server.log.error({ error }, 'Failed to update payment record');
          }
          break;
        }
        case 'charge.refunded': {
          const charge = event.data.object;
          server.log.info({ 
            chargeId: charge.id,
            paymentIntentId: charge.payment_intent,
          }, 'Charge refunded');

          // Update payment record
          try {
            await db.update(payments)
              .set({
                status: 'refunded',
                updatedAt: new Date(),
              })
              .where(eq(payments.stripePaymentIntentId, charge.payment_intent));
          } catch (error) {
            server.log.error({ error }, 'Failed to update payment record');
          }
          break;
        }
        default:
          server.log.info({ type: event.type }, 'Unhandled webhook event');
      }

      return reply.send({ received: true });
    } catch (error) {
      server.log.error({ error }, 'Webhook processing failed');
      return reply.status(400).send({ error: 'Webhook processing failed' });
    }
  });

  /**
   * Get Stripe Connect Status
   * Check if user has connected Stripe account
   */
  server.get('/stripe/connect/status', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const [integration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, userId),
            eq(integrations.type, 'stripe')
          )
        );

      if (!integration) {
        return reply.send({ connected: false });
      }

      const config = integration.config as any;
      return reply.send({
        connected: true,
        accountId: config.accountId,
        email: config.email,
        chargesEnabled: config.chargesEnabled,
        payoutsEnabled: config.payoutsEnabled,
      });
    } catch (error) {
      server.log.error({ error }, 'Failed to get Stripe status');
      return reply.status(500).send({ error: 'Failed to get status' });
    }
  });

  /**
   * Generate OAuth Link for Stripe Connect
   * Alternative to direct redirect - returns URL for frontend to use
   */
  server.post('/stripe/connect/oauth-link', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const authUrl = 'https://connect.stripe.com/oauth/authorize?' +
        `response_type=code&` +
        `client_id=${STRIPE_CLIENT_ID}&` +
        `scope=read_write&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `state=${userId}`;

      return reply.send({ url: authUrl });
    } catch (error) {
      server.log.error({ error }, 'Failed to generate OAuth link');
      return reply.status(500).send({ error: 'Failed to generate link' });
    }
  });

  /**
   * Disconnect Stripe Account
   */
  server.post('/stripe/connect/disconnect', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const [integration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, userId),
            eq(integrations.type, 'stripe')
          )
        );

      if (!integration) {
        return reply.status(404).send({ error: 'No Stripe account connected' });
      }

      // Delete integration
      await db.delete(integrations).where(eq(integrations.id, integration.id));

      // Publish disconnection event
      if (process.env.KAFKA_DISABLED !== 'true') {
        await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
          userId,
          integrationId: integration.id,
          provider: 'stripe',
          action: 'disconnected',
          timestamp: new Date().toISOString(),
        });
      }

      server.log.info({ userId, integrationId: integration.id }, 'Stripe account disconnected');

      return reply.send({ success: true });
    } catch (error) {
      server.log.error({ error }, 'Failed to disconnect Stripe');
      return reply.status(500).send({ error: 'Failed to disconnect' });
    }
  });

  /**
   * Get Payment History
   * Fetch all payments for the authenticated user
   */
  server.get('/stripe/payments', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { status } = request.query as { status?: string };

      // Build query conditions
      const conditions = [eq(payments.userId, userId)];
      if (status && status !== 'all') {
        conditions.push(eq(payments.status, status));
      }

      const userPayments = await db
        .select()
        .from(payments)
        .where(and(...conditions))
        .orderBy(payments.createdAt);

      return reply.send({
        payments: userPayments,
        total: userPayments.length,
      });
    } catch (error) {
      server.log.error({ error }, 'Failed to fetch payments');
      return reply.status(500).send({ error: 'Failed to fetch payments' });
    }
  });
}


