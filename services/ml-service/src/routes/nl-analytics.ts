import { FastifyInstance } from 'fastify';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalyticsData {
  views?: number;
  clicks?: number;
  conversions?: number;
  bounceRate?: number;
  avgTimeOnPage?: number;
  topSources?: Array<{ name: string; value: number }>;
  deviceBreakdown?: { mobile: number; desktop: number; tablet: number };
  locationData?: Array<{ country: string; visits: number }>;
  timeSeriesData?: Array<{ date: string; views: number; clicks: number }>;
}

export async function nlAnalyticsRoutes(fastify: FastifyInstance) {
  // Explain analytics insights in plain English
  fastify.post('/explain', async (request, reply) => {
    const { data, period, previousData } = request.body as {
      data: AnalyticsData;
      period?: string;
      previousData?: AnalyticsData;
    };

    const periodText = period || 'this period';

    // Build context about the data
    let context = `Analytics for ${periodText}:\n`;
    if (data.views) context += `- ${data.views} total views\n`;
    if (data.clicks) context += `- ${data.clicks} total clicks\n`;
    if (data.conversions) context += `- ${data.conversions} conversions\n`;
    if (data.bounceRate) context += `- ${data.bounceRate}% bounce rate\n`;
    if (data.avgTimeOnPage) context += `- ${data.avgTimeOnPage}s average time on page\n`;

    if (data.deviceBreakdown) {
      context += `- Device breakdown: ${data.deviceBreakdown.mobile}% mobile, ${data.deviceBreakdown.desktop}% desktop, ${data.deviceBreakdown.tablet}% tablet\n`;
    }

    if (data.topSources && data.topSources.length > 0) {
      context += `- Top traffic sources: ${data.topSources.map((s) => `${s.name} (${s.value})`).join(', ')}\n`;
    }

    // Add comparison if previous data available
    if (previousData) {
      context += `\nComparison to previous period:\n`;
      if (data.views && previousData.views) {
        const change = ((data.views - previousData.views) / previousData.views) * 100;
        context += `- Views changed by ${change > 0 ? '+' : ''}${change.toFixed(1)}%\n`;
      }
      if (data.clicks && previousData.clicks) {
        const change = ((data.clicks - previousData.clicks) / previousData.clicks) * 100;
        context += `- Clicks changed by ${change > 0 ? '+' : ''}${change.toFixed(1)}%\n`;
      }
      if (data.bounceRate && previousData.bounceRate) {
        const change = data.bounceRate - previousData.bounceRate;
        context += `- Bounce rate changed by ${change > 0 ? '+' : ''}${change.toFixed(1)} percentage points\n`;
      }
    }

    const prompt = `Analyze this analytics data and provide a clear, human-readable explanation. Focus on the most important insights and actionable recommendations. Be specific about what's working and what needs improvement.\n\n${context}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a digital analytics expert who explains data insights in clear, simple language. Focus on actionable insights and avoid jargon. Be specific and highlight both positive trends and areas for improvement.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 300,
      });

      const explanation = completion.choices[0]?.message?.content?.trim() || '';

      return {
        explanation,
        keyInsights: extractKeyInsights(data, previousData),
        usage: {
          tokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate explanation', message: error.message });
    }
  });

  // Generate specific recommendations based on analytics
  fastify.post('/recommend', async (request, reply) => {
    const { data, goal } = request.body as {
      data: AnalyticsData;
      goal?: 'increase-conversions' | 'reduce-bounce' | 'increase-engagement' | 'general';
    };

    let goalContext = '';
    switch (goal) {
      case 'increase-conversions':
        goalContext = 'Focus on recommendations to increase conversion rate.';
        break;
      case 'reduce-bounce':
        goalContext = 'Focus on recommendations to reduce bounce rate.';
        break;
      case 'increase-engagement':
        goalContext = 'Focus on recommendations to increase time on page and engagement.';
        break;
      default:
        goalContext = 'Provide general optimization recommendations.';
    }

    let context = `Current analytics:\n`;
    if (data.bounceRate) context += `- Bounce rate: ${data.bounceRate}%\n`;
    if (data.avgTimeOnPage) context += `- Avg time on page: ${data.avgTimeOnPage}s\n`;
    if (data.clicks && data.views) {
      const ctr = ((data.clicks / data.views) * 100).toFixed(2);
      context += `- Click-through rate: ${ctr}%\n`;
    }
    if (data.conversions && data.clicks) {
      const convRate = ((data.conversions / data.clicks) * 100).toFixed(2);
      context += `- Conversion rate: ${convRate}%\n`;
    }
    if (data.deviceBreakdown) {
      context += `- ${data.deviceBreakdown.mobile}% mobile traffic\n`;
    }

    const prompt = `${goalContext}\n\n${context}\n\nProvide 3-5 specific, actionable recommendations to improve performance. Each recommendation should be clear and implementable.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a conversion optimization expert. Provide specific, actionable recommendations based on analytics data. Be practical and focus on high-impact changes.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const recommendationsText = completion.choices[0]?.message?.content || '';
      const recommendations = recommendationsText
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((rec) => rec.replace(/^\d+\.\s*/, '').trim());

      return {
        recommendations,
        usage: {
          tokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate recommendations', message: error.message });
    }
  });

  // Anomaly detection and explanation
  fastify.post('/detect-anomalies', async (request, reply) => {
    const { timeSeriesData } = request.body as {
      timeSeriesData: Array<{ date: string; views: number; clicks: number }>;
    };

    if (!timeSeriesData || timeSeriesData.length < 7) {
      return reply.status(400).send({ error: 'Need at least 7 days of data for anomaly detection' });
    }

    // Calculate basic statistics
    const views = timeSeriesData.map((d) => d.views);
    const avgViews = views.reduce((a, b) => a + b, 0) / views.length;
    const stdDev = Math.sqrt(views.map((v) => Math.pow(v - avgViews, 2)).reduce((a, b) => a + b, 0) / views.length);

    const anomalies: Array<{ date: string; type: 'spike' | 'drop'; metric: string; value: number; expected: number }> = [];

    timeSeriesData.forEach((day) => {
      // Check for view anomalies (> 2 standard deviations)
      if (day.views > avgViews + 2 * stdDev) {
        anomalies.push({
          date: day.date,
          type: 'spike',
          metric: 'views',
          value: day.views,
          expected: Math.round(avgViews),
        });
      } else if (day.views < avgViews - 2 * stdDev && avgViews > 10) {
        anomalies.push({
          date: day.date,
          type: 'drop',
          metric: 'views',
          value: day.views,
          expected: Math.round(avgViews),
        });
      }
    });

    // Generate explanations for anomalies
    if (anomalies.length > 0) {
      const anomalyContext = anomalies
        .map((a) => `${a.date}: ${a.type} in ${a.metric} (${a.value} vs expected ${a.expected})`)
        .join('\n');

      const prompt = `Analyze these traffic anomalies and suggest possible explanations:\n\n${anomalyContext}\n\nProvide brief, plausible explanations for each anomaly.`;

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a data analyst explaining traffic anomalies. Suggest realistic reasons for spikes or drops.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.6,
          max_tokens: 250,
        });

        const explanation = completion.choices[0]?.message?.content?.trim() || '';

        return {
          anomalies,
          count: anomalies.length,
          explanation,
          usage: {
            tokens: completion.usage?.total_tokens || 0,
          },
        };
      } catch (error: any) {
        fastify.log.error(error);
        return {
          anomalies,
          count: anomalies.length,
          explanation: 'Unable to generate explanation at this time.',
        };
      }
    }

    return {
      anomalies: [],
      count: 0,
      explanation: 'No significant anomalies detected in the data.',
    };
  });

  // Compare performance against benchmarks
  fastify.post('/benchmark-comparison', async (request, reply) => {
    const { data, industry } = request.body as {
      data: AnalyticsData;
      industry?: string;
    };

    // Industry benchmarks (approximate)
    const benchmarks: Record<string, { bounceRate: number; avgTimeOnPage: number; conversionRate: number }> = {
      ecommerce: { bounceRate: 47, avgTimeOnPage: 90, conversionRate: 2.5 },
      'personal-brand': { bounceRate: 55, avgTimeOnPage: 60, conversionRate: 1.5 },
      saas: { bounceRate: 60, avgTimeOnPage: 120, conversionRate: 3.0 },
      general: { bounceRate: 50, avgTimeOnPage: 80, conversionRate: 2.0 },
    };

    const benchmark = benchmarks[industry || 'general'] || benchmarks.general;

    const comparison: Array<{ metric: string; value: number; benchmark: number; performance: 'above' | 'below' | 'at' }> = [];

    if (data.bounceRate !== undefined) {
      comparison.push({
        metric: 'Bounce Rate',
        value: data.bounceRate,
        benchmark: benchmark.bounceRate,
        performance: data.bounceRate < benchmark.bounceRate ? 'above' : data.bounceRate > benchmark.bounceRate ? 'below' : 'at',
      });
    }

    if (data.avgTimeOnPage !== undefined) {
      comparison.push({
        metric: 'Avg Time on Page',
        value: data.avgTimeOnPage,
        benchmark: benchmark.avgTimeOnPage,
        performance:
          data.avgTimeOnPage > benchmark.avgTimeOnPage ? 'above' : data.avgTimeOnPage < benchmark.avgTimeOnPage ? 'below' : 'at',
      });
    }

    if (data.conversions && data.clicks) {
      const convRate = (data.conversions / data.clicks) * 100;
      comparison.push({
        metric: 'Conversion Rate',
        value: parseFloat(convRate.toFixed(2)),
        benchmark: benchmark.conversionRate,
        performance:
          convRate > benchmark.conversionRate ? 'above' : convRate < benchmark.conversionRate ? 'below' : 'at',
      });
    }

    // Generate natural language summary
    const summaryParts: string[] = [];
    comparison.forEach((c) => {
      const diff = Math.abs(c.value - c.benchmark);
      const pct = ((diff / c.benchmark) * 100).toFixed(0);
      
      if (c.performance === 'above') {
        summaryParts.push(`Your ${c.metric} is ${pct}% better than industry average`);
      } else if (c.performance === 'below') {
        summaryParts.push(`Your ${c.metric} is ${pct}% below industry average`);
      }
    });

    return {
      comparison,
      industry: industry || 'general',
      summary: summaryParts.length > 0 ? summaryParts.join('. ') + '.' : 'Performance is on par with industry benchmarks.',
    };
  });
}

