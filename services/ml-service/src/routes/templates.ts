import { FastifyInstance } from 'fastify';

// Template categories and types
interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  industry: string;
  thumbnail: string;
  previewUrl?: string;
  structure: {
    pages: TemplateBlock[];
    theme: {
      primaryColor: string;
      secondaryColor: string;
      backgroundColor: string;
      textColor: string;
      fontFamily: string;
    };
    settings: Record<string, any>;
    animations: {
      pageTransition?: 'fade' | 'slide' | 'zoom' | 'none';
      scrollAnimation?: 'fade-up' | 'slide-in' | 'parallax' | 'none';
      buttonHover?: 'lift' | 'glow' | 'scale' | 'shine' | 'none';
      loadAnimation?: 'skeleton' | 'fade' | 'progressive' | 'none';
    };
    optimizations: {
      lazyLoadImages: boolean;
      minifyAssets: boolean;
      cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
      prefetchLinks: boolean;
    };
    accessibility: {
      highContrast: boolean;
      focusIndicators: boolean;
      screenReaderOptimized: boolean;
      keyboardNavigation: boolean;
    };
  };
  features: string[];
  tags: string[];
  isPremium: boolean;
  usageCount: number;
  rating: number;
  aiTips?: AITip[];
  performanceScore: number;
  mobileOptimized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AITip {
  id: string;
  category: 'design' | 'content' | 'seo' | 'performance' | 'engagement';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  implementable: boolean;
  autoApply?: boolean;
  config?: Record<string, any>;
}

interface TemplateBlock {
  type: string;
  title: string;
  content: Record<string, any>;
  order: number;
  settings?: Record<string, any>;
}

interface CustomTemplate {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  structure: Template['structure'];
  createdAt: Date;
  updatedAt: Date;
}

// In-memory template storage
const templates = new Map<string, Template>();
const customTemplates = new Map<string, CustomTemplate>();

// Helper to generate AI tip IDs
const generateTipId = (templateId: string, index: number) => `${templateId}-tip-${index + 1}`;

// Default template enhancements
const defaultAnimations = {
  pageTransition: 'fade' as const,
  scrollAnimation: 'fade-up' as const,
  buttonHover: 'lift' as const,
  loadAnimation: 'progressive' as const,
};

const defaultOptimizations = {
  lazyLoadImages: true,
  minifyAssets: true,
  cacheStrategy: 'aggressive' as const,
  prefetchLinks: true,
};

const defaultAccessibility = {
  highContrast: false,
  focusIndicators: true,
  screenReaderOptimized: true,
  keyboardNavigation: true,
};

