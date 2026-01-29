import { verifyJWT } from '@qr/common';

export default async function zapierAuthRoute(server: any) {
  server.get('/zapier/auth', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    // Zapier uses API key authentication, not OAuth
    // In production, this would generate a unique API key for the user
    // For now, return a message indicating setup is needed
    
    const zapierClientId = process.env.ZAPIER_CLIENT_ID;
    
    if (!zapierClientId) {
      return reply.send({ 
        authUrl: null,
        message: 'Zapier integration requires configuration. Please set up your Zapier app credentials.',
        setup: 'https://developer.zapier.com/'
      });
    }
    
    // If configured, return the OAuth URL
    const redirectUri = encodeURIComponent(`${process.env.API_BASE_URL || 'http://localhost'}/integrations/zapier/callback`);
    const authUrl = `https://zapier.com/oauth/authorize?client_id=${zapierClientId}&redirect_uri=${redirectUri}&response_type=code`;
    
    return reply.send({ authUrl });
  });
}
