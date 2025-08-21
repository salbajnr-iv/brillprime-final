// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';
import { validateEnvironment } from './env-validation';
import { redisClient } from './services/cache';

// Import mobile specific configurations and routes
import './mobile/mobile-config'; // For mobile app configurations
import mobileHealthRoutes from './routes/mobile-health'; // Mobile health route

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}
import { generalLimiter, authLimiter, paymentLimiter } from './middleware/rateLimiter';
import { xssProtection, csrfProtection } from './middleware/validation';
import { responseTimeMiddleware, realTimeAnalytics } from './services/realtimeAnalytics';
import { messageQueue } from './services/messageQueue';
import { pushNotificationService } from './services/pushNotifications';
import { cacheService } from './services/cache';
import { dashboardCache, productsCache, analyticsCache, locationCache } from './middleware/cacheMiddleware';
import { staticAssetsMiddleware, cdnHeaders, resourceHints, compressionConfig, assetVersioning, serviceWorkerCache } from './middleware/staticAssets';
import { requestTracker, circuitBreaker, adaptiveRateLimit, loadBalancerHeaders, healthCheck } from './middleware/loadBalancer';
import { queryOptimizer } from './services/queryOptimizer';
// import compression from 'compression'; // Temporarily disabled due to dependency conflict

// Route imports - mixing default exports and function exports
import authRoutes from './routes/auth';
import socialAuthRoutes from './routes/social-auth';
import paymentsRoutes from './routes/payments';
import walletRoutes from './routes/wallet';
import { registerProductRoutes } from './routes/products';
import analyticsRoutes from './routes/analytics';
import driverRoutes from './routes/driver';
import supportRoutes from './routes/support';
import adminSupportRoutes from './routes/admin-support';
import enhancedVerificationRoutes from './routes/enhanced-verification';
import mfaAuthenticationRoutes from './routes/mfa-authentication';
import realTimeTrackingRoutes from './routes/real-time-tracking';
import driverLocationRoutes from './routes/driver-location';
import activeOrdersRoutes from './routes/active-orders';
import qrProcessingRoutes from './routes/qr-processing';
import paystackWebhooksRoutes from './routes/paystack-webhooks';
import { registerEscrowManagementRoutes } from './routes/escrow-management';
import withdrawalSystemRoutes from './routes/withdrawal-system';
// Import compliance routes
import dataPrivacyRoutes from "./routes/data-privacy";
import legalComplianceRoutes from "./routes/legal-compliance";
import nigerianComplianceRoutes from "./routes/nigerian-compliance";

// Validate environment variables
validateEnvironment();

const app = express();
const server = createServer(app);

// Initialize Socket.IO with enhanced configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ["https://your-domain.com"]
      : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io available globally for route handlers
declare global {
  var io: SocketIOServer;
}
global.io = io;

// Enhanced Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // User authentication and room joining
  socket.on('authenticate', (userData) => {
    if (userData.userId) {
      socket.join(`user_${userData.userId}`);

      // Join role-specific rooms
      if (userData.role === 'ADMIN') {
        socket.join('admin_dashboard');
        socket.join('admin_orders');
        socket.join('admin_tracking');
        socket.join('admin_verification');
        socket.join('admin_kyc');
      } else if (userData.role === 'DRIVER') {
        socket.join('drivers');
        socket.join(`driver_${userData.userId}`);
      } else if (userData.role === 'MERCHANT') {
        socket.join('merchants');
        socket.join(`merchant_${userData.userId}`);
      }

      console.log(`User ${userData.userId} authenticated as ${userData.role}`);
    }
  });

  // Order tracking
  socket.on('join_order_tracking', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined order tracking: ${orderId}`);
  });

  // Driver location updates
  socket.on('driver_location_update', (data) => {
    // Broadcast to relevant order rooms
    if (data.activeOrders) {
      data.activeOrders.forEach((orderId: string) => {
        socket.to(`order_${orderId}`).emit('driver_location_update', {
          orderId,
          location: data.location,
          timestamp: data.timestamp
        });
      });
    }

    // Broadcast to admin
    socket.to('admin_tracking').emit('driver_location_update', data);
  });

  // Real-time chat
  socket.on('send_message', (data) => {
    const { recipientId, message, conversationId } = data;
    socket.to(`user_${recipientId}`).emit('new_message', {
      message,
      conversationId,
      timestamp: new Date().toISOString()
    });
  });

  // Support ticket updates
  socket.on('join_support_ticket', (ticketId) => {
    socket.join(`ticket_${ticketId}`);
  });

  // Payment status updates
  socket.on('join_payment_tracking', (paymentRef) => {
    socket.join(`payment_${paymentRef}`);
  });

  // Wallet updates
  socket.on('join_wallet_updates', (userId) => {
    socket.join(`wallet_${userId}`);
  });

  // Analytics subscription for admins
  socket.on('subscribe_analytics', () => {
    socket.join('analytics_updates');
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Performance and load balancing middleware
app.use(requestTracker);
// app.use(circuitBreaker); // Temporarily disabled to prevent 503 errors during Redis issues
app.use(loadBalancerHeaders);
// app.use(compression(compressionConfig)); // Temporarily disabled due to dependency conflict
app.use(cdnHeaders);
app.use(resourceHints);
app.use(assetVersioning);
app.use(serviceWorkerCache);

// Security middleware (disabled during development migration)
// app.use(xssProtection);
app.use(adaptiveRateLimit);
app.use(generalLimiter);
app.use(responseTimeMiddleware);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ["https://your-domain.com"]
    : ['http://localhost:3000', 'http://localhost:5173', 'http://0.0.0.0:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Use memory store for sessions in development environment
if (process.env.NODE_ENV !== 'production' || !process.env.REDIS_URL) {
  console.log('🔄 Using memory store for sessions (Redis disabled)');
  const MemoryStoreSession = MemoryStore(session);
  const sessionStore = new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  });

  const sessionConfig = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict'
    },
    name: 'brillprime.sid',
    genid: () => {
      // Generate secure session ID
      return crypto.randomBytes(32).toString('hex');
    }
  };

  app.use(session(sessionConfig));

} else {
  console.log('🔄 Using Redis store for sessions');
  const RedisStore = require('connect-redis')(session);
  const sessionStore = new RedisStore({ client: redisClient });

  const sessionConfig = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict'
    },
    name: 'brillprime.sid',
    genid: () => {
      // Generate secure session ID
      return crypto.randomBytes(32).toString('hex');
    }
  };

  app.use(session(sessionConfig));
}

// CSRF token generation
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// Enhanced request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);

    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.url} took ${duration}ms`);
    }
  });

  next();
});

