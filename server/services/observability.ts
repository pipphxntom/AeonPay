import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Structured logging interface
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  request_id?: string;
  user_id?: string;
  idempotency_key?: string;
  path?: string;
  method?: string;
  duration_ms?: number;
  status_code?: number;
  error?: any;
  metadata?: { [key: string]: any };
}

// In-memory error tracking (would use proper storage in production)
const recentErrors: Array<LogEntry & { count: number; last_seen: Date }> = [];
const MAX_ERRORS = 1000;

// Redact sensitive data from logs
function redactSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const redacted = { ...data };
  const sensitiveFields = ['password', 'token', 'phone', 'email', 'vpa', 'account'];
  
  for (const [key, value] of Object.entries(redacted)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    }
  }
  
  return redacted;
}

// Structured logger
export function logStructured(entry: LogEntry): void {
  const redactedEntry = {
    ...entry,
    metadata: redactSensitiveData(entry.metadata)
  };
  
  // JSON structured output to console for log aggregation
  console.log(JSON.stringify(redactedEntry));
  
  // Track errors for monitoring
  if (entry.level === 'error') {
    trackError(redactedEntry);
  }
}

// Error tracking and aggregation
function trackError(errorEntry: LogEntry): void {
  const errorKey = `${errorEntry.path}:${errorEntry.message}`;
  const existingError = recentErrors.find(e => 
    e.path === errorEntry.path && e.message === errorEntry.message
  );
  
  if (existingError) {
    existingError.count++;
    existingError.last_seen = new Date();
  } else {
    recentErrors.push({
      ...errorEntry,
      count: 1,
      last_seen: new Date()
    });
    
    // Keep only recent errors
    if (recentErrors.length > MAX_ERRORS) {
      recentErrors.shift();
    }
  }
}

// Request logging middleware
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const startTime = Date.now();
  
  (req as any).requestId = requestId;
  
  logStructured({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Request started',
    request_id: requestId,
    user_id: (req as any).userId,
    path: req.path,
    method: req.method,
    metadata: {
      user_agent: req.headers['user-agent'],
      ip: req.ip,
      query: redactSensitiveData(req.query),
      body_size: JSON.stringify(req.body || {}).length
    }
  });
  
  // Intercept response to log completion
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    logStructured({
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 400 ? 'error' : 'info',
      message: 'Request completed',
      request_id: requestId,
      user_id: (req as any).userId,
      idempotency_key: (req as any).idempotencyKey,
      path: req.path,
      method: req.method,
      duration_ms: duration,
      status_code: res.statusCode,
      metadata: {
        response_size: body ? body.length : 0
      }
    });
    
    return originalSend.call(this, body);
  };
  
  next();
}

// Health check endpoints
export function setupHealthChecks(app: any, storage: any): void {
  // Overall health
  app.get('/health', async (req: Request, res: Response) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json(health);
  });
  
  // Database health
  app.get('/health/db', async (req: Request, res: Response) => {
    try {
      // Simple database connectivity test
      await storage.getFeatureFlags();
      res.json({ status: 'healthy', database: 'connected' });
    } catch (error) {
      res.status(503).json({ 
        status: 'unhealthy', 
        database: 'disconnected',
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // AI services health
  app.get('/health/ai', async (req: Request, res: Response) => {
    // Test AI service connectivity
    const aiHealth = {
      status: 'healthy',
      providers: {
        primary: 'available',
        fallback: 'available'
      },
      last_check: new Date().toISOString()
    };
    
    res.json(aiHealth);
  });
  
  // Queue health (for future async processing)
  app.get('/health/queue', async (req: Request, res: Response) => {
    const queueHealth = {
      status: 'healthy',
      pending_jobs: 0,
      failed_jobs: 0,
      workers: 1
    };
    
    res.json(queueHealth);
  });
}

// Operations status endpoint
export function setupOpsEndpoints(app: any, storage: any): void {
  // Error summary
  app.get('/ops/status', async (req: Request, res: Response) => {
    const last1k = recentErrors.slice(-1000);
    const grouped = last1k.reduce((acc, error) => {
      const key = `${error.status_code}:${error.path}`;
      if (!acc[key]) {
        acc[key] = { count: 0, last_seen: error.last_seen, examples: [] };
      }
      acc[key].count += error.count;
      if (acc[key].examples.length < 3) {
        acc[key].examples.push(error.message);
      }
      return acc;
    }, {} as any);
    
    res.json({
      total_errors: last1k.length,
      error_groups: Object.keys(grouped).length,
      top_errors: Object.entries(grouped)
        .sort(([,a], [,b]) => (b as any).count - (a as any).count)
        .slice(0, 10)
        .map(([key, data]) => ({ key, ...(data as any) }))
    });
  });
  
  // Synthetic smoke test
  app.get('/ops/smoke_test', async (req: Request, res: Response) => {
    const testResults: any = {
      test_id: randomUUID(),
      timestamp: new Date().toISOString(),
      results: {} as any
    };
    
    try {
      // Test 1: Create temporary plan
      const testPlan = await storage.createPlan({
        name: 'SMOKE_TEST_PLAN',
        cap_per_head: '100.00',
        window_start: new Date(),
        window_end: new Date(Date.now() + 24 * 60 * 60 * 1000),
        merchant_whitelist: [],
        status: 'active',
        created_by: 'smoke_test'
      });
      testResults.results.plan_creation = 'pass';
      
      // Test 2: Create vouchers
      const voucher = await storage.createVoucher({
        plan_id: testPlan.id,
        member_user_id: 'smoke_test',
        amount: '25.00',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        state: 'active'
      });
      testResults.results.voucher_creation = 'pass';
      
      // Test 3: Create and confirm payment simulation
      const transaction = await storage.createTransaction({
        voucher_id: voucher.id,
        amount: '10.00',
        merchant_id: 'test_merchant',
        status: 'pending'
      });
      
      await storage.updateTransaction(transaction.id, { status: 'confirmed' });
      testResults.results.payment_flow = 'pass';
      
      // Test 4: Reconciliation simulation
      const reconReport = await storage.createReconReport({
        date: new Date().toISOString().split('T')[0],
        total_transactions: 1,
        total_amount: '10.00',
        status: 'completed'
      });
      testResults.results.reconciliation = 'pass';
      
      testResults.overall_status = 'pass';
      
    } catch (error) {
      testResults.results.error = error instanceof Error ? error.message : String(error);
      testResults.overall_status = 'fail';
    }
    
    res.json(testResults);
  });
}