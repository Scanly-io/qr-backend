/**
 * PIVOT 1: Digital Sales Room Templates
 * 
 * Pre-built templates for agencies to use with their high-value prospects.
 * Each template is optimized for specific sales scenarios.
 */

export const digitalSalesRoomTemplates = [
  {
    name: 'Enterprise Proposal',
    description: 'Professional proposal template for enterprise deals ($50k+)',
    category: 'proposal',
    thumbnail: '/templates/enterprise-proposal.png',
    layout: {
      sections: [
        { id: 'hero', type: 'hero', order: 1 },
        { id: 'executive-summary', type: 'text', order: 2 },
        { id: 'solution', type: 'features-grid', order: 3 },
        { id: 'pricing', type: 'pricing-table', order: 4 },
        { id: 'timeline', type: 'timeline', order: 5 },
        { id: 'cta', type: 'cta-section', order: 6 },
      ],
    },
    defaultBlocks: [
      {
        type: 'hero',
        props: {
          heading: 'Proposal for {{prospect_name}}',
          subheading: 'Prepared by {{agency_name}} — {{date}}',
          backgroundImage: '/assets/hero-gradient.jpg',
          ctaText: 'Review Proposal',
          ctaLink: '#executive-summary',
        },
        order: 1,
      },
      {
        type: 'text',
        props: {
          id: 'executive-summary',
          heading: 'Executive Summary',
          content: `<p>Thank you for considering our proposal. We're excited to partner with {{prospect_company}} to achieve [specific outcome].</p>
<p><strong>Key highlights:</strong></p>
<ul>
  <li>Expected ROI: {{roi_percentage}}%</li>
  <li>Timeline: {{timeline_weeks}} weeks</li>
  <li>Investment: {{deal_value}}</li>
</ul>`,
        },
        order: 2,
      },
      {
        type: 'video',
        props: {
          heading: 'Personal Video Message',
          videoUrl: '{{video_url}}',
          provider: 'loom',
          autoplay: false,
          thumbnail: '{{video_thumbnail}}',
        },
        order: 3,
      },
      {
        type: 'pricing-table',
        props: {
          heading: 'Investment & Pricing',
          tiers: [
            {
              name: 'Phase 1',
              price: '{{phase1_price}}',
              features: ['Discovery & Strategy', 'Initial Setup', '30-day Support'],
            },
            {
              name: 'Phase 2',
              price: '{{phase2_price}}',
              features: ['Full Implementation', 'Team Training', '90-day Support'],
              highlighted: true,
            },
          ],
        },
        order: 4,
      },
      {
        type: 'cta-section',
        props: {
          heading: 'Ready to Move Forward?',
          ctaText: 'Schedule Kickoff Call',
          ctaLink: '{{calendly_link}}',
          secondaryCtaText: 'Download PDF Proposal',
          secondaryCtaLink: '{{proposal_pdf_url}}',
        },
        order: 6,
      },
    ],
  },
  
  {
    name: 'Interactive Pitch Deck',
    description: 'Engaging pitch deck with embedded videos and interactive elements',
    category: 'pitch-deck',
    thumbnail: '/templates/pitch-deck.png',
    layout: {
      sections: [
        { id: 'cover', type: 'hero', order: 1 },
        { id: 'problem', type: 'text', order: 2 },
        { id: 'solution', type: 'features', order: 3 },
        { id: 'case-studies', type: 'testimonials', order: 4 },
        { id: 'demo', type: 'video', order: 5 },
        { id: 'next-steps', type: 'cta', order: 6 },
      ],
    },
    defaultBlocks: [
      {
        type: 'hero',
        props: {
          heading: '{{company_name}} Pitch',
          subheading: 'Transforming {{industry}} with {{unique_value_prop}}',
          backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          ctaText: 'Start Exploring',
          ctaLink: '#problem',
        },
        order: 1,
      },
      {
        type: 'text',
        props: {
          id: 'problem',
          heading: 'The Problem',
          content: '<p>{{problem_statement}}</p>',
          icon: '⚠️',
        },
        order: 2,
      },
      {
        type: 'features',
        props: {
          heading: 'Our Solution',
          features: [
            { icon: '🚀', title: 'Feature 1', description: '{{feature1_desc}}' },
            { icon: '💡', title: 'Feature 2', description: '{{feature2_desc}}' },
            { icon: '📈', title: 'Feature 3', description: '{{feature3_desc}}' },
          ],
        },
        order: 3,
      },
      {
        type: 'video',
        props: {
          heading: 'See It in Action',
          videoUrl: '{{demo_video_url}}',
          provider: 'youtube',
          autoplay: false,
        },
        order: 5,
      },
    ],
  },
  
  {
    name: 'Contract Review Portal',
    description: 'Secure portal for contract review with e-signature integration',
    category: 'contract',
    thumbnail: '/templates/contract-portal.png',
    layout: {
      sections: [
        { id: 'header', type: 'header', order: 1 },
        { id: 'contract-summary', type: 'text', order: 2 },
        { id: 'terms', type: 'accordion', order: 3 },
        { id: 'signature', type: 'form', order: 4 },
      ],
    },
    defaultBlocks: [
      {
        type: 'header',
        props: {
          logo: '{{company_logo}}',
          heading: 'Service Agreement — {{prospect_name}}',
          passwordProtected: true,
        },
        order: 1,
      },
      {
        type: 'text',
        props: {
          heading: 'Contract Summary',
          content: `<p>This agreement is between {{agency_name}} and {{prospect_company}}.</p>
<p><strong>Key terms:</strong></p>
<ul>
  <li>Start Date: {{start_date}}</li>
  <li>Duration: {{duration_months}} months</li>
  <li>Total Investment: {{total_value}}</li>
  <li>Payment Terms: {{payment_terms}}</li>
</ul>`,
        },
        order: 2,
      },
      {
        type: 'accordion',
        props: {
          heading: 'Full Terms & Conditions',
          items: [
            { title: 'Scope of Work', content: '{{scope_of_work}}' },
            { title: 'Payment Schedule', content: '{{payment_schedule}}' },
            { title: 'Deliverables', content: '{{deliverables}}' },
            { title: 'Termination Clause', content: '{{termination_clause}}' },
          ],
        },
        order: 3,
      },
      {
        type: 'form',
        props: {
          heading: 'Accept & Sign',
          fields: [
            { type: 'text', name: 'full_name', label: 'Full Name', required: true },
            { type: 'email', name: 'email', label: 'Email', required: true },
            { type: 'signature', name: 'signature', label: 'Signature', required: true },
            { type: 'checkbox', name: 'accept_terms', label: 'I accept the terms and conditions', required: true },
          ],
          submitText: 'Sign Agreement',
          submitAction: '{{docusign_webhook_url}}',
        },
        order: 4,
      },
    ],
  },
];

/**
 * Helper function to populate template variables
 */
export function populateTemplate(template: any, variables: Record<string, string>) {
  const templateStr = JSON.stringify(template);
  let populated = templateStr;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    populated = populated.replace(regex, value);
  }
  
  return JSON.parse(populated);
}

/**
 * Example usage:
 * 
 * const proposalTemplate = digitalSalesRoomTemplates[0];
 * const customizedProposal = populateTemplate(proposalTemplate, {
 *   prospect_name: 'John Smith',
 *   agency_name: 'Acme Agency',
 *   date: '2025-01-15',
 *   prospect_company: 'TechCorp Inc.',
 *   roi_percentage: '250',
 *   timeline_weeks: '12',
 *   deal_value: '$85,000',
 *   video_url: 'https://loom.com/share/abc123',
 * });
 */
