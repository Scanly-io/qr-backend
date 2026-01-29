import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { agencies, agencyMembers, users } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * PIVOT 1: White-Label Agency Platform Routes
 * 
 * Endpoints for agency management, white-labeling, and team collaboration
 */
export default async function agencyRoutes(server: FastifyInstance) {
  
  /**
   * Create a new agency
   */
  server.post('/agencies', async (request, reply) => {
    const {
      name,
      website,
      plan = 'starter',
      ownerId,
    } = request.body as {
      name: string;
      website?: string;
      plan?: string;
      ownerId: string;
    };
    
    // Generate unique slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + nanoid(6);
    
    // Determine limits based on plan
    const planLimits = {
      starter: {
        maxMicrosites: 10,
        maxSeats: 5,
        maxDigitalSalesRooms: 3,
        customDomain: false,
        whiteLabel: false,
        apiAccess: false,
        dedicatedSupport: false,
      },
      professional: {
        maxMicrosites: 50,
        maxSeats: 15,
        maxDigitalSalesRooms: 20,
        customDomain: true,
        whiteLabel: true,
        apiAccess: true,
        dedicatedSupport: false,
      },
      enterprise: {
        maxMicrosites: -1, // unlimited
        maxSeats: -1,
        maxDigitalSalesRooms: -1,
        customDomain: true,
        whiteLabel: true,
        apiAccess: true,
        dedicatedSupport: true,
      },
    };
    
    const [agency] = await db.insert(agencies).values({
      name,
      slug,
      website,
      plan,
      seats: planLimits[plan as keyof typeof planLimits].maxSeats,
      seatsUsed: 1, // owner
      limits: planLimits[plan as keyof typeof planLimits],
      status: 'active',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      ownerId,
      whiteLabel: {
        logo: '',
        favicon: '',
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        hidePoweredBy: plan !== 'starter',
      },
    }).returning();
    
    // Add owner as admin member
    await db.insert(agencyMembers).values({
      agencyId: agency.id,
      userId: ownerId,
      role: 'owner',
      permissions: {
        createMicrosites: true,
        editMicrosites: true,
        deleteMicrosites: true,
        manageBilling: true,
        manageTeam: true,
        viewAnalytics: true,
      },
      status: 'active',
      joinedAt: new Date(),
    });
    
    return {
      success: true,
      data: { agency },
      message: 'Agency created successfully',
    };
  });
  
  /**
   * Get agency details
   */
  server.get('/agencies/:agencyId', async (request, reply) => {
    const { agencyId } = request.params as { agencyId: string };
    
    const agency = await db.query.agencies.findFirst({
      where: eq(agencies.id, agencyId),
    });
    
    if (!agency) {
      return reply.code(404).send({
        success: false,
        error: 'Agency not found',
      });
    }
    
    return {
      success: true,
      data: { agency },
    };
  });
  
  /**
   * Update agency white-label settings
   */
  server.patch('/agencies/:agencyId/white-label', async (request, reply) => {
    const { agencyId } = request.params as { agencyId: string };
    const whiteLabelData = request.body as any;
    
    // Check if agency has white-label access
    const agency = await db.query.agencies.findFirst({
      where: eq(agencies.id, agencyId),
    });
    
    if (!agency) {
      return reply.code(404).send({
        success: false,
        error: 'Agency not found',
      });
    }
    
    if (!agency.limits?.whiteLabel) {
      return reply.code(403).send({
        success: false,
        error: 'Upgrade to Professional plan for white-label features',
      });
    }
    
    const [updatedAgency] = await db
      .update(agencies)
      .set({
        whiteLabel: {
          ...agency.whiteLabel,
          ...whiteLabelData,
        },
        updatedAt: new Date(),
      })
      .where(eq(agencies.id, agencyId))
      .returning();
    
    return {
      success: true,
      data: { agency: updatedAgency },
      message: 'White-label settings updated',
    };
  });
  
  /**
   * Invite team member
   */
  server.post('/agencies/:agencyId/members/invite', async (request, reply) => {
    const { agencyId } = request.params as { agencyId: string };
    const { email, role = 'member' } = request.body as {
      email: string;
      role?: string;
    };
    
    const agency = await db.query.agencies.findFirst({
      where: eq(agencies.id, agencyId),
    });
    
    if (!agency) {
      return reply.code(404).send({
        success: false,
        error: 'Agency not found',
      });
    }
    
    // Check seat limit
    if (agency.seatsUsed >= agency.seats && agency.seats !== -1) {
      return reply.code(403).send({
        success: false,
        error: 'Seat limit reached. Upgrade plan to add more members.',
      });
    }
    
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    let userId = existingUser?.id;
    
    if (!existingUser) {
      // Create placeholder user (will be activated on signup)
      const [newUser] = await db.insert(users).values({
        email,
        name: '',
        passwordHash: '', // Will be set on signup
        organizationId: agencyId,
        role,
      }).returning();
      
      userId = newUser.id;
    }
    
    // Create agency member invitation
    const [member] = await db.insert(agencyMembers).values({
      agencyId,
      userId: userId!,
      role,
      permissions: {
        createMicrosites: true,
        editMicrosites: true,
        deleteMicrosites: role === 'admin',
        manageBilling: role === 'admin',
        manageTeam: role === 'admin',
        viewAnalytics: true,
      },
      status: 'invited',
    }).returning();
    
    // Increment seats used
    await db
      .update(agencies)
      .set({ seatsUsed: agency.seatsUsed + 1 })
      .where(eq(agencies.id, agencyId));
    
    // TODO: Send invitation email
    
    return {
      success: true,
      data: { member },
      message: 'Team member invited',
    };
  });
  
  /**
   * List agency members
   */
  server.get('/agencies/:agencyId/members', async (request, reply) => {
    const { agencyId } = request.params as { agencyId: string };
    
    const members = await db.query.agencyMembers.findMany({
      where: eq(agencyMembers.agencyId, agencyId),
      with: {
        user: true,
      },
    });
    
    return {
      success: true,
      data: { members },
    };
  });
  
  /**
   * Get agency pricing plans
   */
  server.get('/pricing-plans', async (request, reply) => {
    const plans = [
      {
        name: 'Starter',
        id: 'starter',
        price: 99,
        currency: 'USD',
        interval: 'month',
        features: [
          '10 microsites',
          '5 team seats',
          '3 Digital Sales Rooms',
          'Basic analytics',
          'Email support',
        ],
        limits: {
          maxMicrosites: 10,
          maxSeats: 5,
          maxDigitalSalesRooms: 3,
          customDomain: false,
          whiteLabel: false,
        },
      },
      {
        name: 'Professional',
        id: 'professional',
        price: 299,
        currency: 'USD',
        interval: 'month',
        popular: true,
        features: [
          '50 microsites',
          '15 team seats',
          '20 Digital Sales Rooms',
          'Full white-labeling',
          'Custom domain',
          'API access',
          'Advanced analytics',
          'Priority support',
        ],
        limits: {
          maxMicrosites: 50,
          maxSeats: 15,
          maxDigitalSalesRooms: 20,
          customDomain: true,
          whiteLabel: true,
        },
      },
      {
        name: 'Enterprise',
        id: 'enterprise',
        price: 999,
        currency: 'USD',
        interval: 'month',
        features: [
          'Unlimited microsites',
          'Unlimited team seats',
          'Unlimited Digital Sales Rooms',
          'Full white-labeling',
          'Custom domain',
          'API access',
          'Dedicated success manager',
          'Custom integrations',
          'SLA guarantees',
        ],
        limits: {
          maxMicrosites: -1,
          maxSeats: -1,
          maxDigitalSalesRooms: -1,
          customDomain: true,
          whiteLabel: true,
        },
      },
    ];
    
    return {
      success: true,
      data: { plans },
    };
  });
}
