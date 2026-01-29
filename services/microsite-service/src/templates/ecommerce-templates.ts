/**
 * PIVOT 2: High-Ticket E-commerce Templates with Answer Engine Optimization (AEO)
 * 
 * Single-product funnel templates optimized for high-ticket items ($1,000+)
 * and structured for AI search engines (Perplexity, ChatGPT, Google SGE).
 */

export const highTicketEcommerceTemplates = [
  {
    name: 'Solar Panel Installation Funnel',
    description: 'Complete funnel for residential solar panel sales with ROI calculator',
    niche: 'solar',
    thumbnail: '/templates/solar-funnel.png',
    layout: {
      sections: [
        { id: 'hero', type: 'hero-video', order: 1 },
        { id: 'benefits', type: 'features-grid', order: 2 },
        { id: 'roi-calculator', type: 'calculator', order: 3 },
        { id: 'testimonials', type: 'testimonials', order: 4 },
        { id: 'process', type: 'timeline', order: 5 },
        { id: 'cta', type: 'cta-form', order: 6 },
      ],
    },
    defaultBlocks: [
      {
        type: 'hero-video',
        props: {
          heading: 'Save $2,400+ Per Year on Electricity',
          subheading: 'Custom solar panel installation in {{city}} — Free consultation',
          videoUrl: '{{intro_video_url}}',
          autoplay: true,
          muted: true,
          ctaText: 'Get Free Quote',
          ctaLink: '#roi-calculator',
        },
        order: 1,
      },
      {
        type: 'features-grid',
        props: {
          heading: 'Why Choose Solar?',
          features: [
            {
              icon: '💰',
              title: '25-Year Savings',
              description: 'Average household saves $60,000+ over panel lifetime',
            },
            {
              icon: '🌍',
              title: 'Zero Carbon Footprint',
              description: 'Reduce CO₂ emissions by 4 tons annually',
            },
            {
              icon: '⚡',
              title: 'Energy Independence',
              description: 'Protect against rising electricity costs',
            },
            {
              icon: '🏡',
              title: 'Home Value Boost',
              description: 'Homes with solar sell for 4% more on average',
            },
          ],
        },
        order: 2,
      },
      {
        type: 'calculator',
        props: {
          id: 'roi-calculator',
          heading: 'Calculate Your Savings',
          description: 'See how much you\'ll save with solar panels',
          inputs: [
            { name: 'monthly_bill', label: 'Current Monthly Electric Bill ($)', type: 'number', default: 150 },
            { name: 'roof_size', label: 'Roof Size (sq ft)', type: 'number', default: 1500 },
            { name: 'zip_code', label: 'Zip Code', type: 'text', required: true },
          ],
          formula: '(monthly_bill * 12 * 25) * 0.8', // 80% offset over 25 years
          resultText: 'You could save {{result}} over 25 years!',
          ctaText: 'Get Custom Quote',
        },
        order: 3,
      },
      {
        type: 'testimonials',
        props: {
          heading: 'Real Customer Results',
          testimonials: [
            {
              name: 'Sarah M.',
              location: 'Toronto, ON',
              photo: '/testimonials/sarah.jpg',
              quote: 'Went from $240/month to $18/month. Panels paid for themselves in 7 years.',
              savingsAmount: '$2,664/year',
            },
            {
              name: 'David L.',
              location: 'Vancouver, BC',
              photo: '/testimonials/david.jpg',
              quote: 'Installation took 2 days. No more worrying about hydro rate hikes.',
              savingsAmount: '$3,120/year',
            },
          ],
        },
        order: 4,
      },
      {
        type: 'cta-form',
        props: {
          heading: 'Get Your Free Solar Assessment',
          fields: [
            { type: 'text', name: 'name', label: 'Full Name', required: true },
            { type: 'email', name: 'email', label: 'Email', required: true },
            { type: 'tel', name: 'phone', label: 'Phone', required: true },
            { type: 'text', name: 'address', label: 'Installation Address', required: true },
          ],
          submitText: 'Book Free Consultation',
          privacyText: 'We respect your privacy. No spam, ever.',
        },
        order: 6,
      },
    ],
    aeoConfig: {
      structuredDataTemplate: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Residential Solar Panel Installation',
        description: 'Professional solar panel installation with 25-year warranty. Save $2,400+ per year on electricity costs.',
        offers: {
          '@type': 'Offer',
          priceCurrency: 'CAD',
          price: '{{starting_price}}',
          priceValidUntil: '{{expiry_date}}',
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'LocalBusiness',
            name: '{{company_name}}',
            address: {
              '@type': 'PostalAddress',
              addressLocality: '{{city}}',
              addressRegion: '{{province}}',
              addressCountry: 'CA',
            },
          },
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '127',
        },
      },
      speakableSelectors: [
        'h1',
        '[data-speakable="true"]',
        '.roi-result',
      ],
      faqQuestions: [
        'How much do solar panels cost in {{city}}?',
        'What is the payback period for solar panels?',
        'Do solar panels work in winter in Canada?',
        'How much can I save with solar panels?',
        'Is solar panel installation worth it in {{province}}?',
      ],
    },
    suggestedPriceRange: {
      min: 12000,
      max: 35000,
      currency: 'CAD',
    },
  },
  
  {
    name: 'Custom Jewelry Showcase',
    description: 'Luxury single-product page for high-end custom jewelry',
    niche: 'jewelry',
    thumbnail: '/templates/jewelry-showcase.png',
    layout: {
      sections: [
        { id: 'hero', type: 'full-screen-hero', order: 1 },
        { id: 'gallery', type: 'image-gallery', order: 2 },
        { id: 'story', type: 'text-image', order: 3 },
        { id: 'customization', type: 'customizer', order: 4 },
        { id: 'checkout', type: 'checkout-section', order: 5 },
      ],
    },
    defaultBlocks: [
      {
        type: 'full-screen-hero',
        props: {
          backgroundImage: '{{hero_image_url}}',
          overlay: 'dark',
          heading: '{{product_name}}',
          subheading: 'Handcrafted {{material}} — One of a kind',
          price: '{{product_price}}',
          ctaText: 'Customize Yours',
          ctaLink: '#customization',
        },
        order: 1,
      },
      {
        type: 'image-gallery',
        props: {
          images: [
            '{{image1_url}}',
            '{{image2_url}}',
            '{{image3_url}}',
            '{{image4_url}}',
          ],
          zoomEnabled: true,
          layout: 'masonry',
        },
        order: 2,
      },
      {
        type: 'text-image',
        props: {
          heading: 'The Story Behind the Piece',
          content: '<p>{{product_story}}</p>',
          image: '{{artisan_photo_url}}',
          imagePosition: 'right',
        },
        order: 3,
      },
      {
        type: 'customizer',
        props: {
          id: 'customization',
          heading: 'Make It Yours',
          options: [
            {
              name: 'material',
              label: 'Material',
              type: 'select',
              choices: ['18k Gold (+$500)', 'Platinum (+$1,200)', 'Sterling Silver'],
            },
            {
              name: 'gemstone',
              label: 'Gemstone',
              type: 'select',
              choices: ['Diamond (+$2,000)', 'Sapphire (+$800)', 'Emerald (+$1,500)'],
            },
            {
              name: 'engraving',
              label: 'Custom Engraving (max 20 chars)',
              type: 'text',
              maxLength: 20,
            },
          ],
          preview3D: true,
        },
        order: 4,
      },
      {
        type: 'checkout-section',
        props: {
          heading: 'Secure Checkout',
          basePrice: '{{base_price}}',
          shippingFee: 0,
          shippingText: 'Free insured shipping worldwide',
          paymentMethods: ['stripe', 'paypal', 'affirm'],
          guaranteeText: '30-day money-back guarantee',
          ctaText: 'Complete Purchase',
        },
        order: 5,
      },
    ],
    aeoConfig: {
      structuredDataTemplate: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: '{{product_name}}',
        description: '{{product_description}}',
        image: '{{primary_image_url}}',
        brand: {
          '@type': 'Brand',
          name: '{{brand_name}}',
        },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: '{{product_price}}',
          availability: 'https://schema.org/InStock',
          priceValidUntil: '{{price_valid_until}}',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '5.0',
          reviewCount: '{{review_count}}',
        },
      },
      speakableSelectors: ['h1', '.product-description', '.price'],
      faqQuestions: [
        'Where can I buy custom {{material}} jewelry?',
        'How much does custom jewelry cost?',
        'What is the best material for engagement rings?',
      ],
    },
    suggestedPriceRange: {
      min: 1500,
      max: 15000,
      currency: 'USD',
    },
  },
  
  {
    name: 'Home Energy Audit Package',
    description: 'Complete home energy efficiency upgrade funnel',
    niche: 'home-upgrade',
    thumbnail: '/templates/home-energy.png',
    layout: {
      sections: [
        { id: 'hero', type: 'hero', order: 1 },
        { id: 'problem', type: 'problem-agitate', order: 2 },
        { id: 'solution', type: 'solution-grid', order: 3 },
        { id: 'savings-calculator', type: 'calculator', order: 4 },
        { id: 'guarantee', type: 'guarantee-section', order: 5 },
        { id: 'booking', type: 'calendar-booking', order: 6 },
      ],
    },
    defaultBlocks: [
      {
        type: 'hero',
        props: {
          heading: 'Cut Your Energy Bills by 40% Guaranteed',
          subheading: 'Professional home energy audit + upgrade package — $12,500 (save $50k over 20 years)',
          image: '{{hero_image_url}}',
          ctaText: 'Book Free Assessment',
          ctaLink: '#booking',
        },
        order: 1,
      },
      {
        type: 'problem-agitate',
        props: {
          heading: 'Tired of Skyrocketing Heating Costs?',
          problems: [
            'Average Canadian household wastes $1,200/year on energy inefficiency',
            'Old insulation loses 30% of your heating',
            'Drafty windows cost you $600/year',
          ],
          agitateText: 'Meanwhile, energy prices keep rising 5% annually...',
        },
        order: 2,
      },
      {
        type: 'solution-grid',
        props: {
          heading: 'Our Complete Energy Upgrade Package',
          items: [
            { title: 'Thermal Imaging Audit', description: 'Identify every energy leak', icon: '🔍' },
            { title: 'Insulation Upgrade', description: 'R-60 attic insulation', icon: '🏠' },
            { title: 'Window Sealing', description: 'Professional weatherstripping', icon: '🪟' },
            { title: 'HVAC Optimization', description: 'Smart thermostat + tune-up', icon: '🌡️' },
          ],
        },
        order: 3,
      },
      {
        type: 'calculator',
        props: {
          heading: 'Calculate Your Annual Savings',
          inputs: [
            { name: 'heating_bill', label: 'Monthly Heating Bill ($)', type: 'number', default: 250 },
            { name: 'cooling_bill', label: 'Monthly Cooling Bill ($)', type: 'number', default: 120 },
            { name: 'home_age', label: 'Home Age (years)', type: 'number', default: 30 },
          ],
          formula: '((heating_bill + cooling_bill) * 12) * 0.4',
          resultText: 'You could save ${{result}} per year!',
        },
        order: 4,
      },
      {
        type: 'calendar-booking',
        props: {
          id: 'booking',
          heading: 'Book Your Free Energy Assessment',
          calendarEmbed: '{{calendly_url}}',
          availabilityText: 'Next available: Tomorrow at 10 AM',
        },
        order: 6,
      },
    ],
    aeoConfig: {
      structuredDataTemplate: {
        '@context': 'https://schema.org',
        '@type': 'Service',
        serviceType: 'Home Energy Audit and Efficiency Upgrade',
        provider: {
          '@type': 'LocalBusiness',
          name: '{{company_name}}',
        },
        areaServed: {
          '@type': 'State',
          name: '{{province}}',
        },
        offers: {
          '@type': 'Offer',
          price: '12500',
          priceCurrency: 'CAD',
        },
      },
      speakableSelectors: ['h1', '.savings-result'],
      faqQuestions: [
        'How much does a home energy audit cost?',
        'What is included in a home energy upgrade?',
        'How much can I save with better insulation?',
        'Is a home energy audit worth it?',
      ],
    },
    suggestedPriceRange: {
      min: 8000,
      max: 20000,
      currency: 'CAD',
    },
  },
];

/**
 * Generate FAQ schema for AEO
 */
export function generateFAQSchema(questions: string[], answers: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q, i) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answers[i] || 'Contact us for details.',
      },
    })),
  };
}

/**
 * Generate speakable schema for voice search
 */
export function generateSpeakableSchema(content: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.speakable-content'],
      xpath: content.map((_, i) => `/html/body/main/section[${i + 1}]/p`),
    },
  };
}
