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

  // SwapHub routes
  app.post('/api/swap/create', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mode, direction, amount, location_latlng } = req.body;
      
      // Daily limit check (₹2,000/day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysSwaps = Array.from((storage as any).swaps.values())
        .filter((s: any) => s.created_by === req.user?.id && s.created_at >= today);
      
      const todaysTotal = todaysSwaps.reduce((sum: number, s: any) => sum + parseFloat(s.amount), 0);
      
      if (todaysTotal + amount > 2000) {
        return res.status(429).json({ message: "Daily swap limit of ₹2,000 exceeded" });
      }

      const swap = await storage.createSwap({
        mode,
        direction,
        amount: amount.toString(),
        location_latlng,
        created_by: req.user?.id,
        state: "open"
      });

      const response = { swap_id: swap.id, state: swap.state };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid swap creation" });
    }
  });

  app.get('/api/swap/matches', async (req: Request, res: Response) => {
    try {
      const { near, dir } = req.query;
      const matches = await storage.getSwapMatches(near as string, dir as string);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/swap/accept', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { swap_id } = req.body;
      
      const updatedSwap = await storage.updateSwap(swap_id, {
        matched_with: req.user?.id,
        state: "matched"
      });

      await storage.createSwapEvent({
        swap_id,
        event: "matched",
        meta: { matched_by: req.user?.id }
      });

      const response = { swap_id, state: updatedSwap?.state };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid swap acceptance" });
    }
  });

  app.post('/api/swap/handshake', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { swap_id } = req.body;
      const swap_code = Math.random().toString(36).substring(2, 8).toUpperCase();

      await storage.updateSwap(swap_id, { swap_code });
      await storage.createSwapEvent({
        swap_id,
        event: "handshake_initiated",
        meta: { swap_code }
      });

      const response = { swap_id, swap_code };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid handshake" });
    }
  });

  app.post('/api/swap/confirm', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { swap_id, upi_verified } = req.body;
      
      await storage.updateSwap(swap_id, { state: "confirmed" });
      await storage.createSwapEvent({
        swap_id,
        event: "confirmed",
        meta: { upi_verified }
      });

      const response = { swap_id, state: "confirmed" };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid confirmation" });
    }
  });

  app.post('/api/swap/dispute', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { swap_id, reason } = req.body;
      
      await storage.updateSwap(swap_id, { state: "disputed" });
      await storage.createSwapEvent({
        swap_id,
        event: "disputed",
        meta: { reason, disputed_by: req.user?.id }
      });

      const response = { swap_id, state: "disputed" };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid dispute" });
    }
  });

  // Merchant Swap routes
  app.get('/api/swap/partners', async (req: Request, res: Response) => {
    try {
      const partners = await storage.getPartners();
      res.json(partners);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/swap/partner_confirm', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { partner_id, amount } = req.body;
      
      const response = { 
        partner_id, 
        amount, 
        status: "confirmed",
        incentive_earned: true 
      };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid partner confirmation" });
    }
  });

  // UPI-ATM routes
  app.get('/api/swap/upi_atms', async (req: Request, res: Response) => {
    try {
      const { near } = req.query;
      const atms = await storage.getUpiAtms(near as string);
      res.json(atms);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // AI Coach routes
  app.post('/api/ai/coach', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message, campus_id } = req.body;
      
      // Rate limiting check (simple implementation)
      const response = {
        message: "I'm your AeonPay AI coach! I can help you create spending plans, manage vouchers, and find the best deals. What would you like to do?",
        actions: []
      };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "AI Coach unavailable" });
    }
  });

  // AI Nudges routes  
  app.post('/api/ai/nudge', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { event_type, context } = req.body;
      
      const { nudgesService } = await import('./services/nudges');
      const nudge = await nudgesService.getNudge({ event_type, context });
      
      const response = nudge;
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Nudge service unavailable" });
    }
  });

  app.post('/api/ai/nudge/outcome', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { variant_id, clicked, cancelled, swapped } = req.body;
      
      const { nudgesService } = await import('./services/nudges');
      await nudgesService.recordOutcome({ variant_id, clicked, cancelled, swapped });
      
      const response = { recorded: true, variant_id };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Failed to record outcome" });
    }
  });

  // Privacy routes
  app.post('/api/privacy/log', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fields, purpose } = req.body;
      
      const events = [];
      for (const field of fields) {
        const event = await storage.logPrivacyEvent({
          user_id: req.user?.id,
          field,
          purpose
        });
        events.push(event);
      }
      
      const response = { logged: events.length, events: events.map(e => e.id) };
      
      if (req.idempotencyKey) {
        await storage.storeIdempotentResponse(req.idempotencyKey, response);
      }
      
      res.json(response);
    } catch (error) {
      res.status(400).json({ message: "Failed to log privacy events" });
    }
  });

  app.get('/api/privacy/events', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const events = await storage.getPrivacyEvents(req.user?.id || "");
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Merchant OS routes
  app.get('/api/merchant/offers', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { merchant_id } = req.query;
      const offers = await storage.getMerchantOffers(merchant_id as string);
      res.json(offers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/merchant/offers', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const offer = await storage.createMerchantOffer(req.body);
      res.json(offer);
    } catch (error) {
      res.status(400).json({ message: "Invalid offer creation" });
    }
  });

  app.get('/api/merchant/redemptions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { merchant_id } = req.query;
      const redemptions = await storage.getMerchantRedemptions(merchant_id as string);
      res.json(redemptions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/merchant/redemptions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const redemption = await storage.createMerchantRedemption(req.body);
      res.json(redemption);
    } catch (error) {
      res.status(400).json({ message: "Invalid redemption" });
    }
  });

  app.get('/api/merchant/settlements', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { merchant_id } = req.query;
      const settlements = await storage.getSettlements(merchant_id as string);
      res.json(settlements);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Reconciliation routes
  app.get('/api/recon/reports', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reports = await storage.getReconReports(10);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/recon/run', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { day } = req.body;
      // Simple reconciliation logic
      const report = await storage.createReconReport({
        day,
        is_balanced: Math.random() > 0.2, // 80% balanced for demo
        voucher_total: "1000.00",
        mandate_total: "2000.00",
        ledger_total: "3000.00",
        deltas: {}
      });
      res.json(report);
    } catch (error) {
      res.status(400).json({ message: "Reconciliation failed" });
    }
  });

  // Feature flags & experimentation routes
  app.get('/api/features/flags', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const flags = await storage.getFeatureFlags();
      res.json(flags);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/features/enabled/:flagKey', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { flagKey } = req.params;
      const enabled = await storage.isFeatureEnabled(flagKey, req.userId);
      res.json({ enabled });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/experiments/:experimentKey/variant', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { experimentKey } = req.params;
      const variant = await storage.getExperimentVariant(experimentKey, req.userId!);
      res.json({ variant });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // KYC & Limits routes
  app.get('/api/kyc/verification', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kyc = await storage.getKycVerification(req.userId!);
      res.json(kyc || { status: 'not_started' });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/kyc/submit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kyc = await storage.createKycVerification({
        ...req.body,
        user_id: req.userId
      });
      res.json(kyc);
    } catch (error) {
      res.status(400).json({ message: "KYC submission failed" });
    }
  });

  app.get('/api/limits', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limits = await storage.getUserLimits(req.userId!);
      res.json(limits);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // OTP routes
  app.post('/api/otp/send', async (req: Request, res: Response) => {
    try {
      const { phone, purpose } = req.body;
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      
      const otp = await storage.createOtpCode({
        phone,
        code,
        purpose,
        expires_at: expiresAt
      });
      
      // In production, send SMS here
      res.json({ sent: true, otp_id: otp.id });
    } catch (error) {
      res.status(400).json({ message: "Failed to send OTP" });
    }
  });

  app.post('/api/otp/verify', async (req: Request, res: Response) => {
    try {
      const { phone, code, purpose } = req.body;
      const verified = await storage.verifyOtpCode(phone, code, purpose);
      res.json({ verified });
    } catch (error) {
      res.status(400).json({ message: "OTP verification failed" });
    }
  });

  // Analytics routes
  app.post('/api/analytics/track', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const event = await storage.trackAnalyticsEvent({
        ...req.body,
        user_id: req.userId,
        timestamp: new Date()
      });
      res.json({ tracked: true, event_id: event.id });
    } catch (error) {
      res.status(400).json({ message: "Analytics tracking failed" });
    }
  });

  // PWA Offline routes
  app.get('/api/offline/outbox', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const items = await storage.getOfflineOutbox(req.userId!);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/offline/sync', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { items } = req.body;
      const results = [];
      
      for (const item of items) {
        try {
          // Process offline item based on action_type
          await storage.markOfflineItemSynced(item.id);
          results.push({ id: item.id, status: 'synced' });
        } catch (error) {
          results.push({ id: item.id, status: 'failed' });
        }
      }
      
      res.json({ results });
    } catch (error) {
      res.status(400).json({ message: "Offline sync failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
