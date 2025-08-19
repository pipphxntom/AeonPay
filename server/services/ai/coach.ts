import { spawn } from 'child_process';
import { z } from 'zod';
import { storage } from '../storage';

interface AICoachRequest {
  message: string;
  campus_id?: string;
  user_id: string;
}

interface AICoachResponse {
  message: string;
  actions?: Array<{
    type: string;
    data: any;
  }>;
}

const ALLOWED_TOOLS = [
  'create_plan',
  'mint_vouchers', 
  'create_mandates',
  'suggest_merchants',
  'trim_suggestions'
];

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "create_plan",
      description: "Create a new spending plan for a group",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Plan name" },
          cap_per_head: { type: "number", description: "Budget per person in ₹" },
          duration_hours: { type: "number", description: "Plan duration in hours" },
          member_count: { type: "number", description: "Number of members" }
        },
        required: ["name", "cap_per_head", "duration_hours", "member_count"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "mint_vouchers",
      description: "Create vouchers for group members",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Voucher amount in ₹" },
          member_count: { type: "number", description: "Number of vouchers to create" },
          expires_in_hours: { type: "number", description: "Voucher expiry in hours" }
        },
        required: ["amount", "member_count", "expires_in_hours"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_mandates", 
      description: "Set up spending mandates with limits",
      parameters: {
        type: "object",
        properties: {
          cap_amount: { type: "number", description: "Maximum spending limit in ₹" },
          member_count: { type: "number", description: "Number of mandates" },
          valid_hours: { type: "number", description: "Validity period in hours" }
        },
        required: ["cap_amount", "member_count", "valid_hours"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_merchants",
      description: "Suggest merchants based on criteria",
      parameters: {
        type: "object", 
        properties: {
          category: { type: "string", description: "Merchant category (food, shopping, etc.)" },
          max_results: { type: "number", description: "Maximum number of suggestions" }
        },
        required: ["category", "max_results"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "trim_suggestions",
      description: "Suggest ways to reduce spending",
      parameters: {
        type: "object",
        properties: {
          current_amount: { type: "number", description: "Current spending amount in ₹" },
          target_reduction: { type: "number", description: "Target reduction amount in ₹" }
        },
        required: ["current_amount", "target_reduction"]
      }
    }
  }
];

async function callAIProvider(messages: any[], tools: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', ['-c', `
import sys
import os
sys.path.append('${process.cwd()}/server/services/ai')
from providers import get_ai_provider, redact_pii, validate_tool_calls
import json

# Get input
messages = json.loads(sys.argv[1])
tools = json.loads(sys.argv[2])

# Get AI provider
provider = get_ai_provider()

# Make request
try:
    response = provider.chat_completion(messages, tools)
    print(json.dumps(response))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    `, JSON.stringify(messages), JSON.stringify(tools)]);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process failed: ${errorOutput}`));
        return;
      }

      try {
        const result = JSON.parse(output.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (err) {
        reject(new Error(`Failed to parse AI response: ${output}`));
      }
    });
  });
}

export async function processAICoachRequest(request: AICoachRequest): Promise<AICoachResponse> {
  try {
    // Log privacy event
    await storage.logPrivacyEvent({
      user_id: request.user_id,
      field: "message_content",
      purpose: "ai_coach_assistance"
    });

    // Get user data for PII redaction
    const user = await storage.getUser(request.user_id);
    
    // Prepare messages
    const messages = [
      {
        role: "system",
        content: `You are AeonPay AI Coach, helping users with group spending plans. You can create plans, mint vouchers, set up mandates, suggest merchants, and provide spending reduction tips. Always provide helpful, actionable advice. Current campus: ${request.campus_id || 'unknown'}.`
      },
      {
        role: "user", 
        content: request.message
      }
    ];

    // Get AI response
    const aiResponse = await callAIProvider(messages, TOOL_DEFINITIONS);
    
    if (!aiResponse.choices || !aiResponse.choices[0]) {
      throw new Error('Invalid AI response format');
    }

    const choice = aiResponse.choices[0];
    const message = choice.message;
    
    // Process tool calls if present
    const actions: Array<{type: string; data: any}> = [];
    
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function?.name;
        const args = toolCall.function?.arguments;
        
        if (!functionName || !ALLOWED_TOOLS.includes(functionName)) {
          continue;
        }

        let parsedArgs;
        try {
          parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
        } catch {
          continue;
        }

        actions.push({
          type: functionName,
          data: parsedArgs
        });
      }
    }

    return {
      message: message.content || "I'm here to help with your spending plans!",
      actions
    };

  } catch (error) {
    console.error('AI Coach error:', error);
    
    // Fallback response
    return {
      message: "I'm currently experiencing some technical difficulties. However, I can still help you with creating plans, managing vouchers, and finding ways to optimize your spending. What would you like to do?",
      actions: []
    };
  }
}

