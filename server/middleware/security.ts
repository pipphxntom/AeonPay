import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import UAParser from 'ua-parser-js';

// Rate limiting configurations for Replit environment
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: { message: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).set('Retry-After', '60').json({
      message: 'Too many authentication attempts, please try again later'
    });
  }
});

export const paymentsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute  
  max: 30, // 30 requests per minute
  message: { message: 'Too many payment requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).set('Retry-After', '60').json({
      message: 'Too many payment requests, please slow down'
    });
  }
});

export const swapRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { message: 'Too many swap requests, please wait before trying again' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).set('Retry-After', '60').json({
      message: 'Too many swap requests, please wait before trying again'
    });
  }
});

export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 requests per minute
  message: { message: 'Too many AI requests, please wait before asking again' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).set('Retry-After', '60').json({
      message: 'Too many AI requests, please wait before asking again'
    });
  }
});

// Device fingerprinting and binding
interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
  deviceFingerprint?: string;
  sessionId?: string;
  session?: any;
}

export const deviceBindingMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  const clientRandom = req.headers['x-client-random'] || '';
  
  // Create device fingerprint
  const fingerprintData = `${userAgent}|${clientRandom}|${req.ip}`;
  const deviceFingerprint = createHash('sha256').update(fingerprintData).digest('hex');
  
  req.deviceFingerprint = deviceFingerprint;
  
  // For authenticated routes, verify device binding if session exists
  if (req.userId && req.session) {
    const sessionFingerprint = req.session.deviceFingerprint;
    if (sessionFingerprint && sessionFingerprint !== deviceFingerprint) {
      return res.status(401).json({ 
        message: 'Device binding mismatch, please re-authenticate',
        code: 'DEVICE_BINDING_FAILED'
      });
    }
    
    // Store fingerprint in session
    req.session.deviceFingerprint = deviceFingerprint;
  }
  
  next();
};

// JWT scope-based authorization
export const requireScope = (requiredScope: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token required' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aeonpay-secret-key') as any;
      
      const scopes = decoded.scopes || ['user']; // Default to user scope
      
      if (!scopes.includes(requiredScope) && !scopes.includes('admin')) {
        return res.status(403).json({ 
          message: `Insufficient permissions. Required scope: ${requiredScope}`,
          required_scope: requiredScope,
          user_scopes: scopes
        });
      }
      
      req.userId = decoded.userId;
      next();
    } catch (error) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
  };
};

// Anti-velocity controls for swaps
const swapVelocityMap = new Map<string, { count: number, lastReset: number, pairs: Set<string> }>();

export const antiVelocityMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.userId) return next();
  
  const now = Date.now();
  const hourlyWindow = 60 * 60 * 1000; // 1 hour
  const userId = req.userId;
  
  let userVelocity = swapVelocityMap.get(userId);
  
  // Reset if window expired
  if (!userVelocity || (now - userVelocity.lastReset) > hourlyWindow) {
    userVelocity = { count: 0, lastReset: now, pairs: new Set() };
    swapVelocityMap.set(userId, userVelocity);
  }
  
  // Check velocity limits
  if (userVelocity.count >= 3) {
    return res.status(429).json({
      message: 'Too many swaps in the last hour. Try Merchant Swap instead.',
      suggestion: 'merchant_swap',
      retry_after: Math.ceil((hourlyWindow - (now - userVelocity.lastReset)) / 1000)
    });
  }
  
  // Check repeated pairs (if swap request contains pair info)
  if (req.body.pair) {
    const pairKey = `${req.body.from_currency}-${req.body.to_currency}`;
    if (userVelocity.pairs.has(pairKey)) {
      return res.status(429).json({
        message: 'Repeated currency pair blocked for 24h. Try different currencies.',
        blocked_until: new Date(now + 24 * 60 * 60 * 1000).toISOString()
      });
    }
  }
  
  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' wss: https:; " +
    "frame-ancestors 'none'; " +
    "object-src 'none'; " +
    "base-uri 'self'"
  );
  
  // Additional security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};