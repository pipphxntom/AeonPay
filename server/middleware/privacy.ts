import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

// PII tokens for redaction
const piiTokens = new Map<string, string>();
let tokenCounter = 0;

// Fields allowed to be sent to AI providers
const AI_ALLOWED_FIELDS = [
  'amount', 'category', 'merchant_type', 'time_window', 'plan_status',
  'voucher_count', 'transaction_type', 'swap_direction', 'currency_pair'
];

interface RedactionResult {
  redactedData: any;
  tokens: { [key: string]: string };
  allowedFields: string[];
}

// Central redaction function for AI calls
export function redactPIIForAI(data: any, purpose: string): RedactionResult {
  const redactedData = JSON.parse(JSON.stringify(data));
  const tokens: { [key: string]: string } = {};
  
  // Recursively redact PII
  function redactObject(obj: any, path: string = ''): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      // Redact phone numbers
      if (key.includes('phone') || (typeof value === 'string' && /^\+?[\d\s\-\(\)]{10,}$/.test(value))) {
        const token = `PHONE_${++tokenCounter}`;
        tokens[token] = value as string;
        piiTokens.set(token, value as string);
        obj[key] = token;
      }
      
      // Redact names (excluding merchant names, category names)
      if ((key.includes('name') && !key.includes('merchant') && !key.includes('category')) || 
          key === 'user_name' || key === 'account_holder') {
        const token = `NAME_${++tokenCounter}`;
        tokens[token] = value as string;
        piiTokens.set(token, value as string);
        obj[key] = token;
      }
      
      // Redact VPA addresses
      if (key.includes('vpa') || key.includes('upi') || 
          (typeof value === 'string' && /@[\w\-]+$/.test(value))) {
        const token = `VPA_${++tokenCounter}`;
        tokens[token] = value as string;
        piiTokens.set(token, value as string);
        obj[key] = token;
      }
      
      // Redact email addresses  
      if (key.includes('email') || 
          (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
        const token = `EMAIL_${++tokenCounter}`;
        tokens[token] = value as string;
        piiTokens.set(token, value as string);
        obj[key] = token;
      }
      
      // Recursively process nested objects
      if (typeof value === 'object' && value !== null) {
        redactObject(value, fullPath);
      }
    }
    
    return obj;
  }
  
  redactObject(redactedData);
  
  // Filter to only allowed fields
  const filteredData = filterAllowedFields(redactedData, AI_ALLOWED_FIELDS);
  
  return {
    redactedData: filteredData,
    tokens,
    allowedFields: AI_ALLOWED_FIELDS
  };
}

// Filter object to only include allowed fields
function filterAllowedFields(obj: any, allowedFields: string[]): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const filtered: any = {};
  
  for (const field of allowedFields) {
    if (obj.hasOwnProperty(field)) {
      filtered[field] = typeof obj[field] === 'object' && obj[field] !== null ? 
        filterAllowedFields(obj[field], allowedFields) : obj[field];
    }
  }
  
  return filtered;
}

// Store privacy events for audit trail
export async function logPrivacyEvent(storage: any, event: {
  user_id: string;
  purpose: string;
  fields_accessed: string[];
  ai_provider?: string;
  redacted_fields: string[];
  timestamp?: Date;
}) {
  await storage.logPrivacyEvent({
    id: `privacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user_id: event.user_id,
    event_type: 'ai_data_access',
    purpose: event.purpose,
    fields_accessed: event.fields_accessed,
    ai_provider: event.ai_provider || 'openai',
    redacted_fields: event.redacted_fields,
    timestamp: event.timestamp || new Date(),
    metadata: { 
      token_count: Object.keys(event.redacted_fields).length,
      allowed_fields: AI_ALLOWED_FIELDS 
    }
  });
}

// Privacy middleware for API routes
export const privacyAuditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Log data access for audit
  const originalJson = res.json;
  res.json = function(body) {
    // Log what data was accessed/returned
    if (req.method === 'GET' && body && (req as any).userId) {
      // This would log data access events
      console.log(`[PRIVACY] Data accessed by user ${(req as any).userId} on ${req.path}`);
    }
    return originalJson.call(this, body);
  };
  
  next();
};

// Data export functionality
export async function exportUserData(storage: any, userId: string): Promise<any> {
  const userData = {
    user: await storage.getUser(userId),
    plans: await storage.getUserPlans(userId),
    transactions: [], // Would implement transaction history
    vouchers: [], // Would implement voucher history  
    privacy_events: await storage.getPrivacyEvents(userId),
    mandates: [], // Would implement mandate history
    analytics: await storage.getAnalyticsEvents(userId),
    exported_at: new Date().toISOString(),
    export_version: '1.0'
  };
  
  return userData;
}

// Soft delete user data while preserving audit trail
export async function softDeleteUser(storage: any, userId: string): Promise<void> {
  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');
  
  // Scrub personal identifiers but keep ledger IDs for audit
  const scrubbedData = {
    phone: `DELETED_${Date.now()}`,
    name: 'DELETED_USER', 
    email: null,
    avatar: null,
    deleted_at: new Date(),
    original_id: userId
  };
  
  // This would update the user record with scrubbed data
  // await storage.updateUser(userId, scrubbedData);
  
  // Log the deletion event
  await logPrivacyEvent(storage, {
    user_id: userId,
    purpose: 'user_deletion',
    fields_accessed: ['all'],
    redacted_fields: ['phone', 'name', 'email', 'avatar']
  });
}

// Utility to get redacted tokens for transparency
export function getRedactedToken(token: string): string | undefined {
  return piiTokens.get(token);
}