// Tool execution handlers
export async function executeCreatePlan(data: any, userId: string): Promise<any> {
  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + (data.duration_hours * 60 * 60 * 1000));
  
  const plan = await storage.createPlan({
    name: data.name,
    cap_per_head: data.cap_per_head.toString(),
    window_start: windowStart,
    window_end: windowEnd,
    merchant_whitelist: [],
    status: "active",
    created_by: userId
  });

  return { plan_id: plan.id, message: `Created plan "${data.name}" with ₹${data.cap_per_head} per head` };
}

export async function executeMintVouchers(data: any, userId: string, planId?: string): Promise<any> {
  if (!planId) {
    throw new Error("Plan ID required for minting vouchers");
  }

  const expiresAt = new Date(Date.now() + (data.expires_in_hours * 60 * 60 * 1000));
  const vouchers = [];

  for (let i = 0; i < data.member_count; i++) {
    const voucher = await storage.createVoucher({
      plan_id: planId,
      member_user_id: userId, // In real scenario, would be different users
      amount: data.amount.toString(),
      merchant_list: [],
      expires_at: expiresAt,
      state: "active"
    });
    vouchers.push(voucher);
  }

  return { 
    voucher_ids: vouchers.map(v => v.id),
    message: `Minted ${data.member_count} vouchers of ₹${data.amount} each`
  };
}

export async function executeCreateMandates(data: any, userId: string, planId?: string): Promise<any> {
  if (!planId) {
    throw new Error("Plan ID required for creating mandates");
  }

  const validFrom = new Date();
  const validTo = new Date(validFrom.getTime() + (data.valid_hours * 60 * 60 * 1000));
  const mandates = [];

  for (let i = 0; i < data.member_count; i++) {
    const mandate = await storage.createMandate({
      plan_id: planId,
      member_user_id: userId, // In real scenario, would be different users  
      cap_amount: data.cap_amount.toString(),
      valid_from: validFrom,
      valid_to: validTo,
      state: "active"
    });
    mandates.push(mandate);
  }

  return {
    mandate_ids: mandates.map(m => m.id),
    message: `Created ${data.member_count} mandates with ₹${data.cap_amount} limit each`
  };
}

export async function executeSuggestMerchants(data: any, campusId?: string): Promise<any> {
  const merchants = await storage.getMerchants(campusId);
  const filtered = merchants.filter(m => 
    m.category.toLowerCase().includes(data.category.toLowerCase())
  ).slice(0, data.max_results);

  return {
    merchants: filtered.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      location: m.location
    })),
    message: `Found ${filtered.length} ${data.category} merchants in your area`
  };
}

export async function executeTrimSuggestions(data: any): Promise<any> {
  const suggestions = [
    { action: "reduce_portion_size", saving: data.target_reduction * 0.3 },
    { action: "choose_budget_options", saving: data.target_reduction * 0.4 },
    { action: "skip_extras", saving: data.target_reduction * 0.3 }
  ];

  return {
    suggestions,
    total_savings: data.target_reduction,
    message: `Here are ways to save ₹${data.target_reduction} from your ₹${data.current_amount} budget`
  };
}