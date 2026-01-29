import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      userId: string;
      organizationId: string;
      email?: string;
      name?: string;
      role?: string;
    };
  }
}
