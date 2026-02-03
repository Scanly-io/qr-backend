// This script will help us add IDs to all AI tips
// Running as Node script to generate the proper structure

const templateIds = [
  'restaurant-modern',
  'event-conference', 
  'product-launch',
  'portfolio-creative',
  'linktree-bio',
  'ecommerce-store',
  'influencer-media-kit',
  'photographer-portfolio',
  'wedding-event',
  'real-estate-agent'
];

templateIds.forEach(id => {
  console.log(`Template: ${id}`);
  for (let i = 0; i < 5; i++) {
    console.log(`  id: '${id}-tip-${i+1}',`);
  }
});
