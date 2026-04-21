import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'chat.db'),
  messagePageSize: 50,
  rateLimitMessages: 5,
  rateLimitWindowMs: 1000,
};
