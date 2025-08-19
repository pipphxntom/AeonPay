// Payment provider plugin architecture
import { randomUUID } from 'crypto';

// Provider interfaces
export interface VoucherProvider {
  name: string;
  createVoucher(data: VoucherCreateData): Promise<VoucherResult>;
  redeemVoucher(voucherId: string, amount: number, merchantId: string): Promise<RedemptionResult>;
  getVoucherStatus(voucherId: string): Promise<VoucherStatus>;
  cancelVoucher(voucherId: string): Promise<boolean>;
}

export interface MandateProvider {
  name: string;
  createMandate(data: MandateCreateData): Promise<MandateResult>;
  executeMandate(mandateId: string, amount: number): Promise<ExecutionResult>;
  getMandateStatus(mandateId: string): Promise<MandateStatus>;
  cancelMandate(mandateId: string): Promise<boolean>;
}

export interface UPIProvider {
  name: string;
  initiatePayment(data: UPIPaymentData): Promise<UPIResult>;
  checkStatus(transactionId: string): Promise<UPIStatus>;
  refundPayment(transactionId: string, amount?: number): Promise<RefundResult>;
}

// Data types
interface VoucherCreateData {
  planId: string;
  userId: string;
  amount: number;
  merchantList?: string[];
  expiresAt: Date;
}

interface VoucherResult {
  voucherId: string;
  status: 'created' | 'failed';
  reference?: string;
  error?: string;
}

interface VoucherStatus {
  id: string;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  balance: number;
  redemptions: Array<{ amount: number; merchantId: string; timestamp: Date }>;
}

interface RedemptionResult {
  success: boolean;
  transactionId?: string;
  remainingBalance?: number;
  error?: string;
}

interface MandateCreateData {
  planId: string;
  userId: string;
  maxAmount: number;
  validFrom: Date;
  validTo: Date;
  frequency?: 'one-time' | 'daily' | 'weekly' | 'monthly';
}

interface MandateResult {
  mandateId: string;
  status: 'created' | 'failed';
  reference?: string;
  error?: string;
}

interface MandateStatus {
  id: string;
  status: 'active' | 'expired' | 'cancelled' | 'exhausted';
  usedAmount: number;
  maxAmount: number;
  executions: Array<{ amount: number; timestamp: Date; purpose: string }>;
}

interface ExecutionResult {
  success: boolean;
  transactionId?: string;
  executedAmount?: number;
  error?: string;
}

interface UPIPaymentData {
  amount: number;
  vpa: string;
  payeeName: string;
  transactionNote?: string;
  merchantId?: string;
}

interface UPIResult {
  transactionId: string;
  status: 'initiated' | 'failed';
  error?: string;
}

interface UPIStatus {
  transactionId: string;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  amount?: number;
  timestamp?: Date;
}

interface RefundResult {
  refundId: string;
  status: 'initiated' | 'success' | 'failed';
  refundedAmount?: number;
  error?: string;
}

// Mock implementations for development
class MockVoucherProvider implements VoucherProvider {
  name = 'MockVoucher';

  async createVoucher(data: VoucherCreateData): Promise<VoucherResult> {
    const voucherId = `voucher_${randomUUID()}`;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      voucherId,
      status: 'created',
      reference: `mock_ref_${Date.now()}`
    };
  }

  async redeemVoucher(voucherId: string, amount: number, merchantId: string): Promise<RedemptionResult> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Simulate random failures
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: 'Insufficient voucher balance'
      };
    }

    return {
      success: true,
      transactionId: `txn_${randomUUID()}`,
      remainingBalance: Math.max(0, Math.random() * 500)
    };
  }

  async getVoucherStatus(voucherId: string): Promise<VoucherStatus> {
    return {
      id: voucherId,
      status: 'active',
      balance: Math.random() * 1000,
      redemptions: [
        {
          amount: 50,
          merchantId: 'merchant-1',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      ]
    };
  }

  async cancelVoucher(voucherId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
}

class MockMandateProvider implements MandateProvider {
  name = 'MockMandate';

  async createMandate(data: MandateCreateData): Promise<MandateResult> {
    const mandateId = `mandate_${randomUUID()}`;
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      mandateId,
      status: 'created',
      reference: `mock_mandate_${Date.now()}`
    };
  }

  async executeMandate(mandateId: string, amount: number): Promise<ExecutionResult> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Simulate some failures
    if (Math.random() < 0.1) {
      return {
        success: false,
        error: 'Insufficient funds in linked account'
      };
    }

    return {
      success: true,
      transactionId: `exec_${randomUUID()}`,
      executedAmount: amount
    };
  }

  async getMandateStatus(mandateId: string): Promise<MandateStatus> {
    return {
      id: mandateId,
      status: 'active',
      usedAmount: Math.random() * 500,
      maxAmount: 1000,
      executions: [
        {
          amount: 200,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          purpose: 'Plan top-up'
        }
      ]
    };
  }

  async cancelMandate(mandateId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
}

class MockUPIProvider implements UPIProvider {
  name = 'MockUPI';

  async initiatePayment(data: UPIPaymentData): Promise<UPIResult> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Simulate failures for invalid VPAs
    if (!data.vpa.includes('@') || data.vpa.includes('invalid')) {
      return {
        transactionId: '',
        status: 'failed',
        error: 'Invalid VPA address'
      };
    }

