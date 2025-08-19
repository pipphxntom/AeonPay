import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "aeonpay-secret-key";

// Extend Request interface to include custom properties
interface AuthenticatedRequest extends Request {
  userId?: string;
  idempotencyKey?: string;
}

// Middleware for JWT authentication
const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Idempotency middleware
const idempotencyMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (idempotencyKey && req.method !== 'GET') {
    const keyValue = Array.isArray(idempotencyKey) ? idempotencyKey[0] : idempotencyKey;
    const existingResponse = await storage.checkIdempotency(keyValue);
    if (existingResponse) {
      return res.json(existingResponse.response_data);
    }
    req.idempotencyKey = keyValue;
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(idempotencyMiddleware);

  // Auth routes
  app.post('/api/auth/mock_login', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { phone } = z.object({ phone: z.string() }).parse(req.body);
      
      let user = await storage.getUserByPhone(phone);
      if (!user) {
        user = await storage.createUser({
          phone,
          name: `User ${phone.slice(-4)}`,
          email: `user${phone.slice(-4)}@example.com`,
          avatar: null,
        });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      const response = { token, user };
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Plans routes
  app.post('/api/plans', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, cap_per_head, window_start, window_end, merchant_whitelist, member_ids } = req.body;
      
      const plan = await storage.createPlan({
        name,
        cap_per_head: cap_per_head.toString(),
        window_start: new Date(window_start),
        window_end: new Date(window_end),
        merchant_whitelist: merchant_whitelist || [],
        status: "active",
        created_by: req.userId,
      });

      const response = { plan, members: member_ids };
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid plan data" });
    }
  });

  app.get('/api/plans/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/me/plans', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const plans = await storage.getUserPlans(req.userId!);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Vouchers routes
  app.post('/api/vouchers/mint', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { plan_id, member_user_ids, amount, merchant_list, expires_at } = req.body;
      
      const vouchers = [];
      for (const userId of member_user_ids) {
        const voucher = await storage.createVoucher({
          plan_id,
          member_user_id: userId,
          amount: amount.toString(),
          merchant_list: merchant_list || [],
          expires_at: new Date(expires_at),
          state: "active",
        });
        vouchers.push(voucher);
      }

      const response = { vouchers };
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid voucher data" });
    }
  });

  app.post('/api/vouchers/redeem', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { voucher_ids, amounts, merchant_id } = req.body;
      
      const result = await storage.redeemVouchers(
        voucher_ids.map((id: string, index: number) => ({
          voucher_id: id,
          amount: amounts[index],
          merchant_id,
        }))
      );

      const response = { result };
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid redemption data" });
    }
  });

  // Mandates routes
  app.post('/api/mandates/create', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { plan_id, member_user_ids, cap_amount, valid_from, valid_to } = req.body;
      
      const mandates = [];
      for (const userId of member_user_ids) {
        const mandate = await storage.createMandate({
          plan_id,
          member_user_id: userId,
          cap_amount: cap_amount.toString(),
          valid_from: new Date(valid_from),
          valid_to: new Date(valid_to),
          state: "active",
        });
        mandates.push(mandate);
      }

      const response = { mandates };
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid mandate data" });
    }
  });

  app.post('/api/mandates/execute', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mandate_id, amount } = req.body;
      
      const result = await storage.executeMandate(mandate_id, amount);

      const response = { result };
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid execution data" });
    }
  });

  // Payments routes
  app.post('/api/payments/intent', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { amount, merchant_id, plan_id, mode } = req.body;
      
      const intent_id = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const transaction = await storage.createTransaction({
        intent_id,
        plan_id,
        merchant_id,
        amount: amount.toString(),
        mode,
        status: "pending",
      });

      // Check for guardrail (mock logic)
      const guardrail_required = amount > 250; // Simple threshold for demo
      
      const response = { 
        intent_id, 
        transaction,
        guardrail_required 
      };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid payment intent" });
    }
  });

  app.post('/api/payments/confirm', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { intent_id, status, rrn_stub } = req.body;
      
      const transaction = Array.from((storage as any).transactions.values())
        .find((t: any) => t.intent_id === intent_id) as any;
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      await storage.updateTransaction(transaction.id, {
        status,
        rrn_stub,
      });

      const response = { 
        transaction_id: transaction.id, 
        status, 
        rrn_stub 
      };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid confirmation data" });
    }
  });

  // Merchants routes
  app.get('/api/merchants', async (req: Request, res: Response) => {
    try {
      const { campus_id } = req.query;
      const merchants = await storage.getMerchants(campus_id as string);
      res.json(merchants);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
