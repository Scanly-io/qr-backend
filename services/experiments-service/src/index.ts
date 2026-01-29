/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPERIMENTS SERVICE (A/B TESTING)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 PURPOSE:
 * Run scientific A/B tests to determine which version of something works better.
 * Like running experiments to see if "Buy Now" or "Add to Cart" gets more clicks.
 * 
 * 💡 WHAT IT DOES:
 * 1. Creates experiments (tests) with multiple variants (versions)
 * 2. Splits traffic between variants (e.g., 50% see Version A, 50% see Version B)
 * 3. Tracks conversions (who completed the desired action)
 * 4. Uses statistics to determine which variant wins
 * 5. Automatically declares winner when statistically significant
 * 
 * 📊 HOW IT WORKS:
 * - User creates experiment with 2+ variants
 * - When someone scans QR → system assigns them to a variant
 * - Same person always gets same variant (sticky sessions)
 * - Track when they convert (order, signup, click, etc.)
 * - After enough data → analyze with statistics → declare winner
 * 
 * 🎮 REAL EXAMPLE:
 * Restaurant wants to test menu designs:
 * - Control: Menu with big bold prices
 * - Variant A: Menu with small subtle prices
 * After 1,000 customers, system finds Variant A gets 23% more orders!
 * Winner declared automatically.
 * 
 * 🔗 INTEGRATES WITH:
 * - QR Service: Link experiments to QR codes
 * - Analytics Service: Track user behavior
 * - Kafka: Send events when experiments start/finish/win
 * 
 * 📈 KEY FEATURES:
 * ✅ A/B and multivariate testing
 * ✅ Statistical significance testing (Z-test, Chi-square)
 * ✅ Automatic winner selection
 * ✅ Traffic splitting with sticky sessions
 * ✅ Real-time conversion tracking
 * ✅ Revenue tracking per variant
 * ✅ Confidence intervals & insights generation
 * 
 * 🚀 PORT: 3013
 * 🗄️ DATABASE: experiments_db (4 tables)
 * 📡 KAFKA: 10 event topics
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { connectKafka, disconnectKafka, consumer } from './kafka';
import { handleKafkaMessages } from './lib/kafka-handler';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IMPORT ALL API ROUTES (15 Total)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Experiment Management Routes (5) ─────────────────────────────────────
import { createExperimentRoute } from './routes/create-experiment';     // POST /experiments - Create new A/B test
import { listExperimentsRoute } from './routes/list-experiments';       // GET /experiments - List all tests
import { getExperimentRoute } from './routes/get-experiment';           // GET /experiments/:id - Get details
import { updateExperimentRoute } from './routes/update-experiment';     // PATCH /experiments/:id - Update settings
import { deleteExperimentRoute } from './routes/delete-experiment';     // DELETE /experiments/:id - Delete test

// ─── Experiment Control Routes (3) ────────────────────────────────────────
import { startExperimentRoute } from './routes/start-experiment';       // POST /experiments/:id/start - Start test
import { stopExperimentRoute } from './routes/stop-experiment';         // POST /experiments/:id/stop - Stop test
import { pauseExperimentRoute } from './routes/pause-experiment';       // POST /experiments/:id/pause - Pause test

// ─── Variant Management Routes (3) ────────────────────────────────────────
import { addVariantRoute } from './routes/add-variant';                 // POST /experiments/:id/variants - Add version
import { updateVariantRoute } from './routes/update-variant';           // PATCH /variants/:id - Update version
import { deleteVariantRoute } from './routes/delete-variant';           // DELETE /variants/:id - Remove version

// ─── Testing & Analysis Routes (4) ────────────────────────────────────────
import { assignVariantRoute } from './routes/assign-variant';           // POST /experiments/:id/assign - Assign user to version
import { trackConversionRoute } from './routes/track-conversion';       // POST /experiments/:id/convert - Track success
import { getExperimentResultsRoute } from './routes/get-results';       // GET /experiments/:id/results - Get stats
import { analyzeExperimentRoute } from './routes/analyze-experiment';   // POST /experiments/:id/analyze - Determine winner

