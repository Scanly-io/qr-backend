import axios from 'axios';
import { db } from '../db';
import { webhooks, webhookLogs } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function triggerWebhooks(event: string, data: any) {
  // Find all active webhooks that listen to this event
  const activeWebhooks = await db.select()
    .from(webhooks)
    .where(and(
      eq(webhooks.isActive, true)
    ));

  for (const webhook of activeWebhooks) {
    const triggers = webhook.triggers as string[];
    
    // Check if this webhook listens to this event
    if (!triggers || !triggers.includes(event)) {
      continue;
    }

    // Execute webhook
    await executeWebhook(webhook, event, data);
  }
}

async function executeWebhook(webhook: any, event: string, data: any) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const startTime = Date.now();

  try {
    const response = await axios({
      method: webhook.method,
      url: webhook.url,
      headers: webhook.headers || {},
      data: payload,
      timeout: 30000, // 30 seconds
    });

    const duration = Date.now() - startTime;

    // Log success
    await db.insert(webhookLogs).values({
      webhookId: webhook.id,
      triggerEvent: event,
      requestUrl: webhook.url,
      requestMethod: webhook.method,
      requestHeaders: webhook.headers,
      requestBody: payload as any,
      responseStatus: response.status,
      responseHeaders: response.headers as any,
      responseBody: JSON.stringify(response.data).substring(0, 10000), // Truncate large responses
      success: true,
      duration,
    });

    // Update last triggered time
    await db.update(webhooks)
      .set({ lastTriggeredAt: new Date() })
      .where(eq(webhooks.id, webhook.id));

  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Log failure
    await db.insert(webhookLogs).values({
      webhookId: webhook.id,
      triggerEvent: event,
      requestUrl: webhook.url,
      requestMethod: webhook.method,
      requestHeaders: webhook.headers,
      requestBody: payload as any,
      responseStatus: error.response?.status || 0,
      success: false,
      error: error.message,
      duration,
    });

    // Schedule retry if enabled
    if (webhook.retryEnabled) {
      await scheduleRetry(webhook, event, data, 1);
    }
  }
}

async function scheduleRetry(webhook: any, event: string, data: any, attempt: number) {
  if (attempt > webhook.maxRetries) {
    return; // Max retries reached
  }

  // Exponential backoff: 2^attempt * retryDelay
  const delay = Math.pow(2, attempt) * webhook.retryDelay * 1000;
  
  setTimeout(async () => {
    await executeWebhook(webhook, event, data);
  }, delay);
}
