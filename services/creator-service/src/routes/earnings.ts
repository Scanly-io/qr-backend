import { FastifyInstance } from "fastify";
import { verifyJWT } from "@qr/common";
import { db } from "../db.js";
import { earnings, orders, products } from "../schema.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export default async function earningsRoutes(app: FastifyInstance) {

  // Get earnings overview
  app.get("/", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    const { startDate, endDate, source } = req.query as any;

    const conditions = [eq(earnings.userId, user.id)];

    if (startDate) {
      conditions.push(gte(earnings.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(earnings.createdAt, new Date(endDate)));
    }
    if (source) {
      conditions.push(eq(earnings.source, source));
    }

    const userEarnings = await db.select()
      .from(earnings)
      .where(and(...conditions))
      .orderBy(desc(earnings.createdAt));

    // Calculate totals
    const totalRevenue = userEarnings.reduce(
      (sum, e) => sum + parseFloat(e.amount),
      0
    );

    const totalFees = userEarnings.reduce(
      (sum, e) => sum + parseFloat(e.platformFee || '0'),
      0
    );

    const netEarnings = totalRevenue - totalFees;

    // Pending payouts
    const pendingAmount = userEarnings
      .filter(e => e.payoutStatus === 'pending')
      .reduce((sum, e) => sum + parseFloat(e.amount) - parseFloat(e.platformFee || '0'), 0);

    // Paid out amount
    const paidOutAmount = userEarnings
      .filter(e => e.payoutStatus === 'paid')
      .reduce((sum, e) => sum + parseFloat(e.amount) - parseFloat(e.platformFee || '0'), 0);

    // Group by source
    const bySource: Record<string, number> = {};
    userEarnings.forEach(e => {
      if (!bySource[e.source]) {
        bySource[e.source] = 0;
      }
      bySource[e.source] += parseFloat(e.amount);
    });

    return {
      success: true,
      summary: {
        totalRevenue,
        totalFees,
        netEarnings,
        pendingAmount,
        paidOutAmount,
        currency: 'USD'
      },
      bySource,
      earnings: userEarnings
    };
  });

  // Get earnings by time period (for charts)
  app.get("/chart", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    const { period = 'week', startDate, endDate } = req.query as any;

    const conditions = [eq(earnings.userId, user.id)];

    if (startDate) {
      conditions.push(gte(earnings.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(earnings.createdAt, new Date(endDate)));
    }

    const userEarnings = await db.select()
      .from(earnings)
      .where(and(...conditions))
      .orderBy(earnings.createdAt);

    // Group by day/week/month
    const chartData: any[] = [];
    const groupedByDate: Record<string, number> = {};

    userEarnings.forEach(earning => {
      if (!earning.earnedAt) return;
      
      const date = new Date(earning.earnedAt);
      let key = '';

      if (period === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (period === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedByDate[key]) {
        groupedByDate[key] = 0;
      }
      groupedByDate[key] += parseFloat(earning.amount) - parseFloat(earning.platformFee || '0');
    });

    Object.entries(groupedByDate).forEach(([date, amount]) => {
      chartData.push({ date, amount });
    });

    return {
      success: true,
      chartData: chartData.sort((a, b) => a.date.localeCompare(b.date))
    };
  });

  // Get top selling products by revenue
  app.get("/top-products", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    const { limit = 10 } = req.query as any;

    const productEarnings = await db.select({
      productId: earnings.sourceId,
      productName: products.name,
      productType: products.productType,
      totalRevenue: sql<number>`SUM(CAST(${earnings.amount} AS DECIMAL))`,
      totalSales: sql<number>`COUNT(*)`,
      netEarnings: sql<number>`SUM(CAST(${earnings.amount} AS DECIMAL) - CAST(${earnings.platformFee} AS DECIMAL))`
    })
      .from(earnings)
      .leftJoin(products, eq(earnings.sourceId, products.id))
      .where(and(
        eq(earnings.userId, user.id),
        eq(earnings.source, 'product_sale')
      ))
      .groupBy(earnings.sourceId, products.name, products.productType)
      .orderBy(desc(sql`SUM(CAST(${earnings.amount} AS DECIMAL))`))
      .limit(parseInt(limit));

    return {
      success: true,
      topProducts: productEarnings
    };
  });

  // Request payout
  app.post("/payout", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { amount, payoutMethod = 'stripe' } = req.body;

    if (!amount || amount <= 0) {
      return res.code(400).send({ error: "Valid amount required" });
    }

    // Check available balance
    const pendingEarnings = await db.select()
      .from(earnings)
      .where(and(
        eq(earnings.userId, user.id),
        eq(earnings.payoutStatus, 'pending')
      ));

    const availableBalance = pendingEarnings.reduce(
      (sum, e) => sum + parseFloat(e.amount) - parseFloat(e.platformFee || '0'),
      0
    );

    if (amount > availableBalance) {
      return res.code(400).send({ 
        error: "Insufficient balance",
        availableBalance 
      });
    }

    // In production, integrate with Stripe Connect or PayPal
    // For now, mark earnings as processing
    const payoutDate = new Date();
    payoutDate.setDate(payoutDate.getDate() + 7); // Estimate 7 days

    // This would normally create a payout record
    // For now, we'll just return success
    return {
      success: true,
      payout: {
        amount,
        method: payoutMethod,
        status: 'processing',
        estimatedDate: payoutDate,
        availableBalance: availableBalance - amount
      }
    };
  });

  // Get payout history
  app.get("/payouts", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;

    // In production, fetch from payouts table
    // For now, return earnings grouped by payout status
    const allEarnings = await db.select()
      .from(earnings)
      .where(eq(earnings.userId, user.id))
      .orderBy(desc(earnings.paidOutAt));

    const payoutHistory = allEarnings
      .filter(e => e.payoutStatus === 'paid')
      .reduce((acc: any[], earning) => {
        const payoutDate = earning.paidOutAt?.toISOString().split('T')[0];
        const existing = acc.find(p => p.date === payoutDate);
        
        if (existing) {
          existing.amount += parseFloat(earning.amount) - parseFloat(earning.platformFee || '0');
          existing.count += 1;
        } else {
          acc.push({
            date: payoutDate,
            amount: parseFloat(earning.amount) - parseFloat(earning.platformFee || '0'),
            count: 1,
            status: 'paid'
          });
        }
        
        return acc;
      }, []);

    return {
      success: true,
      payouts: payoutHistory
    };
  });

  // Export earnings (CSV format)
  app.get("/export", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { startDate, endDate, format = 'csv' } = req.query as any;

    const conditions = [eq(earnings.userId, user.id)];

    if (startDate) {
      conditions.push(gte(earnings.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(earnings.createdAt, new Date(endDate)));
    }

    const userEarnings = await db.select()
      .from(earnings)
      .where(and(...conditions))
      .orderBy(earnings.createdAt);

    if (format === 'csv') {
      const csvHeader = 'Date,Source,Source ID,Amount,Platform Fee,Net,Currency,Status,Payout Date\n';
      const csvRows = userEarnings.map(e => {
        const netAmount = parseFloat(e.amount) - parseFloat(e.platformFee || '0');
        return [
          e.earnedAt?.toISOString().split('T')[0] || '',
          e.source,
          e.sourceId || '',
          e.amount,
          e.platformFee || '0',
          netAmount.toFixed(2),
          e.currency,
          e.payoutStatus,
          e.paidOutAt?.toISOString().split('T')[0] || ''
        ].join(',');
      }).join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="earnings-${Date.now()}.csv"`);
      return csvHeader + csvRows;
    }

    // JSON export
    return {
      success: true,
      earnings: userEarnings
    };
  });
}