    return {
      transactionId: `upi_${randomUUID()}`,
      status: 'initiated'
    };
  }

  async checkStatus(transactionId: string): Promise<UPIStatus> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate transaction progression
    const random = Math.random();
    if (random < 0.7) {
      return {
        transactionId,
        status: 'success',
        amount: Math.floor(Math.random() * 1000) + 10,
        timestamp: new Date()
      };
    } else if (random < 0.9) {
      return {
        transactionId,
        status: 'pending'
      };
    } else {
      return {
        transactionId,
        status: 'failed'
      };
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<RefundResult> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      refundId: `refund_${randomUUID()}`,
      status: 'initiated',
      refundedAmount: amount || Math.floor(Math.random() * 500)
    };
  }
}

// Aggregator UPI adapter (placeholder for future external integration)
class AggregatorUPIProvider implements UPIProvider {
  name = 'AggregatorUPI';
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey?: string; baseUrl?: string } = {}) {
    this.apiKey = config.apiKey || 'test_key_placeholder';
    this.baseUrl = config.baseUrl || 'https://api.example-aggregator.com';
  }

  async initiatePayment(data: UPIPaymentData): Promise<UPIResult> {
    // In development, return mock response
    if (this.apiKey === 'test_key_placeholder') {
      console.log('[AggregatorUPI] Using mock response in development');
      return new MockUPIProvider().initiatePayment(data);
    }

    try {
      // Production implementation would make actual API call
      const response = await fetch(`${this.baseUrl}/upi/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: data.amount,
          vpa: data.vpa,
          payee_name: data.payeeName,
          note: data.transactionNote,
          merchant_id: data.merchantId
        })
      });

      const result = await response.json();
      
      return {
        transactionId: result.transaction_id,
        status: result.status === 'initiated' ? 'initiated' : 'failed',
        error: result.error
      };
    } catch (error) {
      console.error('[AggregatorUPI] Payment initiation failed:', error);
      return {
        transactionId: '',
        status: 'failed',
        error: 'Service temporarily unavailable'
      };
    }
  }

  async checkStatus(transactionId: string): Promise<UPIStatus> {
    if (this.apiKey === 'test_key_placeholder') {
      return new MockUPIProvider().checkStatus(transactionId);
    }

    try {
      const response = await fetch(`${this.baseUrl}/upi/status/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const result = await response.json();
      
      return {
        transactionId,
        status: result.status,
        amount: result.amount,
        timestamp: result.timestamp ? new Date(result.timestamp) : undefined
      };
    } catch (error) {
      console.error('[AggregatorUPI] Status check failed:', error);
      return {
        transactionId,
        status: 'failed'
      };
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<RefundResult> {
    if (this.apiKey === 'test_key_placeholder') {
      return new MockUPIProvider().refundPayment(transactionId, amount);
    }

    try {
      const response = await fetch(`${this.baseUrl}/upi/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          amount
        })
      });

      const result = await response.json();
      
      return {
        refundId: result.refund_id,
        status: result.status,
        refundedAmount: result.refunded_amount
      };
    } catch (error) {
      console.error('[AggregatorUPI] Refund failed:', error);
      return {
        refundId: '',
        status: 'failed',
        error: 'Refund service temporarily unavailable'
      };
    }
  }
}

// Provider registry
class PaymentProviderRegistry {
  private voucherProviders: Map<string, VoucherProvider> = new Map();
  private mandateProviders: Map<string, MandateProvider> = new Map();
  private upiProviders: Map<string, UPIProvider> = new Map();
  
  private config = {
    vouchers: process.env.VOUCHER_PROVIDER || 'mock',
    mandates: process.env.MANDATE_PROVIDER || 'mock',
    upi: process.env.UPI_PROVIDER || 'mock'
  };

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    // Register mock providers
    this.voucherProviders.set('mock', new MockVoucherProvider());
    this.mandateProviders.set('mock', new MockMandateProvider());
    this.upiProviders.set('mock', new MockUPIProvider());
    
    // Register aggregator provider
    this.upiProviders.set('aggregator', new AggregatorUPIProvider({
      apiKey: process.env.UPI_AGGREGATOR_API_KEY,
      baseUrl: process.env.UPI_AGGREGATOR_BASE_URL
    }));
  }

  getVoucherProvider(): VoucherProvider {
    const provider = this.voucherProviders.get(this.config.vouchers);
    if (!provider) {
      throw new Error(`Voucher provider '${this.config.vouchers}' not found`);
    }
    return provider;
  }

  getMandateProvider(): MandateProvider {
    const provider = this.mandateProviders.get(this.config.mandates);
    if (!provider) {
      throw new Error(`Mandate provider '${this.config.mandates}' not found`);
    }
    return provider;
  }

  getUPIProvider(): UPIProvider {
    const provider = this.upiProviders.get(this.config.upi);
    if (!provider) {
      throw new Error(`UPI provider '${this.config.upi}' not found`);
    }
    return provider;
  }

  registerVoucherProvider(name: string, provider: VoucherProvider): void {
    this.voucherProviders.set(name, provider);
  }

  registerMandateProvider(name: string, provider: MandateProvider): void {
    this.mandateProviders.set(name, provider);
  }

  registerUPIProvider(name: string, provider: UPIProvider): void {
    this.upiProviders.set(name, provider);
  }

  getProviderConfig(): any {
    return {
      vouchers: this.config.vouchers,
      mandates: this.config.mandates,
      upi: this.config.upi,
      available_providers: {
        vouchers: Array.from(this.voucherProviders.keys()),
        mandates: Array.from(this.mandateProviders.keys()),
        upi: Array.from(this.upiProviders.keys())
      }
    };
  }
}

export const paymentRegistry = new PaymentProviderRegistry();