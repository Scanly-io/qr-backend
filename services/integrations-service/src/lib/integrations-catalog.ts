/**
 * INTEGRATIONS CATALOG
 * 
 * All supported third-party integrations organized by category
 */

export const INTEGRATION_CATEGORIES = {
  // E-COMMERCE (5)
  ECOMMERCE: {
    shopify: {
      name: 'Shopify',
      description: 'Sync products, track orders, update inventory',
      authType: 'oauth',
      icon: 'ShoppingBag', // Shopify shopping bag
      brandIcon: 'SiShopify',
      features: ['product_sync', 'order_tracking', 'inventory_management'],
      endpoints: {
        products: '/admin/api/2024-01/products.json',
        orders: '/admin/api/2024-01/orders.json',
        inventory: '/admin/api/2024-01/inventory_levels.json',
      },
    },
    woocommerce: {
      name: 'WooCommerce',
      description: 'Connect to WordPress e-commerce stores',
      authType: 'api_key',
      icon: 'ShoppingCart', // WooCommerce cart
      brandIcon: 'SiWoo',
      features: ['product_sync', 'order_tracking'],
      endpoints: {
        products: '/wp-json/wc/v3/products',
        orders: '/wp-json/wc/v3/orders',
      },
    },
    square: {
      name: 'Square',
      description: 'Point of sale and payment processing',
      authType: 'oauth',
      icon: 'CreditCard', // Square payments
      brandIcon: 'SiSquare',
      features: ['payments', 'inventory', 'customers'],
    },
    bigcommerce: {
      name: 'BigCommerce',
      description: 'Enterprise e-commerce platform',
      authType: 'oauth',
      icon: 'Store', // BigCommerce store
      brandIcon: 'SiBigcommerce',
      features: ['product_sync', 'order_tracking', 'analytics'],
    },
    ecwid: {
      name: 'Ecwid',
      description: 'E-commerce platform for small businesses',
      authType: 'oauth',
      icon: 'ShoppingBag', // Ecwid shopping
      brandIcon: 'SiEcwid',
      features: ['product_sync', 'order_tracking'],
    },
  },

  // PAYMENTS (4)
  PAYMENTS: {
    stripe: {
      name: 'Stripe',
      description: 'Online payment processing',
      authType: 'oauth',
      icon: 'CreditCard', // Stripe payments
      brandIcon: 'SiStripe',
      features: ['payments', 'subscriptions', 'invoices'],
      webhooks: ['payment.succeeded', 'subscription.created'],
    },
    paypal: {
      name: 'PayPal',
      description: 'Digital payment platform',
      authType: 'oauth',
      icon: 'Wallet', // PayPal wallet
      brandIcon: 'SiPaypal',
      features: ['payments', 'invoices', 'subscriptions'],
    },
    square_payments: {
      name: 'Square Payments',
      description: 'Square payment processing',
      authType: 'oauth',
      icon: 'CreditCard', // Square payments
      brandIcon: 'SiSquare',
      features: ['payments', 'refunds', 'customers'],
    },
    authorize_net: {
      name: 'Authorize.Net',
      description: 'Payment gateway',
      authType: 'api_key',
      icon: 'DollarSign', // Authorize.Net payments
      brandIcon: 'SiAuthorizedotnet',
      features: ['payments', 'recurring_billing'],
    },
  },

  // EMAIL MARKETING (5)
  EMAIL_MARKETING: {
    mailchimp: {
      name: 'Mailchimp',
      description: 'Email marketing and automation',
      authType: 'oauth',
      icon: 'Mail', // Mailchimp email
      brandIcon: 'SiMailchimp',
      features: ['lists', 'campaigns', 'automation', 'tags'],
      endpoints: {
        lists: '/3.0/lists',
        members: '/3.0/lists/{list_id}/members',
        campaigns: '/3.0/campaigns',
      },
    },
    sendgrid: {
      name: 'SendGrid',
      description: 'Transactional email service',
      authType: 'api_key',
      icon: 'Send', // SendGrid send email
      brandIcon: 'SiSendgrid',
      features: ['send_email', 'templates', 'analytics'],
    },
    mailgun: {
      name: 'Mailgun',
      description: 'Email automation service',
      authType: 'api_key',
      icon: 'Mailbox', // Mailgun mailbox
      brandIcon: 'SiMailgun',
      features: ['send_email', 'tracking', 'validation'],
    },
    constant_contact: {
      name: 'Constant Contact',
      description: 'Email marketing platform',
      authType: 'oauth',
      icon: 'AtSign', // Constant Contact
      brandIcon: 'SiConstantcontact',
      features: ['lists', 'campaigns', 'automation'],
    },
    klaviyo: {
      name: 'Klaviyo',
      description: 'E-commerce email marketing',
      authType: 'api_key',
      icon: 'MessageSquare', // Klaviyo messaging
      brandIcon: 'SiKlaviyo',
      features: ['lists', 'flows', 'campaigns', 'analytics'],
    },
  },

  // CRM (5)
  CRM: {
    hubspot: {
      name: 'HubSpot',
      description: 'CRM and marketing automation',
      authType: 'oauth',
      icon: 'Users', // HubSpot CRM
      brandIcon: 'SiHubspot',
      features: ['contacts', 'deals', 'companies', 'tickets'],
      endpoints: {
        contacts: '/crm/v3/objects/contacts',
        deals: '/crm/v3/objects/deals',
        companies: '/crm/v3/objects/companies',
      },
    },
    salesforce: {
      name: 'Salesforce',
      description: 'Enterprise CRM platform',
      authType: 'oauth',
      icon: 'Cloud', // Salesforce cloud
      brandIcon: 'SiSalesforce',
      features: ['leads', 'opportunities', 'accounts', 'contacts'],
    },
    pipedrive: {
      name: 'Pipedrive',
      description: 'Sales CRM',
      authType: 'api_key',
      icon: 'TrendingUp', // Pipedrive sales pipeline
      brandIcon: 'SiPipedrive',
      features: ['deals', 'contacts', 'organizations', 'activities'],
    },
    zoho_crm: {
      name: 'Zoho CRM',
      description: 'Cloud-based CRM',
      authType: 'oauth',
      icon: 'Briefcase', // Zoho business
      brandIcon: 'SiZoho',
      features: ['leads', 'contacts', 'accounts', 'deals'],
    },
    active_campaign: {
      name: 'ActiveCampaign',
      description: 'CRM and marketing automation',
      authType: 'api_key',
      icon: 'Target', // ActiveCampaign targeting
      brandIcon: 'SiActivecampaign',
      features: ['contacts', 'deals', 'automation', 'email'],
    },
  },

  // COMMUNICATION (4)
  COMMUNICATION: {
    slack: {
      name: 'Slack',
      description: 'Team messaging and notifications',
      authType: 'oauth',
      icon: 'MessageCircle', // Slack messaging
      brandIcon: 'SiSlack',
      features: ['messages', 'channels', 'notifications'],
      endpoints: {
        postMessage: '/api/chat.postMessage',
        channels: '/api/conversations.list',
      },
    },
    discord: {
      name: 'Discord',
      description: 'Community chat platform',
      authType: 'webhook',
      icon: 'MessageSquare', // Discord chat
      brandIcon: 'SiDiscord',
      features: ['messages', 'embeds', 'notifications'],
    },
    twilio: {
      name: 'Twilio',
      description: 'SMS and voice messaging',
      authType: 'api_key',
      icon: 'Phone', // Twilio phone/SMS
      brandIcon: 'SiTwilio',
      features: ['sms', 'voice', 'whatsapp'],
    },
    telegram: {
      name: 'Telegram',
      description: 'Messaging platform',
      authType: 'api_key',
      icon: 'Send', // Telegram messaging
      brandIcon: 'SiTelegram',
      features: ['messages', 'bots', 'channels'],
    },
  },

  // ANALYTICS (3)
  ANALYTICS: {
    google_analytics: {
      name: 'Google Analytics',
      description: 'Web analytics platform',
      authType: 'oauth',
      icon: 'BarChart3', // Google Analytics charts
      brandIcon: 'SiGoogleanalytics',
      features: ['events', 'pageviews', 'conversions'],
    },
    mixpanel: {
      name: 'Mixpanel',
      description: 'Product analytics',
      authType: 'api_key',
      icon: 'LineChart', // Mixpanel analytics
      brandIcon: 'SiMixpanel',
      features: ['events', 'user_profiles', 'funnels'],
    },
    amplitude: {
      name: 'Amplitude',
      description: 'Digital analytics platform',
      authType: 'api_key',
      icon: 'Activity', // Amplitude activity
      brandIcon: 'SiAmplitude',
      features: ['events', 'user_properties', 'cohorts'],
    },
  },

  // SPREADSHEETS (2)
  SPREADSHEETS: {
    google_sheets: {
      name: 'Google Sheets',
      description: 'Cloud-based spreadsheets',
      authType: 'oauth',
      icon: 'Table', // Google Sheets table
      brandIcon: 'SiGooglesheets',
      features: ['read', 'write', 'append', 'update'],
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    },
    airtable: {
      name: 'Airtable',
      description: 'Spreadsheet-database hybrid',
      authType: 'api_key',
      icon: 'Database', // Airtable database
      brandIcon: 'SiAirtable',
      features: ['records', 'bases', 'tables'],
    },
  },

  // AUTOMATION (3)
  AUTOMATION: {
    zapier: {
      name: 'Zapier',
      description: 'Connect 5,000+ apps',
      authType: 'webhook',
      icon: 'Zap', // Zapier automation
      brandIcon: 'SiZapier',
      features: ['triggers', 'actions', 'webhooks'],
    },
    make: {
      name: 'Make (Integromat)',
      description: 'Visual automation platform',
      authType: 'webhook',
      icon: 'Workflow', // Make workflows
      brandIcon: 'SiMake',
      features: ['scenarios', 'modules', 'webhooks'],
    },
    n8n: {
      name: 'n8n',
      description: 'Workflow automation',
      authType: 'webhook',
      icon: 'GitBranch', // n8n workflows
      brandIcon: 'SiN8n',
      features: ['workflows', 'nodes', 'webhooks'],
    },
  },

  // SOCIAL MEDIA (4)
  SOCIAL_MEDIA: {
    facebook: {
      name: 'Facebook',
      description: 'Social media platform',
      authType: 'oauth',
      icon: 'Share2', // Facebook sharing
      brandIcon: 'SiFacebook',
      features: ['posts', 'ads', 'insights', 'leads'],
    },
    instagram: {
      name: 'Instagram',
      description: 'Photo sharing platform',
      authType: 'oauth',
      icon: 'Camera', // Instagram photos
      brandIcon: 'SiInstagram',
      features: ['posts', 'stories', 'insights'],
    },
    twitter: {
      name: 'Twitter/X',
      description: 'Social media platform',
      authType: 'oauth',
      icon: 'MessageCircle', // Twitter/X posts
      brandIcon: 'SiX',
      features: ['tweets', 'mentions', 'analytics'],
    },
    linkedin: {
      name: 'LinkedIn',
      description: 'Professional networking',
      authType: 'oauth',
      icon: 'Briefcase', // LinkedIn professional
      brandIcon: 'SiLinkedin',
      features: ['posts', 'company_pages', 'analytics'],
    },
  },

  // CALENDAR & SCHEDULING (3)
  CALENDAR: {
    google_calendar: {
      name: 'Google Calendar',
      description: 'Calendar and scheduling',
      authType: 'oauth',
      icon: 'Calendar', // Google Calendar
      brandIcon: 'SiGooglecalendar',
      features: ['events', 'calendars', 'reminders'],
    },
    calendly: {
      name: 'Calendly',
      description: 'Meeting scheduling',
      authType: 'oauth',
      icon: 'CalendarCheck', // Calendly booking
      brandIcon: 'SiCalendly',
      features: ['events', 'invites', 'cancellations'],
    },
    outlook: {
      name: 'Microsoft Outlook',
      description: 'Email and calendar',
      authType: 'oauth',
      icon: 'Mail', // Outlook email
      brandIcon: 'SiMicrosoftoutlook',
      features: ['email', 'calendar', 'contacts'],
    },
  },

  // FORMS & SURVEYS (2)
  FORMS: {
    typeform: {
      name: 'Typeform',
      description: 'Interactive forms',
      authType: 'oauth',
      icon: 'FileText', // Typeform forms
      brandIcon: 'SiTypeform',
      features: ['forms', 'responses', 'webhooks'],
    },
    google_forms: {
      name: 'Google Forms',
      description: 'Survey and form builder',
      authType: 'oauth',
      icon: 'ClipboardList', // Google Forms
      brandIcon: 'SiGoogleforms',
      features: ['forms', 'responses'],
    },
  },

  // RESTAURANT/POS (4)
  RESTAURANT_POS: {
    toast: {
      name: 'Toast POS',
      description: 'Restaurant point of sale',
      authType: 'oauth',
      icon: 'Utensils', // Toast restaurant
      brandIcon: 'SiToast',
      features: ['orders', 'menu', 'inventory', 'payments'],
    },
    clover: {
      name: 'Clover',
      description: 'Point of sale system',
      authType: 'oauth',
      icon: 'ShoppingCart', // Clover POS
      brandIcon: 'SiClover',
      features: ['orders', 'inventory', 'customers', 'payments'],
    },
    lightspeed: {
      name: 'Lightspeed',
      description: 'Retail & restaurant POS',
      authType: 'oauth',
      icon: 'Zap', // Lightspeed fast
      brandIcon: 'SiLightspeed',
      features: ['sales', 'inventory', 'customers'],
    },
    opentable: {
      name: 'OpenTable',
      description: 'Restaurant reservations',
      authType: 'api_key',
      icon: 'BookOpen', // OpenTable reservations
      brandIcon: 'SiOpentable',
      features: ['reservations', 'availability', 'guests'],
    },
  },

  // STORAGE (2)
  STORAGE: {
    dropbox: {
      name: 'Dropbox',
      description: 'Cloud file storage',
      authType: 'oauth',
      icon: 'Cloud', // Dropbox cloud
      brandIcon: 'SiDropbox',
      features: ['files', 'folders', 'sharing'],
    },
    google_drive: {
      name: 'Google Drive',
      description: 'Cloud storage',
      authType: 'oauth',
      icon: 'HardDrive', // Google Drive storage
      brandIcon: 'SiGoogledrive',
      features: ['files', 'folders', 'permissions'],
    },
  },

  // CUSTOM (1)
  CUSTOM: {
    webhook: {
      name: 'Custom Webhook',
      description: 'Send data to any URL',
      authType: 'none',
      icon: 'Webhook', // Custom webhook
      brandIcon: 'Globe',
      features: ['http_post', 'http_get', 'custom_headers'],
    },
  },
};

// Total count by category
export const INTEGRATION_STATS = {
  ECOMMERCE: 5,
  PAYMENTS: 4,
  EMAIL_MARKETING: 5,
  CRM: 5,
  COMMUNICATION: 4,
  ANALYTICS: 3,
  SPREADSHEETS: 2,
  AUTOMATION: 3,
  SOCIAL_MEDIA: 4,
  CALENDAR: 3,
  FORMS: 2,
  RESTAURANT_POS: 4,
  STORAGE: 2,
  CUSTOM: 1,
  TOTAL: 47, // 47 integrations!
};
