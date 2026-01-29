import Stripe from 'stripe';
import { verifyJWT } from '@qr/common';
import { db } from '../db';
import { integrations } from '../schema';
import { eq, and } from 'drizzle-orm';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PLATFORM_FEE_PERCENT = 10; // 10% platform fee

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

interface CheckoutItem {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  currency: string;
  image?: string;
  metadata?: Record<string, any>;
  stripeProductId?: string;
  stripePriceId?: string;
}

interface CheckoutRequest {
  items: CheckoutItem[];
  metadata: {
    creatorId: string;
    micrositeId?: string;
    [key: string]: any;
  };
  uiMode?: 'embedded' | 'hosted';
  returnUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export default async function stripeCheckoutRoute(server: any) {
  /**
   * Create Stripe Checkout Session (Embedded or Hosted)
   * 
   * Supports:
   * - Embedded checkout (modal in your app)
   * - Hosted checkout (redirect to Stripe)
   * - Stripe Connect (payments to creator accounts)
   * - Platform fees (automatic revenue split)
   */
  server.post('/stripe/checkout/create', async (request: any, reply: any) => {
    try {
      const body = request.body as CheckoutRequest;
      
      // Log incoming request for debugging
      server.log.info({ body }, 'Received checkout request');
      
      const {
        items,
        metadata,
        uiMode = 'embedded',
        returnUrl,
        successUrl,
        cancelUrl,
      } = body;

      // Validate items
      if (!items || items.length === 0) {
        server.log.warn('Validation failed: No items provided');
        return reply.status(400).send({
          error: 'No items provided',
          message: 'At least one item is required',
        });
      }

      // Validate creator ID
      if (!metadata?.creatorId) {
        server.log.warn('Validation failed: Missing creator ID');
        return reply.status(400).send({
          error: 'Missing creator ID',
          message: 'Creator ID is required in metadata',
        });
      }

      // Calculate total
      const total = items.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );

      // Get creator's Stripe Connect account (if connected)
      let connectedAccountId: string | null = null;
      try {
        const [integration] = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.userId, metadata.creatorId),
              eq(integrations.type, 'stripe'),
              eq(integrations.isActive, true)
            )
          )
          .limit(1);

        if (integration?.config && typeof integration.config === 'object') {
          connectedAccountId = (integration.config as any).accountId || null;
        }
      } catch (error) {
        server.log.warn({ error, creatorId: metadata.creatorId }, 
          'Could not fetch Stripe Connect account');
      }

      // Create line items for Stripe
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => ({
        price_data: {
          currency: (item.currency || 'usd').toLowerCase(),
          product_data: {
            name: item.name,
            description: item.description,
            images: item.image ? [item.image] : [],
            metadata: item.metadata || {},
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      }));

      // Prepare session params
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        ui_mode: uiMode,
        line_items: lineItems,
        mode: 'payment',
        metadata: {
          ...metadata,
          creatorId: metadata.creatorId,
          micrositeId: metadata.micrositeId || '',
          total: total.toString(),
        },
      };

