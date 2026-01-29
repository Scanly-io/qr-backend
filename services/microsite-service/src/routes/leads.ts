/**
 * ==========================================
 * LEAD CAPTURE ROUTES - Form Submission Handler
 * ==========================================
 * 
 * This module handles lead/contact form submissions from QR code microsites.
 * When users fill out a form on a microsite, this endpoint captures their data.
 * 
 * FLOW:
 * 1. User scans QR → Views microsite (render.ts)
 * 2. User fills out contact form (name, email, phone)
 * 3. Form submits to this endpoint → POST /public/:qrId/lead
 * 4. Store lead in database (for CRM/follow-up)
 * 5. Send analytics event to Kafka (for tracking/reporting)
 * 6. Respond success to user (show thank you message)
 * 
 * WHY SEPARATE FROM ANALYTICS:
 * - Leads are actionable business data (CRM integration, sales follow-up)
 * - Analytics are passive tracking (views, clicks, device info)
 * - Leads require validation and data quality checks
 * - Analytics can tolerate some data loss, leads cannot
 * 
 * USE CASES:
 * - Restaurant: Reservation requests, catering inquiries
 * - Real Estate: Property tour scheduling, contact requests
 * - Events: Registration forms, ticket inquiries
 * - Retail: Newsletter signups, product interest forms
 */

import { db } from "../db.js";
import { leads } from "../schema.js";
import { createProducer } from "@qr/common";

/**
 * Lead Capture Routes
 * 
 * Handles form submissions from microsite pages.
 * 
 * @param {FastifyInstance} app - Fastify app instance
 */
export default async function leadRoutes(app: any) {
  // Initialize Kafka producer for analytics events
  // Lazy initialization: Only creates connection when first needed
  // Shared across all requests for performance (singleton pattern)
  const producer = await createProducer();

  /**
   * ==========================================
   * POST /public/:qrId/lead
   * ==========================================
   * 
   * Captures lead information from microsite contact forms.
   * 
   * This is a PUBLIC endpoint (no authentication required) because:
   * - Forms are filled by anonymous users who scanned QR codes
   * - QR ID in URL acts as context (which campaign/location)
   * - Email/phone provide contact information for follow-up
   * 
   * WORKFLOW EXAMPLE (Restaurant Reservation):
   * 1. Customer scans QR code at table
   * 2. Sees menu microsite with "Contact Us" button
   * 3. Fills form: name="John Doe", email="john@example.com", message="Reservation for 4 on Friday"
   * 4. Submits → This endpoint receives data
   * 5. Lead stored in database with QR ID and microsite ID context
   * 6. Restaurant staff sees new lead in admin panel
   * 7. Staff emails customer to confirm reservation details
   * 
   * SECURITY CONSIDERATIONS:
   * - Rate limiting recommended (prevent spam/abuse)
   * - Email validation (format check, disposable email detection)
   * - Phone number formatting (international format support)
   * - Honeypot fields (detect bots)
   * - reCAPTCHA (prevent automated submissions)
   * 
   * @param {string} qrId - QR code identifier (from URL path)
   * @param {string} name - User's full name
   * @param {string} email - User's email address
   * @param {string} phone - User's phone number (optional)
   * 
   * @returns {201} { success: true } on successful capture
   * @returns {400} Validation error if data is invalid
   * @returns {500} Server error if database/Kafka fails
   */
  app.post("/public/:qrId/lead", async (req: any, reply: any) => {
    // Extract QR ID from URL path
    // Example: POST /public/restaurant-menu-qr/lead → qrId = "restaurant-menu-qr"
    const { qrId } = req.params;
    
    // Extract form data from request body
    // Sent by frontend as JSON: { "name": "...", "email": "...", "message": "..." }
    const { name, email, phone, message, micrositeId, consent } = req.body || {};

    // CRITICAL: Validate consent before storing PII
    // Without consent, we cannot legally store or contact this person!
    if (!consent || consent !== true) {
      return reply.code(400).send({ 
        error: "Consent required",
        message: "You must agree to be contacted to submit this form" 
      });
    }

    // TODO: Add more validation here in production
    // - Check email format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    // - Verify required fields: if (!name || !email) return 400
    // - Sanitize inputs: Prevent XSS/SQL injection
    // - Verify micrositeId exists (optional check)

    /**
     * STEP 1: Store Lead in Database
     * 
     * Why store in database?
     * - Leads are business-critical data (potential customers)
     * - Need persistence for CRM integration
     * - Staff needs to view/export leads from admin panel
     * - Provides audit trail (who submitted when)
     * 
     * Database columns explained:
     * - id: UUID primary key (more secure than auto-increment)
     * - qrId: Which QR code generated this lead (campaign tracking)
     * - micrositeId: Reference to the microsite (foreign key constraint)
     * - name: User's name (for personalized follow-up)
     * - email: Primary contact method
     * - phone: Secondary contact (some users prefer calls)
     * - message: User's inquiry/message/notes
     * - status: Pipeline stage (new, contacted, qualified, converted)
     * - priority: Urgency level (low, medium, high)
     * - assignedTo: Staff member handling this lead
     * - consentGiven: CRITICAL - legal proof user agreed to contact
     * - consentTimestamp: When they clicked "I agree" checkbox
     * - consentText: What they agreed to (store the actual checkbox text)
     * - customFields: Campaign-specific data (party size, budget, etc.)
     * - source: "form" indicates manual submission (vs "api" or "import")
     * - createdAt: Timestamp for sorting/filtering leads
     * - updatedAt: Last modification time (for "stale lead" detection)
     */
    const [lead] = await db
      .insert(leads)
      .values({
        qrId,
        micrositeId,
        name,
        email,
        phone,
        message,
        source: "form",
        // GDPR compliance - critical for legal protection
        consentGiven: true,
        consentTimestamp: new Date(),
        consentText: "I agree to be contacted about my inquiry", // Should come from frontend
        // Lead management defaults
        status: "new",
        priority: "medium",
      })
      .returning({ id: leads.id, createdAt: leads.createdAt });
    
    // Lead now has: { id: "uuid-string", createdAt: Date object }

    /**
     * STEP 2: Send Analytics Event to Kafka
     * 
     * Why send to Kafka instead of analytics database directly?
     * 
     * DECOUPLING:
     * - Microsite service doesn't need to know about analytics database
     * - Analytics service can be down without breaking lead capture
     * - Can add multiple consumers later (email service, CRM sync, etc.)
     * 
     * RELIABILITY:
     * - If Kafka is down, we still captured the lead (in database above)
     * - Kafka buffers events during outages
     * - Fire-and-forget pattern: Don't make user wait for analytics
     * 
     * SCALABILITY:
     * - Can process analytics async (doesn't slow down response)
     * - Multiple services can consume same event (DLQ processor, reporting, etc.)
     * - Easy to add new analytics features without changing this code
     * 
     * EVENT STRUCTURE:
     * {
     *   eventType: "lead.captured" - Identifies this as a lead event (vs scan/view)
     *   qrId: "menu-qr" - Campaign context
     *   leadId: "uuid-string" - Reference to database record
     *   timestamp: "2025-11-30T10:30:00Z" - When it happened (ISO format)
     *   name/email/message: User data (for analytics/reporting)
     * }
     * 
     * WHO CONSUMES THIS EVENT:
     * - Analytics service: Tracks conversion rates (scans → leads)
     * - DLQ processor: Handles failed processing/retries
     * - Future: Email service (send confirmation email)
     * - Future: CRM integration (sync to Salesforce/HubSpot)
     */
    await producer.send({
      topic: "analytics.events",
      messages: [
        {
          value: JSON.stringify({
            eventType: "lead.captured",
            qrId,
            leadId: lead.id,
            timestamp: lead.createdAt.toISOString(),
            name,
            email,
            message,
          }),
        },
      ],
    });

    /**
     * STEP 3: Respond to Client
     * 
     * HTTP 201 Created: Standard for resource creation
     * Response: { success: true }
     * 
     * Frontend can now:
     * - Show "Thank you!" message
     * - Redirect to confirmation page
     * - Clear form fields
     * - Track conversion in Google Analytics
     * 
     * ALTERNATIVE RESPONSES (for future enhancement):
     * - Include lead ID: { success: true, leadId: 123 }
     * - Include next steps: { success: true, message: "We'll call you within 24 hours" }
     * - Include confirmation number: { success: true, confirmationId: "LEAD-123" }
     */
    reply.code(201).send({ success: true });
  });
}