// Helper function to extract key insights
function extractKeyInsights(data: AnalyticsData, previousData?: AnalyticsData): string[] {
  const insights: string[] = [];

  // Bounce rate insights
  if (data.bounceRate !== undefined) {
    if (data.bounceRate > 70) {
      insights.push('High bounce rate suggests visitors aren\'t finding what they need');
    } else if (data.bounceRate < 40) {
      insights.push('Excellent engagement - visitors are interested in your content');
    }
  }

  // Time on page insights
  if (data.avgTimeOnPage !== undefined) {
    if (data.avgTimeOnPage < 30) {
      insights.push('Low time on page - content may not be engaging enough');
    } else if (data.avgTimeOnPage > 120) {
      insights.push('Strong engagement - visitors are spending quality time on your page');
    }
  }

  // Device insights
  if (data.deviceBreakdown) {
    if (data.deviceBreakdown.mobile > 70) {
      insights.push('Majority mobile traffic - ensure mobile experience is optimized');
    }
  }

  // Trend insights
  if (previousData && data.views && previousData.views) {
    const change = ((data.views - previousData.views) / previousData.views) * 100;
    if (change > 20) {
      insights.push(`Traffic increased ${change.toFixed(0)}% - recent changes are working`);
    } else if (change < -20) {
      insights.push(`Traffic dropped ${Math.abs(change).toFixed(0)}% - investigate recent changes`);
    }
  }

  return insights;
}
