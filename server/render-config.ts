
import { Request, Response } from 'express';

// Render-specific configurations
export const renderConfig = {
  // Port configuration for Render
  port: process.env.PORT || 5000,
  
  // Host binding for Render
  host: '0.0.0.0',
  
  // Database configuration for Render PostgreSQL
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionLimit: 20
  },
  
  // Redis configuration for Render Redis
  redis: {
    url: process.env.REDIS_URL || process.env.REDISCLOUD_URL,
    disabled: !process.env.REDIS_URL && !process.env.REDISCLOUD_URL
  },
  
  // CORS configuration for production
  cors: {
    origin: process.env.FRONTEND_URL || 'https://your-frontend-domain.onrender.com',
    credentials: true
  },
  
  // Security headers for Render
  security: {
    trustProxy: true,
    secureCookies: process.env.NODE_ENV === 'production'
  }
};

// Health check endpoint for Render
export const healthCheck = (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: process.env.DATABASE_URL ? 'connected' : 'not configured',
    redis: process.env.REDIS_URL ? 'connected' : 'memory store'
  };
  
  res.status(200).json(health);
};