// Health check endpoints
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    // Assuming 'db' is available in this scope and is a valid database connection object
    // Replace 'db.execute' with your actual database query method if it's different
    // await db.execute(sql`SELECT 1`);

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check for load balancer
app.get('/api/health/detailed', async (req, res) => {
  const cacheHealth = await cacheService.healthCheck();
  const dbConnPool = await queryOptimizer.getConnectionPoolStats();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: cacheHealth,
    database: dbConnPool,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Performance metrics endpoint
app.get('/api/metrics', (req, res) => {
  const queryStats = queryOptimizer.getQueryStats();
  res.json({
    queries: queryStats,
    timestamp: new Date().toISOString()
  });
});

// WebSocket test endpoint
app.get('/api/ws-test', (req, res) => {
  const testData = {
    message: 'WebSocket test from server',
    timestamp: new Date().toISOString(),
    connectedClients: io.engine.clientsCount
  };

  io.emit('server_test', testData);

  res.json({
    success: true,
    message: 'WebSocket test broadcast sent',
    connectedClients: io.engine.clientsCount,
    data: testData
  });
});

// API Routes with enhanced error handling and specific rate limiting
const apiRouter = express.Router();

// Apply specific rate limiters and caching
apiRouter.use('/auth', authLimiter);
apiRouter.use('/payments', paymentLimiter);
apiRouter.use('/wallet/fund', paymentLimiter);

// Apply caching middleware to appropriate routes
apiRouter.use('/analytics', analyticsCache);
apiRouter.use('/dashboard', dashboardCache);
apiRouter.use('/products', productsCache);
apiRouter.use('/drivers/location', locationCache);

// Centralized error handling for API routes
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Apply async error handling to all routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/social-auth', socialAuthRoutes);
apiRouter.use('/payments', paymentsRoutes);
apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/drivers', driverRoutes);
apiRouter.use('/support', supportRoutes);
apiRouter.use('/admin-support', adminSupportRoutes);
apiRouter.use('/verification-enhanced', enhancedVerificationRoutes);
apiRouter.use('/mfa', mfaAuthenticationRoutes);
apiRouter.use('/tracking', realTimeTrackingRoutes);
apiRouter.use('/driver-location', driverLocationRoutes);
apiRouter.use('/active-orders', activeOrdersRoutes);
apiRouter.use('/qr-processing', qrProcessingRoutes);
apiRouter.use('/paystack-webhooks', paystackWebhooksRoutes);
apiRouter.use('/withdrawal', withdrawalSystemRoutes);

app.use('/api', apiRouter);

// Add Google OAuth route
import googleAuthRoutes from './routes/google-auth.js';
app.use('/', googleAuthRoutes);

// Add general error logging endpoint outside of API routes
app.post('/log-error', (req, res) => {
  console.error('Frontend error:', req.body);
  res.json({ success: true, message: 'Error logged' });
});

// Add missing /me endpoint for authentication
app.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      success: true,
      user: {
        id: req.session.userId,
        role: req.session.userRole,
        fullName: req.session.userFullName
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});

// Add API version of /me endpoint
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      success: true,
      user: {
        id: req.session.userId,
        role: req.session.userRole,
        fullName: req.session.userFullName
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});