// ─── ML-Enhanced Bandit Routes (5) ────────────────────────────────────────
import { banditRoutes } from './routes/bandit';                         // ML-based variant assignment & recommendations

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVER CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 */
const PORT = parseInt(process.env.PORT || '3013');
const HOST = process.env.HOST || '0.0.0.0';

// Initialize Fastify server with pretty logging
const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  },
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * START SERVER
 * ═══════════════════════════════════════════════════════════════════════════
 */
async function start() {
  try {
    // ─── 1. Register CORS Plugin ──────────────────────────────────────────
    // Allow requests from frontend
    await server.register(cors, {
      origin: true,
      credentials: true,
    });

    // ─── 2. Health Check Endpoint ─────────────────────────────────────────
    // Used by Docker, Kubernetes, load balancers to check if service is alive
    server.get('/health', async () => {
      return { 
        status: 'healthy', 
        service: 'experiments-service', 
        timestamp: new Date().toISOString() 
      };
    });

    // ─── 3. Register All API Routes ───────────────────────────────────────
    // Each route is a separate module for clean code organization
    await server.register(createExperimentRoute);      // Create experiments
    await server.register(listExperimentsRoute);       // List experiments
    await server.register(getExperimentRoute);         // Get experiment details
    await server.register(updateExperimentRoute);      // Update experiment
    await server.register(deleteExperimentRoute);      // Delete experiment
    await server.register(startExperimentRoute);       // Start running test
    await server.register(stopExperimentRoute);        // Stop test
    await server.register(pauseExperimentRoute);       // Pause test
    await server.register(addVariantRoute);            // Add variant (version)
    await server.register(updateVariantRoute);         // Update variant
    await server.register(deleteVariantRoute);         // Delete variant
    await server.register(assignVariantRoute);         // Assign user to variant
    await server.register(trackConversionRoute);       // Track conversion
    await server.register(getExperimentResultsRoute);  // Get results
    await server.register(analyzeExperimentRoute);     // Analyze & determine winner
    await server.register(banditRoutes);               // ML-enhanced bandit algorithms

    // ─── 4. Connect to Kafka Event Bus (OPTIONAL) ────────────────────────
    // Kafka allows services to communicate via events
    // This service publishes: experiment.created, variant.assigned, winner.declared, etc.
    // This service subscribes to: qr.scanned, user.action (for automatic tracking)
    const kafkaEnabled = process.env.KAFKA_ENABLED !== 'false';
    
    if (kafkaEnabled) {
      try {
        await connectKafka();
        
        // ─── 5. Start Consuming Kafka Messages ───────────────────────────────
        // Listen for events from other services and react to them
        consumer.run({
          eachMessage: handleKafkaMessages,  // Process each incoming event
        });
        server.log.info('✅ Kafka connected successfully');
      } catch (error) {
        server.log.warn('⚠️ Kafka connection failed, continuing without event streaming');
        server.log.warn(error);
      }
    } else {
      server.log.info('ℹ️ Kafka disabled via KAFKA_ENABLED=false');
    }

    // ─── 6. Start HTTP Server ─────────────────────────────────────────────
    // Start listening for API requests
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`🚀 Experiments Service running on http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GRACEFUL SHUTDOWN HANDLERS
 * ═══════════════════════════════════════════════════════════════════════════
 * Handle SIGINT (Ctrl+C) and SIGTERM (Docker/Kubernetes stop) gracefully
 * Ensures all connections close properly before exit
 */
const kafkaEnabled = process.env.KAFKA_ENABLED !== 'false';

process.on('SIGINT', async () => {
  server.log.info('📦 Shutting down gracefully...');
  if (kafkaEnabled) {
    await disconnectKafka();   // Close Kafka connections
  }
  await server.close();       // Close HTTP server
  process.exit(0);
});

process.on('SIGTERM', async () => {
  server.log.info('📦 Shutting down gracefully...');
  if (kafkaEnabled) {
    await disconnectKafka();   // Close Kafka connections
  }
  await server.close();       // Close HTTP server
  process.exit(0);
});

// Start the server!
start();