/**
 * ==========================================
 * POTENTIAL ENHANCEMENTS
 * ==========================================
 * 
 * 1. VALIDATION:
 *    - Add Zod schema for request validation
 *    - Email format verification
 *    - Message length limits (prevent spam)
 *    - Required field checks
 * 
 * 2. SPAM PREVENTION:
 *    - Rate limiting (max 5 submissions per IP per hour)
 *    - reCAPTCHA integration
 *    - Honeypot fields (hidden inputs that bots fill)
 *    - Duplicate detection (same email within 1 hour)
 * 
 * 3. CONFIRMATIONS:
 *    - Send confirmation email to user
 *    - Send notification to business owner
 *    - SMS confirmation (via Twilio) if phone number collected
 *    - Webhook to CRM system
 * 
 * 4. ANALYTICS:
 *    - Track form abandonment (started but didn't submit)
 *    - Track time to submit (how long form was open)
 *    - Track field validation errors
 *    - A/B test different form designs
 * 
 * 5. CUSTOM FIELDS:
 *    - Support dynamic form fields per QR code
 *    - Store custom data in JSONB column
 *    - Validate against schema defined in admin panel
 * 
 * 6. GDPR COMPLIANCE:
 *    - Add consent checkbox requirement
 *    - Store consent timestamp
 *    - Support data deletion requests
 *    - Add privacy policy link
 * 
 * EXAMPLE WITH VALIDATION:
 * 
 * const leadSchema = z.object({
 *   name: z.string().min(2).max(100),
 *   email: z.string().email(),
 *   message: z.string().max(1000).optional(),
 *   micrositeId: z.string().uuid(),
 *   consent: z.boolean().refine(val => val === true),
 * });
 * 
 * const validated = leadSchema.safeParse(req.body);
 * if (!validated.success) {
 *   return reply.code(400).send({ 
 *     error: "Validation failed",
 *     details: validated.error.errors 
 *   });
 * }
 */