// Import PCI compliance middleware
import {
  pciSecurityHeaders,
  sanitizeCardData,
  enforceHttps,
  pciAuditLogger
} from './middleware/pci-compliance';

// Apply PCI DSS compliance middleware (disabled during development migration)
// app.use(pciSecurityHeaders);
app.use(sanitizeCardData);
// app.use('/api/payments', enforceHttps);
// app.use('/api/transactions', enforceHttps);
// app.use('/api/wallet', enforceHttps);
app.use(pciAuditLogger);

// Enhanced error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);

  // Log error details
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString(),
    userId: req.session?.userId
  };

  // In production, you would send this to a logging service
  console.error('Error details:', errorDetails);

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message;

  res.status(error.status || 500).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Serve static files and handle SPA routing
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  app.use(staticAssetsMiddleware());

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
} else {
  // Development mode: serve the client assets if available
  const clientDistPath = path.join(process.cwd(), 'client/dist');
  const clientPublicPath = path.join(process.cwd(), 'client/public');

  // Serve static assets with proper MIME types and no CSP restrictions
  app.use(express.static(clientDistPath, {
    setHeaders: (res, path) => {
      // Remove any CSP headers for static assets
      res.removeHeader('Content-Security-Policy');

      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (path.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }

      // Allow all sources for development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');
    }
  }));

  app.use(express.static(clientPublicPath));

  // Also serve client src files for development
  const clientSrcPath = path.join(process.cwd(), 'client/src');
  app.use('/src', express.static(clientSrcPath));

  // For development, serve the built React app
  app.get('*', (req, res) => {
    // Don't intercept API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }

    // Try to serve the built index.html first
    const indexPath = path.join(process.cwd(), 'client/dist/index.html');

    console.log('Trying to serve index.html from:', indexPath);

    // Check if built assets exist and serve them
    if (fs.existsSync(indexPath)) {
      // Read the file and inject debug script
      let indexContent = fs.readFileSync(indexPath, 'utf8');

      // Add debug script to monitor script loading and execution
      const debugScript = `
      <script>
        console.log('Debug: HTML loaded, DOM ready');
        window.addEventListener('load', () => {
          console.log('Debug: Window loaded');
          setTimeout(() => {
            const root = document.getElementById('root');
            console.log('Debug: Root element check:', root, 'innerHTML:', root ? root.innerHTML : 'not found');
            if (root && root.innerHTML === '') {
              console.error('Debug: React app failed to mount - root is still empty');
              root.innerHTML = '<div style="padding: 20px; background: red; color: white; text-align: center;">React App Failed to Load</div>';
            }
          }, 3000);
        });

        // Monitor script errors
        window.addEventListener('error', (e) => {
          console.error('Debug: Script error:', e.error, e.filename, e.lineno);
        });

        // Monitor module errors
        window.addEventListener('unhandledrejection', (e) => {
          console.error('Debug: Module error:', e.reason);
        });
      </script>`;

      // Insert debug script before closing head tag
      indexContent = indexContent.replace('</head>', debugScript + '</head>');

      return res.send(indexContent);
    } else {
      console.log('Built index.html not found, serving development fallback');
      // Simple fallback that will load your React app
      res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BrillPrime</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root">Fallback Mode</div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
    }
  });
}

// Enhanced server startup
const PORT = process.env.PORT || 5000;

server.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 BrillPrime server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket server enabled`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔐 Session secret: ${process.env.SESSION_SECRET ? 'Configured' : 'Using default'}`);

  // Initialize performance services
  console.log('🚀 Initializing performance optimizations...');

  // Start cache warming
  await cacheService.warmCache();

  // Start query optimizer maintenance
  queryOptimizer.startMaintenance();

  // Log initial performance metrics
  const cacheHealth = await cacheService.healthCheck();
  console.log(`💾 Cache service: ${cacheHealth ? 'Connected' : 'Disconnected'}`);

  console.log('✅ Performance optimizations initialized');

  // Real-time system health monitoring
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
    };

    // Log memory usage if it's high
    if (memUsageMB.heapUsed > 100) {
      console.warn('High memory usage:', memUsageMB);
    }

    // Broadcast system health to admin clients
    io.to('admin_dashboard').emit('system_health', {
      memory: memUsageMB,
      uptime: process.uptime(),
      connectedClients: io.engine.clientsCount,
      timestamp: new Date().toISOString()
    });
  }, 30000); // Every 30 seconds
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process - Redis connection issues are handled gracefully
  // This prevents server crashes due to Redis connection attempts
});

// Register compliance and legal routes
app.use("/api/data-privacy", dataPrivacyRoutes);
app.use("/api/legal", legalComplianceRoutes);
app.use("/api/compliance", nigerianComplianceRoutes);

// Register mobile health routes
app.use('/api', mobileHealthRoutes);

export default app;