import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  trainQRPerformanceModel,
  trainConversionForecastModel,
  trainChurnPredictionModel,
  trainOptimalTimeModel,
  makePrediction,
  getModels,
  getModelById,
  getModelPredictions,
  getOptimalTimes,
} from '../lib/predictive-analytics.js';

const TrainModelSchema = z.object({
  organizationId: z.string().uuid(),
  modelType: z.enum(['qr_performance', 'conversion_forecast', 'churn_prediction', 'optimal_time']),
});

const PredictionSchema = z.object({
  organizationId: z.string().uuid(),
  modelId: z.string().uuid(),
  features: z.record(z.any()),
});

export default async function predictiveAnalyticsRoutes(fastify: FastifyInstance) {
  /**
   * Train a new ML model
   * POST /api/ml/models/train
   */
  fastify.post('/models/train', async (request, reply) => {
    const { organizationId, modelType } = TrainModelSchema.parse(request.body);
    
    let modelId: string;
    
    try {
      switch (modelType) {
        case 'qr_performance':
          modelId = await trainQRPerformanceModel(organizationId);
          break;
        case 'conversion_forecast':
          modelId = await trainConversionForecastModel(organizationId);
          break;
        case 'churn_prediction':
          modelId = await trainChurnPredictionModel(organizationId);
          break;
        case 'optimal_time':
          modelId = await trainOptimalTimeModel(organizationId);
          break;
        default:
          return reply.code(400).send({
            success: false,
            error: `Unknown model type: ${modelType}`,
          });
      }
      
      return {
        success: true,
        data: { modelId },
        message: `${modelType} model trained successfully`,
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to train model',
      });
    }
  });
  
  /**
   * Get all models for an organization
   * GET /api/ml/models
   */
  fastify.get('/models', async (request, reply) => {
    const { organizationId } = request.query as { organizationId: string };
    
    if (!organizationId) {
      return reply.code(400).send({
        success: false,
        error: 'organizationId is required',
      });
    }
    
    const models = await getModels(organizationId);
    
    return {
      success: true,
      data: models,
      count: models.length,
    };
  });
  
  /**
   * Get model by ID
   * GET /api/ml/models/:modelId
   */
  fastify.get('/models/:modelId', async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    
    try {
      const model = await getModelById(modelId);
      
      return {
        success: true,
        data: model,
      };
    } catch (error) {
      return reply.code(404).send({
        success: false,
        error: error instanceof Error ? error.message : 'Model not found',
      });
    }
  });
  
  /**
   * Make a prediction
   * POST /api/ml/predict
   */
  fastify.post('/predict', async (request, reply) => {
    const input = PredictionSchema.parse(request.body);
    
    try {
      const prediction = await makePrediction(input.organizationId, input.modelId, input.features);
      
      return {
        success: true,
        data: prediction,
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to make prediction',
      });
    }
  });
  
  /**
   * Get predictions for a model
   * GET /api/ml/models/:modelId/predictions
   */
  fastify.get('/models/:modelId/predictions', async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    const { limit } = request.query as { limit?: number };
    
    try {
      const predictions = await getModelPredictions(modelId, limit);
      
      return {
        success: true,
        data: predictions,
        count: predictions.length,
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get predictions',
      });
    }
  });
  
  /**
   * Batch predict for QR performance (convenience endpoint)
   * POST /api/ml/batch-predict/qr-performance
   */
  fastify.post('/batch-predict/qr-performance', async (request, reply) => {
    const { organizationId, scenarios } = request.body as {
      organizationId: string;
      scenarios: Array<{ hour: number; dayOfWeek: number }>;
    };
    
    if (!organizationId || !scenarios || !Array.isArray(scenarios)) {
      return reply.code(400).send({
        success: false,
        error: 'organizationId and scenarios array are required',
      });
    }
    
    try {
      // Get latest model
      const models = await getModels(organizationId);
      const qrModel = models.find(m => m.type === 'qr_performance' && m.status === 'active');
      
      if (!qrModel) {
        return reply.code(404).send({
          success: false,
          error: 'No active QR performance model found. Please train a model first.',
        });
      }
      
      // Make predictions for all scenarios
      const predictions = await Promise.all(
        scenarios.map(scenario =>
          makePrediction(
            organizationId,
            qrModel.id,
            {
              hour: scenario.hour,
              dayOfWeek: scenario.dayOfWeek,
              hour_sin: Math.sin((2 * Math.PI * scenario.hour) / 24),
              hour_cos: Math.cos((2 * Math.PI * scenario.hour) / 24),
            },
          )
        )
      );
      
      return {
        success: true,
        data: predictions,
        modelId: qrModel.id,
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to make batch predictions',
      });
    }
  });
  
  /**
   * Get optimal posting times (convenience endpoint)
   * GET /api/ml/optimal-times
   */
  fastify.get('/optimal-times', async (request, reply) => {
    const { organizationId } = request.query as { organizationId: string };
    
    if (!organizationId) {
      return reply.code(400).send({
        success: false,
        error: 'organizationId is required',
      });
    }
    
    try {
      // Get latest optimal time model
      const models = await getModels(organizationId);
      const timeModel = models.find(m => m.type === 'optimal_time' && m.status === 'active');
      
      if (!timeModel) {
        return reply.code(404).send({
          success: false,
          error: 'No active optimal time model found. Please train a model first.',
        });
      }
      
      // Test all hours and days
      const scenarios: any[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          scenarios.push({ hour, dayOfWeek: day });
        }
      }
      
      // Make predictions
      const predictions = await Promise.all(
        scenarios.map(scenario =>
          makePrediction(
            organizationId,
            timeModel.id,
            scenario,
          )
        )
      );
      
      // Find top 10 optimal times
      const sortedPredictions = predictions
        .map((p, i) => ({
          ...scenarios[i],
          score: Array.isArray(p.prediction) ? p.prediction[0] : p.prediction,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      const optimalTimes = sortedPredictions.map(item => ({
        day: dayNames[item.dayOfWeek],
        dayOfWeek: item.dayOfWeek,
        hour: item.hour,
        time: `${item.hour.toString().padStart(2, '0')}:00`,
        score: item.score,
        formattedTime: `${dayNames[item.dayOfWeek]} at ${item.hour % 12 || 12}:00 ${item.hour < 12 ? 'AM' : 'PM'}`,
      }));
      
      return {
        success: true,
        data: {
          optimalTimes,
          modelId: timeModel.id,
          recommendation: optimalTimes[0],
        },
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get optimal times',
      });
    }
  });
  
  /**
   * Get pre-computed optimal times from model artifact
   * GET /api/ml/best-times
   */
  fastify.get('/best-times', async (request, reply) => {
    const { organizationId } = request.query as { organizationId: string };
    
    if (!organizationId) {
      return reply.code(400).send({
        success: false,
        error: 'organizationId is required',
      });
    }
    
    try {
      const result = await getOptimalTimes(organizationId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return reply.code(404).send({
        success: false,
        error: error instanceof Error ? error.message : 'No optimal time model found',
      });
    }
  });
}
