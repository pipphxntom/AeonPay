import { redactPIIForAI, logPrivacyEvent } from '../../middleware/privacy';

// AI policy enforcement and guardrails
export class AIPolicy {
  private storage: any;
  
  constructor(storage: any) {
    this.storage = storage;
  }

  // Check if AI tools should be denied based on context
  async shouldDenyTools(context: any, userId: string): Promise<{ deny: boolean; reason?: string }> {
    // Deny if context is missing critical information
    if (!context.plan_id && (context.action_type === 'mandate' || context.action_type === 'voucher')) {
      return { deny: true, reason: 'Missing plan context for financial action' };
    }

    // Deny if mandate window is closed
    if (context.action_type === 'mandate' && context.plan_id) {
      const plan = await this.storage.getPlan(context.plan_id);
      if (plan && new Date() > new Date(plan.window_end)) {
        return { deny: true, reason: 'Plan window has closed' };
      }
    }

    // Deny if merchant not whitelisted
    if (context.merchant_id && context.plan_id) {
      const plan = await this.storage.getPlan(context.plan_id);
      if (plan && plan.merchant_whitelist && plan.merchant_whitelist.length > 0) {
        if (!plan.merchant_whitelist.includes(context.merchant_id)) {
          return { deny: true, reason: 'Merchant not authorized for this plan' };
        }
      }
    }

    // Deny if requesting PII access
    if (context.requested_fields && this.containsPII(context.requested_fields)) {
      return { deny: true, reason: 'AI cannot access personal information directly' };
    }

    // Deny fund movements outside of approved tools
    if (context.action_type === 'transfer' && !context.approved_tools?.includes('transfer')) {
      return { deny: true, reason: 'Fund transfers must use approved payment tools only' };
    }

    return { deny: false };
  }

  // Check if fields contain PII
  private containsPII(fields: string[]): boolean {
    const piiFields = ['phone', 'name', 'email', 'vpa', 'account_number', 'user_name'];
    return fields.some(field => 
      piiFields.some(piiField => field.toLowerCase().includes(piiField))
    );
  }

  // Get safe fallback response when tools are denied
  getSafeFallback(reason: string): string {
    const fallbacks: { [key: string]: string } = {
      'Missing plan context': 'I need more information about your plan to help with that. Please select a plan first.',
      'Plan window has closed': 'This plan is no longer active. You can create a new plan or contact support.',
      'Merchant not authorized': 'This merchant is not available for your current plan. Please check your plan details.',
      'AI cannot access personal information': 'I can help you with general information, but cannot access personal details for privacy.',
      'Fund transfers must use approved payment tools': 'For security, payments must be processed through our secure payment system.'
    };
    
    return fallbacks[reason] || 'I cannot complete that action right now. Please try a different approach or contact support.';
  }

  // Process AI request with redaction and policy checks
  async processAIRequest(request: any, userId: string, purpose: string): Promise<any> {
    // Check policy first
    const policyCheck = await this.shouldDenyTools(request.context || {}, userId);
    if (policyCheck.deny) {
      return {
        success: false,
        message: this.getSafeFallback(policyCheck.reason!),
        blocked_reason: policyCheck.reason
      };
    }

    // Redact PII from request
    const redactionResult = redactPIIForAI(request, purpose);
    
    // Log the privacy event
    await logPrivacyEvent(this.storage, {
      user_id: userId,
      purpose,
      fields_accessed: Object.keys(request),
      redacted_fields: Object.keys(redactionResult.tokens)
    });

    return {
      success: true,
      redacted_request: redactionResult.redactedData,
      privacy_tokens: redactionResult.tokens,
      allowed_fields: redactionResult.allowedFields
    };
  }
}

// Timeout and retry configuration for AI calls
export const AI_CONFIG = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  providers: {
    primary: 'openai',
    fallback: 'mock'
  }
};

// Wrapper for AI calls with timeout and fallback
export async function callAIWithTimeout<T>(
  aiFunction: () => Promise<T>,
  fallbackFunction: () => T,
  timeoutMs: number = AI_CONFIG.timeout
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.warn('[AI] Request timed out, using fallback');
      resolve(fallbackFunction());
    }, timeoutMs);

    aiFunction()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('[AI] Request failed, using fallback:', error);
        resolve(fallbackFunction());
      });
  });
}

// Mock coach fallback when AI provider fails
export function getMockCoachResponse(context: any): any {
  const responses = [
    "I can help you manage your spending plan. What would you like to do?",
    "Let's check your vouchers and see what options are available.",
    "Your plan looks good! Would you like to add more members or adjust limits?",
    "I notice you have some pending transactions. Shall we review them?",
    "For better spending tracking, consider setting merchant limits."
  ];
  
  return {
    message: responses[Math.floor(Math.random() * responses.length)],
    suggestions: [
      { action: 'view_vouchers', label: 'View Vouchers' },
      { action: 'check_balance', label: 'Check Balance' },
      { action: 'manage_plan', label: 'Manage Plan' }
    ],
    provider: 'mock',
    timestamp: new Date().toISOString()
  };
}