// Initialize with pre-built templates
function initializeTemplates() {
  const builtInTemplates: Template[] = [
    {
      id: 'restaurant-modern',
      name: 'Modern Restaurant',
      description: 'Elegant restaurant template with menu, reservations, and location',
      category: 'Restaurant',
      industry: 'Food & Beverage',
      thumbnail: '/templates/restaurant-modern.jpg',
      structure: {
        pages: [
          {
            type: 'hero',
            title: 'Welcome',
            content: {
              heading: 'Welcome to Our Restaurant',
              subheading: 'Experience Fine Dining',
              backgroundImage: '',
              ctaText: 'View Menu',
              ctaLink: '#menu',
            },
            order: 0,
          },
          {
            type: 'menu',
            title: 'Menu',
            content: {
              sections: [
                { name: 'Appetizers', items: [] },
                { name: 'Main Course', items: [] },
                { name: 'Desserts', items: [] },
              ],
            },
            order: 1,
          },
          {
            type: 'reservation',
            title: 'Reservations',
            content: {
              heading: 'Book a Table',
              formFields: ['name', 'email', 'phone', 'date', 'time', 'guests'],
            },
            order: 2,
          },
          {
            type: 'location',
            title: 'Location',
            content: {
              address: '123 Main Street',
              phone: '+1 234 567 8900',
              hours: 'Mon-Sun: 11AM - 10PM',
              mapEmbedUrl: '',
            },
            order: 3,
          },
        ],
        theme: {
          primaryColor: '#D4AF37',
          secondaryColor: '#2C2C2C',
          backgroundColor: '#FFFFFF',
          textColor: '#333333',
          fontFamily: 'Playfair Display, serif',
        },
        settings: {
          layout: 'single-page',
          animation: 'fade-in',
        },
        animations: {
          ...defaultAnimations,
          scrollAnimation: 'fade-up',
          buttonHover: 'lift',
        },
        optimizations: defaultOptimizations,
        accessibility: defaultAccessibility,
      },
      features: ['Menu Display', 'Online Reservations', 'Location Map', 'Contact Form'],
      tags: ['restaurant', 'food', 'dining', 'menu'],
      isPremium: false,
      usageCount: 1523,
      rating: 4.8,
      performanceScore: 88,
      mobileOptimized: true,
      aiTips: [
        {
          id: 'restaurant-modern-tip-1',
          category: 'design',
          title: 'Add High-Quality Food Photography',
          description: 'Replace placeholder images with professional photos of your signature dishes. High-quality imagery increases conversions by 40%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'restaurant-modern-tip-2',
          category: 'content',
          title: 'Highlight Your Specialties',
          description: 'Feature 3-5 most popular dishes in the hero section with mouth-watering descriptions.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'restaurant-modern-tip-3',
          category: 'seo',
          title: 'Optimize for Local Search',
          description: 'Add your city and cuisine type to headings. E.g., "Best Italian Restaurant in Seattle"',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'restaurant-modern-tip-4',
          category: 'engagement',
          title: 'Add Real-Time Availability',
          description: 'Show current table availability to create urgency and reduce no-shows.',
          impact: 'medium',
          difficulty: 'medium',
          implementable: false,
        },
        {
          id: 'restaurant-modern-tip-5',
          category: 'performance',
          title: 'Enable Image Lazy Loading',
          description: 'Menu images load as users scroll, improving initial page load speed by 35%.',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'event-conference',
      name: 'Conference Event',
      description: 'Professional event template with schedule, speakers, and registration',
      category: 'Events',
      industry: 'Professional Services',
      thumbnail: '/templates/event-conference.jpg',
      structure: {
        pages: [
          {
            type: 'hero',
            title: 'Event Header',
            content: {
              heading: 'Annual Tech Conference 2026',
              subheading: 'Join industry leaders for 3 days of innovation',
              date: 'March 15-17, 2026',
              ctaText: 'Register Now',
              ctaLink: '#register',
            },
            order: 0,
          },
          {
            type: 'agenda',
            title: 'Schedule',
            content: {
              days: [
                {
                  date: 'Day 1',
                  sessions: [
                    { time: '9:00 AM', title: 'Opening Keynote', speaker: 'TBD' },
                    { time: '10:30 AM', title: 'Workshop Session 1', speaker: 'TBD' },
                  ],
                },
              ],
            },
            order: 1,
          },
          {
            type: 'speakers',
            title: 'Speakers',
            content: {
              speakers: [],
            },
            order: 2,
          },
          {
            type: 'registration',
            title: 'Register',
            content: {
              tiers: [
                { name: 'Early Bird', price: 299, features: ['All Sessions', 'Networking Events'] },
                { name: 'VIP', price: 599, features: ['All Sessions', 'VIP Lounge', 'Workshop Materials'] },
              ],
            },
            order: 3,
          },
        ],
        theme: {
          primaryColor: '#4A90E2',
          secondaryColor: '#50E3C2',
          backgroundColor: '#F8F9FA',
          textColor: '#2C3E50',
          fontFamily: 'Inter, sans-serif',
        },
        settings: {
          layout: 'multi-section',
          countdown: true,
        },
        animations: {
          ...defaultAnimations,
          pageTransition: 'slide',
          scrollAnimation: 'fade-up',
          buttonHover: 'glow',
        },
        optimizations: defaultOptimizations,
        accessibility: defaultAccessibility,
      },
      features: ['Event Schedule', 'Speaker Profiles', 'Ticket Sales', 'Countdown Timer'],
      tags: ['event', 'conference', 'professional', 'networking'],
      isPremium: false,
      usageCount: 892,
      rating: 4.6,
      performanceScore: 91,
      mobileOptimized: true,
      aiTips: [
        {
          id: 'event-conference-tip-1',
          category: 'engagement',
          title: 'Add Countdown Timer Above Fold',
          description: 'Display time until event in hero section to create urgency and boost early registrations by 28%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'event-conference-tip-2',
          category: 'content',
          title: 'Showcase Keynote Speakers',
          description: 'Feature headshots and bios of top 3 speakers in hero. Well-known speakers increase ticket sales by 45%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'event-conference-tip-3',
          category: 'seo',
          title: 'Optimize for Event Search',
          description: 'Include event date, location, and industry in page title. E.g., "Tech Conference 2026 | San Francisco | March 15-17"',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'event-conference-tip-4',
          category: 'design',
          title: 'Use Tiered Pricing Display',
          description: 'Show 3 pricing tiers side-by-side with "Most Popular" badge to guide decision-making.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'event-conference-tip-5',
          category: 'performance',
          title: 'Lazy Load Schedule Sessions',
          description: 'Load agenda items as users scroll through days, improving initial load speed by 30%.',
          impact: 'medium',
          difficulty: 'medium',
          implementable: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'product-launch',
      name: 'Product Launch',
      description: 'High-converting product launch page with features and testimonials',
      category: 'Product',
      industry: 'Technology',
      thumbnail: '/templates/product-launch.jpg',
      structure: {
        pages: [
          {
            type: 'hero',
            title: 'Product Hero',
            content: {
              heading: 'Introducing the Next Generation',
              subheading: 'Revolutionary features that change everything',
              productImage: '',
              ctaText: 'Pre-order Now',
              ctaLink: '#preorder',
            },
            order: 0,
          },
          {
            type: 'features',
            title: 'Features',
            content: {
              features: [
                { icon: 'zap', title: 'Lightning Fast', description: '10x faster than competitors' },
                { icon: 'shield', title: 'Secure', description: 'Bank-level encryption' },
                { icon: 'heart', title: 'Easy to Use', description: 'Intuitive interface' },
              ],
            },
            order: 1,
          },
          {
            type: 'testimonials',
            title: 'Testimonials',
            content: {
              testimonials: [],
            },
            order: 2,
          },
          {
            type: 'pricing',
            title: 'Pricing',
            content: {
              plans: [
                { name: 'Starter', price: 29, features: ['Feature 1', 'Feature 2'] },
                { name: 'Pro', price: 79, features: ['All Starter', 'Feature 3', 'Feature 4'] },
              ],
            },
            order: 3,
          },
        ],
        theme: {
          primaryColor: '#FF6B6B',
          secondaryColor: '#4ECDC4',
          backgroundColor: '#1A1A2E',
          textColor: '#EAEAEA',
          fontFamily: 'Poppins, sans-serif',
        },
        settings: {
          layout: 'landing-page',
          parallax: true,
        },
        animations: {
          ...defaultAnimations,
          pageTransition: 'zoom',
          scrollAnimation: 'parallax',
          buttonHover: 'scale',
        },
        optimizations: defaultOptimizations,
        accessibility: defaultAccessibility,
      },
      features: ['Product Showcase', 'Feature Grid', 'Testimonials', 'Pricing Tables'],
      tags: ['product', 'launch', 'saas', 'technology'],
      isPremium: true,
      usageCount: 2341,
      rating: 4.9,
      performanceScore: 93,
      mobileOptimized: true,
      aiTips: [
        {
          id: 'product-launch-tip-1',
          category: 'design',
          title: 'Use Hero Product Video',
          description: 'Add 10-15 second product demo video in hero. Videos increase engagement by 80%.',
          impact: 'high',
          difficulty: 'medium',
          implementable: true,
        },
        {
          id: 'product-launch-tip-2',
          category: 'content',
          title: 'Create Urgency with Limited Offers',
          description: 'Display "Limited Time" or "Only 100 Available" to boost conversions by 35%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'product-launch-tip-3',
          category: 'seo',
          title: 'Optimize Product Schema',
          description: 'Add product structured data for rich snippets in search results.',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'product-launch-tip-4',
          category: 'engagement',
          title: 'Add Email Capture Form',
          description: 'Collect emails before launch with early-bird discount incentive.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'product-launch-tip-5',
          category: 'performance',
          title: 'Optimize Images for Web',
          description: 'Use WebP format and responsive images to reduce load time by 50%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'portfolio-creative',
      name: 'Creative Portfolio',
      description: 'Stunning portfolio template for designers and artists',
      category: 'Portfolio',
      industry: 'Creative',
      thumbnail: '/templates/portfolio-creative.jpg',
      structure: {
        pages: [
          {
            type: 'hero',
            title: 'Introduction',
            content: {
              heading: 'Hi, I\'m [Your Name]',
              subheading: 'Creative Designer & Visual Artist',
              profileImage: '',
              socialLinks: [],
            },
            order: 0,
          },
          {
            type: 'gallery',
            title: 'Portfolio',
            content: {
              projects: [],
              layout: 'masonry',
            },
            order: 1,
          },
          {
            type: 'about',
            title: 'About Me',
            content: {
              bio: '',
              skills: [],
              experience: [],
            },
            order: 2,
          },
          {
            type: 'contact',
            title: 'Contact',
            content: {
              email: '',
              formFields: ['name', 'email', 'message'],
            },
            order: 3,
          },
        ],
        theme: {
          primaryColor: '#FF8C42',
          secondaryColor: '#6C5B7B',
          backgroundColor: '#F7F7F7',
          textColor: '#2F2F2F',
          fontFamily: 'Montserrat, sans-serif',
        },
        settings: {
          layout: 'portfolio-grid',
          lightbox: true,
        },
        animations: {
          ...defaultAnimations,
          pageTransition: 'fade',
          scrollAnimation: 'parallax',
          buttonHover: 'lift',
        },
        optimizations: defaultOptimizations,
        accessibility: defaultAccessibility,
      },
      features: ['Project Gallery', 'About Section', 'Contact Form', 'Social Links'],
      tags: ['portfolio', 'creative', 'design', 'artist'],
      isPremium: false,
      usageCount: 1765,
      rating: 4.7,
      performanceScore: 90,
      mobileOptimized: true,
      aiTips: [
        {
          id: 'portfolio-creative-tip-1',
          category: 'design',
          title: 'Showcase Best Work First',
          description: 'Lead with your 5 strongest projects. First impression drives 70% of hiring decisions.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'portfolio-creative-tip-2',
          category: 'content',
          title: 'Add Case Studies',
          description: 'Include problem-solution-result format for 3-5 projects to demonstrate impact.',
          impact: 'high',
          difficulty: 'medium',
          implementable: true,
        },
        {
          id: 'portfolio-creative-tip-3',
          category: 'seo',
          title: 'Optimize Alt Text',
          description: 'Add descriptive alt text to all portfolio images for SEO and accessibility.',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'portfolio-creative-tip-4',
          category: 'engagement',
          title: 'Enable Project Filtering',
          description: 'Let visitors filter by project type, industry, or skill to find relevant work faster.',
          impact: 'medium',
          difficulty: 'medium',
          implementable: true,
        },
        {
          id: 'portfolio-creative-tip-5',
          category: 'performance',
          title: 'Use Image Lazy Loading',
          description: 'Load portfolio images progressively as users scroll, improving speed by 40%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'linktree-bio',
      name: 'Link in Bio',
      description: 'Simple and effective link aggregation page',
      category: 'Social',
      industry: 'General',
      thumbnail: '/templates/linktree-bio.jpg',
      structure: {
        pages: [
          {
            type: 'profile',
            title: 'Profile',
            content: {
              avatar: '',
              name: 'Your Name',
              bio: 'Your bio here',
              socialIcons: [],
            },
            order: 0,
          },
          {
            type: 'links',
            title: 'Links',
            content: {
              links: [
                { title: 'My Website', url: '', icon: 'globe' },
                { title: 'YouTube', url: '', icon: 'youtube' },
                { title: 'Instagram', url: '', icon: 'instagram' },
              ],
              style: 'rounded',
            },
            order: 1,
          },
        ],
        theme: {
          primaryColor: '#8B5CF6',
          secondaryColor: '#EC4899',
          backgroundColor: '#0F172A',
          textColor: '#F1F5F9',
          fontFamily: 'DM Sans, sans-serif',
        },
        settings: {
          layout: 'centered',
          animation: 'slide-up',
        },
        animations: {
          ...defaultAnimations,
          pageTransition: 'fade',
          scrollAnimation: 'fade-up',
          buttonHover: 'lift',
        },
        optimizations: defaultOptimizations,
        accessibility: defaultAccessibility,
      },
      features: ['Profile Section', 'Link Buttons', 'Social Icons', 'Click Analytics'],
      tags: ['linktree', 'social', 'bio', 'links'],
      isPremium: false,
      usageCount: 5892,
      rating: 4.9,
      performanceScore: 95,
      mobileOptimized: true,
      aiTips: [
        {
          id: 'linktree-bio-tip-1',
          category: 'content',
          title: 'Prioritize Top 3-5 Links',
          description: 'Most users only click the first 3 links. Put most important links at the top.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'linktree-bio-tip-2',
          category: 'design',
          title: 'Add Custom Profile Photo',
          description: 'Pages with photos get 40% more clicks. Use high-quality headshot or logo.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'linktree-bio-tip-3',
          category: 'engagement',
          title: 'Use Action-Oriented CTAs',
          description: 'Replace "Link" with "Shop Now", "Watch Video", "Get Free Guide" for 25% more clicks.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'linktree-bio-tip-4',
          category: 'seo',
          title: 'Optimize Bio Description',
          description: 'Include keywords and your unique value prop in bio for discoverability.',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'linktree-bio-tip-5',
          category: 'performance',
          title: 'Enable Link Prefetching',
          description: 'Preload linked pages for instant navigation, improving user experience.',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ecommerce-store',
      name: 'E-commerce Store',
      description: 'Complete online store with product catalog and checkout',
      category: 'E-commerce',
      industry: 'Retail',
      thumbnail: '/templates/ecommerce-store.jpg',
      structure: {
        pages: [
          {
            type: 'hero',
            title: 'Store Header',
            content: {
              heading: 'Welcome to Our Store',
              subheading: 'Discover amazing products',
              ctaText: 'Shop Now',
              ctaLink: '#products',
              backgroundImage: '',
            },
            order: 0,
          },
          {
            type: 'products',
            title: 'Products',
            content: {
              layout: 'grid',
              categories: ['All', 'New Arrivals', 'Best Sellers', 'Sale'],
              products: [],
              showFilters: true,
            },
            order: 1,
          },
          {
            type: 'cart',
            title: 'Shopping Cart',
            content: {
              allowGuestCheckout: true,
              paymentMethods: ['card', 'paypal', 'apple-pay'],
              shippingOptions: ['standard', 'express'],
            },
            order: 2,
          },
          {
            type: 'testimonials',
            title: 'Reviews',
            content: {
              testimonials: [],
              showRatings: true,
            },
            order: 3,
          },
        ],
        theme: {
          primaryColor: '#2563EB',
          secondaryColor: '#F59E0B',
          backgroundColor: '#FFFFFF',
          textColor: '#1F2937',
          fontFamily: 'Inter, sans-serif',
        },
        settings: {
          layout: 'ecommerce',
          enableCart: true,
          enableWishlist: true,
        },
        animations: {
          ...defaultAnimations,
          pageTransition: 'slide',
          scrollAnimation: 'fade-up',
          buttonHover: 'scale',
        },
        optimizations: defaultOptimizations,
        accessibility: defaultAccessibility,
      },
      features: ['Product Catalog', 'Shopping Cart', 'Payment Integration', 'Order Tracking', 'Reviews'],
      tags: ['ecommerce', 'store', 'shop', 'products', 'retail'],
      isPremium: true,
      usageCount: 3241,
      rating: 4.8,
      performanceScore: 89,
      mobileOptimized: true,
      aiTips: [
        {
          id: 'ecommerce-store-tip-1',
          category: 'design',
          title: 'Show Trust Badges',
          description: 'Display security badges, reviews, and guarantees to reduce cart abandonment by 30%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'ecommerce-store-tip-2',
          category: 'content',
          title: 'Add Product Videos',
          description: 'Products with videos have 85% higher conversion rates than static images.',
          impact: 'high',
          difficulty: 'medium',
          implementable: true,
        },
        {
          id: 'ecommerce-store-tip-3',
          category: 'engagement',
          title: 'Enable Live Chat',
          description: 'Real-time support increases conversions by 20% and reduces returns.',
          impact: 'high',
          difficulty: 'hard',
          implementable: false,
        },
        {
          id: 'ecommerce-store-tip-4',
          category: 'seo',
          title: 'Optimize Product Titles',
          description: 'Include brand, product type, and key features in titles for better search rankings.',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'ecommerce-store-tip-5',
          category: 'performance',
          title: 'Optimize Checkout Flow',
          description: 'Reduce checkout to 3 steps or less to decrease cart abandonment by 35%.',
          impact: 'high',
          difficulty: 'medium',
          implementable: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'influencer-media-kit',
      name: 'Influencer Media Kit',
      description: 'Professional media kit for content creators and influencers',
      category: 'Creator',
      industry: 'Social Media',
      thumbnail: '/templates/influencer-media-kit.jpg',
      structure: {
        pages: [
          {
            type: 'profile',
            title: 'About Me',
            content: {
              avatar: '',
              name: 'Your Name',
              tagline: 'Content Creator & Influencer',
              bio: '',
              socialStats: {
                instagram: 0,
                youtube: 0,
                tiktok: 0,
                twitter: 0,
              },
            },
            order: 0,
          },
          {
            type: 'statistics',
            title: 'Statistics',
            content: {
              metrics: [
                { label: 'Total Followers', value: '0' },
                { label: 'Engagement Rate', value: '0%' },
                { label: 'Average Views', value: '0' },
                { label: 'Content Reach', value: '0' },
              ],
              charts: true,
            },
            order: 1,
          },
          {
            type: 'portfolio',
            title: 'Past Work',
            content: {
              campaigns: [],
              brands: [],
              showCase: true,
            },
            order: 2,
          },
          {
            type: 'services',
            title: 'Services & Rates',
            content: {
              services: [
                { name: 'Instagram Post', price: '$500', description: '1 post + story' },
                { name: 'YouTube Integration', price: '$1,500', description: '60-90 sec integration' },
                { name: 'Brand Partnership', price: 'Custom', description: 'Long-term collaboration' },
              ],
            },
            order: 3,
          },
          {
            type: 'contact',
            title: 'Work With Me',
            content: {
              email: '',
              calendly: '',
              preferredContact: 'email',
            },
            order: 4,
          },
        ],
        theme: {
          primaryColor: '#E11D48',
          secondaryColor: '#F472B6',
          backgroundColor: '#FAFAFA',
          textColor: '#18181B',
          fontFamily: 'Poppins, sans-serif',
        },
        settings: {
          layout: 'media-kit',
          showSocialProof: true,
          enableBooking: true,
        },
        animations: {
          ...defaultAnimations,
          pageTransition: 'slide',
          scrollAnimation: 'fade-up',
          buttonHover: 'glow',
        },
        optimizations: defaultOptimizations,
        accessibility: defaultAccessibility,
      },
      features: ['Social Stats', 'Portfolio Showcase', 'Rate Card', 'Booking Calendar', 'Brand Collaborations'],
      tags: ['influencer', 'creator', 'media-kit', 'social-media', 'brand-deals'],
      isPremium: true,
      usageCount: 4156,
      rating: 4.9,
      performanceScore: 92,
      mobileOptimized: true,
      aiTips: [
        {
          id: 'influencer-media-kit-tip-1',
          category: 'content',
          title: 'Lead with Your Numbers',
          description: 'Show follower count, engagement rate, and reach stats prominently. Data drives partnerships.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'influencer-media-kit-tip-2',
          category: 'design',
          title: 'Add Brand Collaboration Logos',
          description: 'Display logos of brands you\'ve worked with to build credibility and trust.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'influencer-media-kit-tip-3',
          category: 'engagement',
          title: 'Include Rate Card',
          description: 'Be transparent about pricing for sponsored posts, stories, and packages.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'influencer-media-kit-tip-4',
          category: 'content',
          title: 'Showcase Best Performing Content',
          description: 'Feature 3-5 top posts with engagement metrics to demonstrate your impact.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'influencer-media-kit-tip-5',
          category: 'seo',
          title: 'Optimize for Your Niche',
          description: 'Include niche-specific keywords like "Beauty Influencer" or "Tech Reviewer" in headings.',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'photographer-portfolio',
      name: 'Photographer Portfolio',
      description: 'Stunning full-screen photography portfolio',
      category: 'Portfolio',
      industry: 'Photography',
      thumbnail: '/templates/photographer-portfolio.jpg',
      structure: {
        pages: [
          {
            type: 'hero',
            title: 'Hero',
            content: {
              fullscreenImage: '',
              logo: '',
              tagline: 'Capturing Moments, Creating Memories',
              scrollIndicator: true,
            },
            order: 0,
          },
          {
            type: 'gallery',
            title: 'Portfolio',
            content: {
              layout: 'masonry',
              categories: ['All', 'Weddings', 'Portraits', 'Events', 'Commercial'],
              images: [],
              lightbox: true,
              autoplay: false,
            },
            order: 1,
          },
          {
            type: 'services',
            title: 'Services',
            content: {
              services: [
                { name: 'Wedding Photography', description: 'Full day coverage', price: 'From $2,500' },
                { name: 'Portrait Session', description: '1-hour session', price: 'From $350' },
                { name: 'Event Coverage', description: 'Corporate & private events', price: 'Custom' },
              ],
            },
            order: 2,
          },
          {
            type: 'testimonials',
            title: 'Testimonials',
            content: {
              testimonials: [],
              showPhotos: true,
            },
            order: 3,
          },
          {
            type: 'contact',
            title: 'Book a Session',
            content: {
              email: '',
              phone: '',
              instagram: '',
              bookingForm: true,
            },
            order: 4,
          },
        ],
        theme: {
          primaryColor: '#000000',
          secondaryColor: '#D4AF37',
          backgroundColor: '#FFFFFF',
          textColor: '#1A1A1A',
          fontFamily: 'Cormorant Garamond, serif',
        },
        settings: {
          layout: 'full-screen',
          imageQuality: 'high',
          enableWatermark: true,
        },
        animations: {
          ...defaultAnimations,
          pageTransition: 'fade',
          scrollAnimation: 'parallax',
          buttonHover: 'shine',
        },
        optimizations: defaultOptimizations,
        accessibility: defaultAccessibility,
      },
      features: ['Full-Screen Gallery', 'Masonry Layout', 'Lightbox View', 'Service Packages', 'Booking Form'],
      tags: ['photography', 'portfolio', 'visual', 'gallery', 'photographer'],
      isPremium: true,
      usageCount: 2789,
      rating: 4.9,
      performanceScore: 91,
      mobileOptimized: true,
      aiTips: [
        {
          id: 'photographer-portfolio-tip-1',
          category: 'design',
          title: 'Use Fullscreen Gallery',
          description: 'Let images shine with edge-to-edge display. Increases time on page by 60%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'photographer-portfolio-tip-2',
          category: 'content',
          title: 'Add Photo Captions',
          description: 'Include location, camera settings, or story behind the shot for engagement.',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'photographer-portfolio-tip-3',
          category: 'engagement',
          title: 'Enable Lightbox View',
          description: 'Let visitors view full-resolution images without leaving the page.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'photographer-portfolio-tip-4',
          category: 'seo',
          title: 'Optimize Image Metadata',
          description: 'Add EXIF data, location tags, and alt text for better search visibility.',
          impact: 'medium',
          difficulty: 'medium',
          implementable: true,
        },
        {
          id: 'photographer-portfolio-tip-5',
          category: 'performance',
          title: 'Use Progressive JPEGs',
          description: 'Images load gradually from low to high quality, improving perceived speed by 40%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'wedding-event',
      name: 'Wedding & Special Events',
      description: 'Beautiful wedding website with RSVP and registry',
      category: 'Events',
      industry: 'Wedding',
      thumbnail: '/templates/wedding-event.jpg',
      structure: {
        pages: [
          {
            type: 'hero',
            title: 'Cover',
            content: {
              coupleNames: 'John & Jane',
              weddingDate: '2026-06-15',
              location: 'Napa Valley, CA',
              coverPhoto: '',
              countdown: true,
            },
            order: 0,
          },
          {
            type: 'story',
            title: 'Our Story',
            content: {
              timeline: [
                { year: '2020', title: 'First Met', description: '' },
                { year: '2024', title: 'The Proposal', description: '' },
                { year: '2026', title: 'Our Wedding', description: '' },
              ],
              photos: [],
            },
            order: 1,
          },
          {
            type: 'schedule',
            title: 'Event Schedule',
            content: {
              events: [
                { time: '3:00 PM', title: 'Ceremony', location: 'Garden Chapel' },
                { time: '5:00 PM', title: 'Cocktail Hour', location: 'Terrace' },
                { time: '6:30 PM', title: 'Reception', location: 'Grand Ballroom' },
              ],
            },
            order: 2,
          },
          {
            type: 'rsvp',
            title: 'RSVP',
            content: {
              deadline: '2026-05-15',
              formFields: ['name', 'email', 'guests', 'dietary', 'message'],
              maxGuests: 2,
            },
            order: 3,
          },
          {
            type: 'registry',
            title: 'Registry',
            content: {
              registries: [
                { name: 'Amazon', url: '', icon: 'amazon' },
                { name: 'Target', url: '', icon: 'target' },
                { name: 'Honeymoon Fund', url: '', icon: 'heart' },
              ],
            },
            order: 4,
          },
          {
            type: 'gallery',
            title: 'Photo Gallery',
            content: {
              photos: [],
              allowGuestUploads: true,
            },
            order: 5,
          },
        ],
        theme: {
          primaryColor: '#C9A96E',
          secondaryColor: '#8B7355',
          backgroundColor: '#FFF9F5',
          textColor: '#3E3E3E',
          fontFamily: 'Italiana, serif',
        },
        settings: {
          layout: 'romantic',
          enableRSVP: true,
          enableGuestPhotos: true,
        },
        animations: {
          ...defaultAnimations,
          pageTransition: 'fade',
          scrollAnimation: 'fade-up',
          buttonHover: 'lift',
        },
        optimizations: defaultOptimizations,
        accessibility: defaultAccessibility,
      },
      features: ['Countdown Timer', 'RSVP Management', 'Registry Links', 'Guest Photo Upload', 'Event Schedule'],
      tags: ['wedding', 'marriage', 'celebration', 'event', 'rsvp'],
      isPremium: false,
      usageCount: 6234,
      rating: 5.0,
      performanceScore: 94,
      mobileOptimized: true,
      aiTips: [
        {
          id: 'wedding-event-tip-1',
          category: 'design',
          title: 'Add Romantic Couple Photo',
          description: 'Hero section with engagement photo increases RSVP rate by 45%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'wedding-event-tip-2',
          category: 'content',
          title: 'Include Love Story Timeline',
          description: 'Share "How We Met" story to personalize the experience and boost engagement.',
          impact: 'medium',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'wedding-event-tip-3',
          category: 'engagement',
          title: 'Enable Digital RSVP',
          description: 'Replace paper RSVPs with online form. Increases response rate from 60% to 90%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'wedding-event-tip-4',
          category: 'content',
          title: 'Add Registry Links',
          description: 'Make gift-giving easy with direct links to registries. Include multiple options.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'wedding-event-tip-5',
          category: 'performance',
          title: 'Optimize for Mobile',
          description: '70% of guests will visit on mobile. Ensure images and text are mobile-friendly.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'real-estate-agent',
      name: 'Real Estate Agent',
      description: 'Professional real estate agent profile with listings',
      category: 'Business',
      industry: 'Real Estate',
      thumbnail: '/templates/real-estate-agent.jpg',
      structure: {
        pages: [
          {
            type: 'hero',
            title: 'Agent Profile',
            content: {
              photo: '',
              name: 'Your Name',
              title: 'Realtor & Property Consultant',
              tagline: 'Helping You Find Your Dream Home',
              credentials: ['Licensed Agent', '500+ Homes Sold'],
            },
            order: 0,
          },
          {
            type: 'listings',
            title: 'Featured Listings',
            content: {
              properties: [],
              filters: ['For Sale', 'For Rent', 'Sold'],
              showMap: true,
            },
            order: 1,
          },
          {
            type: 'services',
            title: 'Services',
            content: {
              services: [
                { icon: 'home', title: 'Buyer Representation', description: 'Find your perfect home' },
                { icon: 'dollar', title: 'Seller Representation', description: 'Sell for top dollar' },
                { icon: 'chart', title: 'Market Analysis', description: 'Free home valuation' },
              ],
            },
            order: 2,
          },
          {
            type: 'testimonials',
            title: 'Client Reviews',
            content: {
              testimonials: [],
              showRatings: true,
            },
            order: 3,
          },
          {
            type: 'contact',
            title: 'Contact Me',
            content: {
              phone: '',
              email: '',
              office: '',
              formFields: ['name', 'email', 'phone', 'propertyType', 'message'],
            },
            order: 4,
          },
        ],
        theme: {
          primaryColor: '#0F766E',
          secondaryColor: '#F59E0B',
          backgroundColor: '#FFFFFF',
          textColor: '#0F172A',
          fontFamily: 'Lato, sans-serif',
        },
        settings: {
          layout: 'professional',
          enableIDXIntegration: true,
          showMarketStats: true,
        },
        animations: {
          ...defaultAnimations,
          pageTransition: 'slide',
          scrollAnimation: 'fade-up',
          buttonHover: 'lift',
        },
        optimizations: defaultOptimizations,
        accessibility: defaultAccessibility,
      },
      features: ['Property Listings', 'MLS Integration', 'Virtual Tours', 'Market Stats', 'Lead Capture'],
      tags: ['real-estate', 'realtor', 'property', 'listings', 'agent'],
      isPremium: true,
      usageCount: 1567,
      rating: 4.7,
      performanceScore: 87,
      mobileOptimized: true,
      aiTips: [
        {
          id: 'real-estate-agent-tip-1',
          category: 'design',
          title: 'Add Professional Headshot',
          description: 'Agents with professional photos get 60% more inquiries than those without.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'real-estate-agent-tip-2',
          category: 'content',
          title: 'Highlight Recent Sales',
          description: 'Showcase 5-10 recent sold properties with before/after or sold price to build credibility.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'real-estate-agent-tip-3',
          category: 'engagement',
          title: 'Add Virtual Tour Links',
          description: 'Include 3D walkthroughs or video tours. Properties with tours get 87% more views.',
          impact: 'high',
          difficulty: 'medium',
          implementable: true,
        },
        {
          id: 'real-estate-agent-tip-4',
          category: 'seo',
          title: 'Optimize for Local Search',
          description: 'Include city, neighborhoods, and "real estate agent" in headings and titles.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
        {
          id: 'real-estate-agent-tip-5',
          category: 'content',
          title: 'Display Client Testimonials',
          description: 'Feature 3-5 reviews with photos. Reviews increase trust and lead generation by 50%.',
          impact: 'high',
          difficulty: 'easy',
          implementable: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  builtInTemplates.forEach((template) => templates.set(template.id, template));
}

initializeTemplates();

export default async function templateRoutes(fastify: FastifyInstance) {
  
  // 1. Get all templates with filtering
  fastify.get<{
    Querystring: {
      category?: string;
      industry?: string;
      isPremium?: string;
      search?: string;
      sortBy?: 'popular' | 'rating' | 'recent';
      limit?: string;
    };
  }>('/templates', async (request, reply) => {
    const { category, industry, isPremium, search, sortBy = 'popular', limit = '50' } = request.query;

    let filteredTemplates = Array.from(templates.values());

    // Apply filters
    if (category) {
      filteredTemplates = filteredTemplates.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }
    if (industry) {
      filteredTemplates = filteredTemplates.filter((t) => t.industry.toLowerCase() === industry.toLowerCase());
    }
    if (isPremium !== undefined) {
      filteredTemplates = filteredTemplates.filter((t) => t.isPremium === (isPremium === 'true'));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.tags.some((tag) => tag.includes(searchLower))
      );
    }

    // Apply sorting
    if (sortBy === 'popular') {
      filteredTemplates.sort((a, b) => b.usageCount - a.usageCount);
    } else if (sortBy === 'rating') {
      filteredTemplates.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'recent') {
      filteredTemplates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Apply limit
    const limitNum = parseInt(limit);
    filteredTemplates = filteredTemplates.slice(0, limitNum);

    return {
      templates: filteredTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        industry: t.industry,
        thumbnail: t.thumbnail,
        features: t.features,
        tags: t.tags,
        isPremium: t.isPremium,
        usageCount: t.usageCount,
        rating: t.rating,
      })),
      total: filteredTemplates.length,
      filters: { category, industry, isPremium, search, sortBy },
    };
  });

  // 2. Get template by ID
  fastify.get<{
    Params: { templateId: string };
  }>('/templates/:templateId', async (request, reply) => {
    const { templateId } = request.params;
    const template = templates.get(templateId);

    if (!template) {
      return reply.status(404).send({
        error: 'Template not found',
        templateId,
      });
    }

    return template;
  });

  // 3. Get template categories
  fastify.get('/templates/meta/categories', async (request, reply) => {
    const allTemplates = Array.from(templates.values());
    const categories = [...new Set(allTemplates.map((t) => t.category))];
    const industries = [...new Set(allTemplates.map((t) => t.industry))];

    const categoryStats = categories.map((cat) => ({
      name: cat,
      count: allTemplates.filter((t) => t.category === cat).length,
      avgRating: (
        allTemplates.filter((t) => t.category === cat).reduce((sum, t) => sum + t.rating, 0) /
        allTemplates.filter((t) => t.category === cat).length
      ).toFixed(1),
    }));

    return {
      categories: categoryStats,
      industries,
      totalTemplates: allTemplates.length,
      premiumTemplates: allTemplates.filter((t) => t.isPremium).length,
    };
  });

  // 4. Use template (create microsite from template)
  fastify.post<{
    Body: {
      templateId: string;
      micrositeName: string;
      customizations?: {
        theme?: Partial<Template['structure']['theme']>;
        content?: Record<string, any>;
      };
    };
  }>('/templates/use', async (request, reply) => {
    const { templateId, micrositeName, customizations } = request.body;
    const template = templates.get(templateId);

    if (!template) {
      return reply.status(404).send({
        error: 'Template not found',
        templateId,
      });
    }

    // Clone template structure
    const micrositeStructure = JSON.parse(JSON.stringify(template.structure));

    // Apply customizations
    if (customizations?.theme) {
      Object.assign(micrositeStructure.theme, customizations.theme);
    }
    if (customizations?.content) {
      // Apply content customizations to pages
      Object.keys(customizations.content).forEach((pageType) => {
        const page = micrositeStructure.pages.find((p: TemplateBlock) => p.type === pageType);
        if (page) {
          Object.assign(page.content, customizations.content![pageType]);
        }
      });
    }

    // Increment usage count
    template.usageCount++;
    templates.set(templateId, template);

    const micrositeId = `site_${Math.random().toString(36).substring(7)}`;

    return {
      micrositeId,
      name: micrositeName,
      templateId,
      structure: micrositeStructure,
      message: 'Microsite created from template successfully',
      previewUrl: `/preview/${micrositeId}`,
    };
  });

  // 5. Save custom template
  fastify.post<{
    Body: {
      userId: string;
      name: string;
      description: string;
      structure: Template['structure'];
      isPublic?: boolean;
    };
  }>('/templates/custom/save', async (request, reply) => {
    const { userId, name, description, structure, isPublic = false } = request.body;

    const customTemplateId = `custom_${Math.random().toString(36).substring(7)}`;

    const customTemplate: CustomTemplate = {
      id: customTemplateId,
      userId,
      name,
      description,
      isPublic,
      structure,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    customTemplates.set(customTemplateId, customTemplate);

    return {
      ...customTemplate,
      message: 'Custom template saved successfully',
    };
  });

  // 6. Get user's custom templates
  fastify.get<{
    Params: { userId: string };
  }>('/templates/custom/user/:userId', async (request, reply) => {
    const { userId } = request.params;

    const userTemplates = Array.from(customTemplates.values()).filter((t) => t.userId === userId);

    return {
      templates: userTemplates,
      count: userTemplates.length,
    };
  });

  // 7. AI-powered template recommendation
  fastify.post<{
    Body: {
      industry?: string;
      purpose?: string;
      targetAudience?: string;
      preferredStyle?: string;
      features?: string[];
    };
  }>('/templates/recommend', async (request, reply) => {
    const { industry, purpose, targetAudience, preferredStyle, features = [] } = request.body;

    if (!process.env.OPENAI_API_KEY) {
      // Fallback: rule-based recommendation
      let recommended = Array.from(templates.values());

      if (industry) {
        recommended = recommended.filter((t) => t.industry.toLowerCase().includes(industry.toLowerCase()));
      }
      if (features.length > 0) {
        recommended = recommended.filter((t) =>
          features.some((f) => t.features.some((tf) => tf.toLowerCase().includes(f.toLowerCase())))
        );
      }

      recommended.sort((a, b) => b.rating - a.rating);

      return {
        recommendations: recommended.slice(0, 5).map((t) => ({
          template: t,
          score: t.rating / 5,
          reason: 'Based on ratings and industry match',
        })),
        method: 'rule-based',
      };
    }

    try {
      const openai = await import('openai');
      const client = new openai.default({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const prompt = `Given the following requirements, recommend the best templates from this list:

Requirements:
- Industry: ${industry || 'Any'}
- Purpose: ${purpose || 'General website'}
- Target Audience: ${targetAudience || 'General public'}
- Preferred Style: ${preferredStyle || 'Modern'}
- Required Features: ${features.join(', ') || 'None specified'}

Available Templates:
${Array.from(templates.values())
  .map(
    (t) => `
- ${t.name} (${t.category})
  Description: ${t.description}
  Features: ${t.features.join(', ')}
  Rating: ${t.rating}/5
  Industry: ${t.industry}
`
  )
  .join('\n')}

Recommend the top 3 templates and explain why they're good fits. Return as JSON array with: templateName, score (0-1), reason.`;

      const completion = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful template recommendation assistant. Analyze user requirements and recommend the most suitable templates.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      const recommendationsText = completion.choices[0]?.message?.content || '[]';
      const recommendations = JSON.parse(recommendationsText);

      // Map template names to full template objects
      const enrichedRecommendations = recommendations.map((rec: any) => {
        const template = Array.from(templates.values()).find(
          (t) => t.name.toLowerCase() === rec.templateName?.toLowerCase()
        );
        return {
          template,
          score: rec.score,
          reason: rec.reason,
        };
      });

      return {
        recommendations: enrichedRecommendations,
        method: 'ai-powered',
        requirements: { industry, purpose, targetAudience, preferredStyle, features },
      };
    } catch (error: any) {
      return reply.status(500).send({
        error: 'Recommendation failed',
        message: error.message,
      });
    }
  });

  // 8. Clone and customize template
  fastify.post<{
    Body: {
      templateId: string;
      customizations: {
        name?: string;
        theme?: Partial<Template['structure']['theme']>;
        pages?: Partial<TemplateBlock>[];
      };
    };
  }>('/templates/clone', async (request, reply) => {
    const { templateId, customizations } = request.body;
    const template = templates.get(templateId);

    if (!template) {
      return reply.status(404).send({
        error: 'Template not found',
      });
    }

    const clonedStructure = JSON.parse(JSON.stringify(template.structure));

    // Apply theme customizations
    if (customizations.theme) {
      Object.assign(clonedStructure.theme, customizations.theme);
    }

    // Apply page customizations
    if (customizations.pages) {
      customizations.pages.forEach((customPage) => {
        const existingPage = clonedStructure.pages.find((p: TemplateBlock) => p.type === customPage.type);
        if (existingPage) {
          Object.assign(existingPage, customPage);
        }
      });
    }

    return {
      name: customizations.name || `${template.name} (Copy)`,
      originalTemplateId: templateId,
      structure: clonedStructure,
      message: 'Template cloned successfully',
    };
  });

  // 9. Rate template
  fastify.post<{
    Body: {
      templateId: string;
      rating: number;
      review?: string;
    };
  }>('/templates/rate', async (request, reply) => {
    const { templateId, rating, review } = request.body;

    if (rating < 1 || rating > 5) {
      return reply.status(400).send({
        error: 'Rating must be between 1 and 5',
      });
    }

    const template = templates.get(templateId);
    if (!template) {
      return reply.status(404).send({
        error: 'Template not found',
      });
    }

    // Simple average (in production, store individual ratings)
    const newRating = (template.rating * template.usageCount + rating) / (template.usageCount + 1);
    template.rating = Math.round(newRating * 10) / 10;

    templates.set(templateId, template);

    return {
      templateId,
      newRating: template.rating,
      message: 'Thank you for your rating!',
    };
  });

  // 10. Get popular templates
  fastify.get('/templates/popular/top', async (request, reply) => {
    const popularTemplates = Array.from(templates.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    return {
      templates: popularTemplates,
      total: popularTemplates.length,
    };
  });
}
