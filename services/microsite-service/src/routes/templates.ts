import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { microsites } from '../schema.js';
import { eq } from 'drizzle-orm';
import { digitalSalesRoomTemplates, populateTemplate } from '../templates/sales-room-templates.js';
import { highTicketEcommerceTemplates, generateFAQSchema } from '../templates/ecommerce-templates.js';

/**
 * PIVOT 1 & 2: Template Routes
 * 
 * Endpoints for Digital Sales Room and E-commerce templates
 */
export default async function templateRoutes(server: FastifyInstance) {
  
  /**
   * List all Digital Sales Room templates
   */
  server.get('/sales-rooms', async (request, reply) => {
    return {
      success: true,
      data: {
        templates: digitalSalesRoomTemplates.map(t => ({
          name: t.name,
          description: t.description,
          category: t.category,
          thumbnail: t.thumbnail,
        })),
      },
    };
  });
  
  /**
   * Get specific Digital Sales Room template
   */
  server.get('/sales-rooms/:templateName', async (request, reply) => {
    const { templateName } = request.params as { templateName: string };
    
    const template = digitalSalesRoomTemplates.find(
      t => t.name.toLowerCase().replace(/\s+/g, '-') === templateName
    );
    
    if (!template) {
      return reply.code(404).send({
        success: false,
        error: 'Template not found',
      });
    }
    
    return {
      success: true,
      data: { template },
    };
  });
  
  /**
   * Create microsite from Digital Sales Room template
   */
  server.post('/sales-rooms/:templateName/create', async (request, reply) => {
    const { templateName } = request.params as { templateName: string };
    const { variables, micrositeData } = request.body as {
      variables: Record<string, string>;
      micrositeData: any;
    };
    
    const template = digitalSalesRoomTemplates.find(
      t => t.name.toLowerCase().replace(/\s+/g, '-') === templateName
    );
    
    if (!template) {
      return reply.code(404).send({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Populate template with variables
    const populatedTemplate = populateTemplate(template, variables);
    
    // Create microsite
    const [microsite] = await db.insert(microsites).values({
      title: variables.prospect_name || 'Digital Sales Room',
      description: template.description,
      type: 'digital-sales-room',
      layout: populatedTemplate.layout,
      salesRoomConfig: {
        prospectName: variables.prospect_name,
        prospectEmail: variables.prospect_email,
        dealValue: parseFloat(variables.deal_value || '0'),
        proposalUrl: variables.proposal_pdf_url,
        videoUrls: [variables.video_url],
        passwordProtected: true,
        trackingEnabled: true,
      },
      ...micrositeData,
    }).returning();
    
    return {
      success: true,
      data: { microsite },
      message: 'Digital Sales Room created',
    };
  });
  
  /**
   * List all E-commerce templates
   */
  server.get('/ecommerce', async (request, reply) => {
    const { niche } = request.query as { niche?: string };
    
    let templates = highTicketEcommerceTemplates;
    
    if (niche) {
      templates = templates.filter(t => t.niche === niche);
    }
    
    return {
      success: true,
      data: {
        templates: templates.map(t => ({
          name: t.name,
          description: t.description,
          niche: t.niche,
          thumbnail: t.thumbnail,
          suggestedPriceRange: t.suggestedPriceRange,
        })),
      },
    };
  });
  
  /**
   * Get specific E-commerce template
   */
  server.get('/ecommerce/:templateName', async (request, reply) => {
    const { templateName } = request.params as { templateName: string };
    
    const template = highTicketEcommerceTemplates.find(
      t => t.name.toLowerCase().replace(/\s+/g, '-') === templateName
    );
    
    if (!template) {
      return reply.code(404).send({
        success: false,
        error: 'Template not found',
      });
    }
    
    return {
      success: true,
      data: { template },
    };
  });
  
  /**
   * Create microsite from E-commerce template with AEO
   */
  server.post('/ecommerce/:templateName/create', async (request, reply) => {
    const { templateName } = request.params as { templateName: string };
    const { productData, locationData, micrositeData } = request.body as {
      productData: any;
      locationData: any;
      micrositeData: any;
    };
    
    const template = highTicketEcommerceTemplates.find(
      t => t.name.toLowerCase().replace(/\s+/g, '-') === templateName
    );
    
    if (!template) {
      return reply.code(404).send({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Generate AEO structured data
    const structuredData = populateTemplate(template.aeoConfig.structuredDataTemplate, {
      ...productData,
      ...locationData,
    });
    
    // Generate FAQ schema
    const faqSchema = generateFAQSchema(
      template.aeoConfig.faqQuestions.map(q => 
        q.replace(/{{city}}/g, locationData.city || '')
         .replace(/{{province}}/g, locationData.province || '')
      ),
      [] // Answers would come from productData
    );
    
    // Create microsite
    const [microsite] = await db.insert(microsites).values({
      title: productData.product_name,
      description: productData.product_description,
      type: 'single-product-funnel',
      layout: template.layout,
      ecommerceConfig: {
        productName: productData.product_name,
        productPrice: productData.product_price,
        currency: template.suggestedPriceRange.currency,
        productImages: productData.images || [],
        nicheCategory: template.niche,
        aeoOptimized: true,
      },
      seoConfig: {
        metaTitle: `${productData.product_name} - ${locationData.city}`,
        metaDescription: productData.product_description,
        structuredData: [structuredData, faqSchema],
        speakableContent: template.aeoConfig.speakableSelectors,
      },
      ...micrositeData,
    }).returning();
    
    return {
      success: true,
      data: { microsite },
      message: 'High-ticket e-commerce funnel created with AEO',
    };
  });
  
  /**
   * Get template niches
   */
  server.get('/niches', async (request, reply) => {
    const niches = [
      {
        name: 'solar',
        displayName: 'Solar Panel Installation',
        avgTicketSize: 25000,
        conversionRate: 0.8,
        marketSize: 'Growing 15% annually',
      },
      {
        name: 'jewelry',
        displayName: 'Custom High-End Jewelry',
        avgTicketSize: 5000,
        conversionRate: 1.2,
        marketSize: '$80B globally',
      },
      {
        name: 'furniture',
        displayName: 'Custom Furniture',
        avgTicketSize: 4500,
        conversionRate: 1.5,
        marketSize: 'Steady growth',
      },
      {
        name: 'home-upgrade',
        displayName: 'Home Energy Upgrades',
        avgTicketSize: 15000,
        conversionRate: 1.0,
        marketSize: 'Government incentives',
      },
    ];
    
    return {
      success: true,
      data: { niches },
    };
  });
}