      // Add URLs based on UI mode
      if (uiMode === 'embedded') {
        sessionParams.return_url = returnUrl || `${FRONTEND_URL}/payment/return?session_id={CHECKOUT_SESSION_ID}`;
      } else {
        sessionParams.success_url = successUrl || `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
        sessionParams.cancel_url = cancelUrl || `${FRONTEND_URL}/payment/cancel`;
      }

      // Add Stripe Connect payment routing (if creator has connected account)
      if (connectedAccountId) {
        const platformFeeAmount = Math.round(total * (PLATFORM_FEE_PERCENT / 100) * 100);
        
        sessionParams.payment_intent_data = {
          application_fee_amount: platformFeeAmount,
          transfer_data: {
            destination: connectedAccountId,
          },
        };

        server.log.info({
          connectedAccountId,
          total,
          platformFee: platformFeeAmount / 100,
          creatorAmount: (total - (platformFeeAmount / 100)),
        }, 'Creating checkout with Stripe Connect routing');
      } else {
        server.log.info({
          creatorId: metadata.creatorId,
          total,
        }, 'Creating checkout without Stripe Connect (creator not connected)');
      }

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create(sessionParams);

      server.log.info({
        sessionId: session.id,
        total,
        itemCount: items.length,
        uiMode,
        hasConnectedAccount: !!connectedAccountId,
      }, 'Checkout session created');

      // Return based on UI mode
      if (uiMode === 'embedded') {
        return reply.send({
          clientSecret: session.client_secret,
          sessionId: session.id,
        });
      } else {
        return reply.send({
          sessionId: session.id,
          url: session.url,
        });
      }

    } catch (error: any) {
      server.log.error({ error }, 'Failed to create checkout session');
      
      return reply.status(500).send({
        error: 'Checkout creation failed',
        message: error.message || 'An error occurred while creating checkout session',
      });
    }
  });

  /**
   * Retrieve Checkout Session Status
   * 
   * Used after payment completion to verify status
   */
  server.get('/stripe/checkout/session/:sessionId', async (request: any, reply: any) => {
    try {
      const { sessionId } = request.params;

      if (!sessionId) {
        return reply.status(400).send({
          error: 'Missing session ID',
        });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      return reply.send({
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email,
        amount_total: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        metadata: session.metadata,
      });

    } catch (error: any) {
      server.log.error({ error }, 'Failed to retrieve session');
      
      return reply.status(500).send({
        error: 'Session retrieval failed',
        message: error.message,
      });
    }
  });

  /**
   * List Products (for creator's Stripe account)
   * 
   * Allows creators to sync products from their Stripe account
   */
  server.get('/stripe/products', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Get creator's connected account
      const [integration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, userId),
            eq(integrations.type, 'stripe'),
            eq(integrations.isActive, true)
          )
        )
        .limit(1);

      if (!integration?.config || typeof integration.config !== 'object') {
        return reply.status(404).send({
          error: 'Stripe not connected',
          message: 'Please connect your Stripe account first',
        });
      }

      const connectedAccountId = (integration.config as any).accountId;

      // List products from connected account
      const products = await stripe.products.list(
        { limit: 100, active: true },
        { stripeAccount: connectedAccountId }
      );

      return reply.send({
        products: products.data.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          images: product.images,
          active: product.active,
          metadata: product.metadata,
        })),
      });

    } catch (error: any) {
      server.log.error({ error }, 'Failed to list products');
      
      return reply.status(500).send({
        error: 'Product listing failed',
        message: error.message,
      });
    }
  });

  /**
   * List Prices (for creator's Stripe account)
   * 
   * Get pricing information for products
   */
  server.get('/stripe/prices', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { productId } = request.query as { productId?: string };

      // Get creator's connected account
      const [integration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, userId),
            eq(integrations.type, 'stripe'),
            eq(integrations.isActive, true)
          )
        )
        .limit(1);

      if (!integration?.config || typeof integration.config !== 'object') {
        return reply.status(404).send({
          error: 'Stripe not connected',
          message: 'Please connect your Stripe account first',
        });
      }

      const connectedAccountId = (integration.config as any).accountId;

      // List prices
      const params: any = { limit: 100, active: true };
      if (productId) {
        params.product = productId;
      }

      const prices = await stripe.prices.list(
        params,
        { stripeAccount: connectedAccountId }
      );

      return reply.send({
        prices: prices.data.map((price: any) => ({
          id: price.id,
          productId: price.product,
          currency: price.currency,
          unitAmount: price.unit_amount ? price.unit_amount / 100 : 0,
          recurring: price.recurring,
          active: price.active,
        })),
      });

    } catch (error: any) {
      server.log.error({ error }, 'Failed to list prices');
      
      return reply.status(500).send({
        error: 'Price listing failed',
        message: error.message,
      });
    }
  });
}
