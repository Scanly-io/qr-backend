import pino from 'pino';

// Use simple logger without pino-pretty in production
export const logger = process.env.NODE_ENV === 'production' 
  ? pino({
      level: process.env.LOG_LEVEL || 'info',
    })
  : pino({
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
      level: process.env.LOG_LEVEL || 'info',
    });
