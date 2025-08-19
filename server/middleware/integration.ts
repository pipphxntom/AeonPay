// Integration of all security, privacy, and observability middleware
import { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { 
  authRateLimit, 
  paymentsRateLimit, 
  swapRateLimit, 
  aiRateLimit,
  deviceBindingMiddleware,
  requireScope,
  antiVelocityMiddleware,
  securityHeaders 
} from './security';
import { privacyAuditMiddleware } from './privacy';
import { requestLoggingMiddleware, setupHealthChecks, setupOpsEndpoints } from '../services/observability';
import { AIPolicy } from '../services/ai/policy';
import { BanditManager } from '../services/ai/prompts';

// CORS configuration for Replit environment
const corsOptions = {
  origin: [
    /\.replit\.app$/,
    /\.repl\.co$/,
    'http://localhost:5000',
    'https://localhost:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Client-Random']
};

export function setupComprehensiveMiddleware(app: Express, storage: any): void {
  // 1. Basic security headers
  app.use(helmet({
    contentSecurityPolicy: false, // We set custom CSP
    crossOriginEmbedderPolicy: false
  }));
  
  // 2. Custom security headers
  app.use(securityHeaders);
  
  // 3. CORS
  app.use(cors(corsOptions));
  
  // 4. Request logging and monitoring
  app.use(requestLoggingMiddleware);
  
  // 5. Device binding
  app.use(deviceBindingMiddleware);
  
  // 6. Privacy audit middleware
  app.use(privacyAuditMiddleware);
  
  // 7. Route-specific rate limiting
  app.use('/api/auth/*', authRateLimit);
  app.use('/api/payments/*', paymentsRateLimit);
  app.use('/api/swap/*', swapRateLimit);
  app.use('/api/ai/*', aiRateLimit);
  
  // 8. Anti-velocity controls for swaps
  app.use('/api/swap/create', antiVelocityMiddleware);
  
  // 9. Health checks and ops endpoints
  setupHealthChecks(app, storage);
  setupOpsEndpoints(app, storage);
  
  // 10. Initialize AI services
  const aiPolicy = new AIPolicy(storage);
  const banditManager = new BanditManager(storage);
  
  // Store these in app locals for use in routes
  app.locals.aiPolicy = aiPolicy;
  app.locals.banditManager = banditManager;
}

// Feature flags and kill switches
export const KILL_SWITCHES = {
  disable_mandates: false,
  disable_vouchers: false,
  disable_swap_peer: false,
  disable_ai_nudges: false
};

export function updateKillSwitch(feature: keyof typeof KILL_SWITCHES, enabled: boolean): void {
  KILL_SWITCHES[feature] = enabled;
  console.log(`[KILL_SWITCH] ${feature} ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

export function checkKillSwitch(feature: keyof typeof KILL_SWITCHES): boolean {
  return KILL_SWITCHES[feature];
}

// Privacy center routes
export function setupPrivacyRoutes(app: Express, storage: any): void {
  // Export user data
  app.get('/api/privacy/export', requireScope('user'), async (req: any, res) => {
    try {
      const { exportUserData } = await import('./privacy');
      const userData = await exportUserData(storage, req.userId);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=aeonpay-data-export.json');
      res.json(userData);
    } catch (error) {
      res.status(500).json({ message: 'Failed to export user data' });
    }
  });
  
  // Get privacy events (what AI saw)
  app.get('/api/privacy/events', requireScope('user'), async (req: any, res) => {
    try {
      const events = await storage.getPrivacyEvents(req.userId, 30); // Last 30 days
      const redactedEvents = events.map((event: any) => ({
        ...event,
        // Only show token identifiers, not actual values
        data_accessed: event.redacted_fields || [],
        purpose: event.purpose,
        timestamp: event.timestamp
      }));
      
      res.json({ events: redactedEvents });
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve privacy events' });
    }
  });
  
  // Soft delete user account
  app.delete('/api/privacy/delete-account', requireScope('user'), async (req: any, res) => {
    try {
      const { softDeleteUser } = await import('./privacy');
      await softDeleteUser(storage, req.userId);
      
      res.json({ 
        message: 'Account deletion initiated. Personal data will be scrubbed while preserving audit trails.',
        deleted_at: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete user account' });
    }
  });
}

// Admin routes for managing system
export function setupAdminRoutes(app: Express, storage: any): void {
  // Kill switch controls
  app.post('/api/admin/kill-switch', requireScope('admin'), async (req: any, res) => {
    try {
      const { feature, enabled } = req.body;
      if (!(feature in KILL_SWITCHES)) {
        return res.status(400).json({ message: 'Invalid feature flag' });
      }
      
      updateKillSwitch(feature, enabled);
      res.json({ feature, enabled, updated_at: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update kill switch' });
    }
  });
  
  // Bandit arm management
  app.get('/api/admin/bandits/:eventType', requireScope('admin'), async (req: any, res) => {
    try {
      const { eventType } = req.params;
      const banditManager = app.locals.banditManager as BanditManager;
      const status = banditManager.getArmStatus(eventType);
      
      res.json({ event_type: eventType, arms: status });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get bandit status' });
    }
  });
  
  // Feature flag management
  app.get('/api/admin/flags', requireScope('admin'), async (req: any, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      res.json({ flags, kill_switches: KILL_SWITCHES });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get feature flags' });
    }
  });
}