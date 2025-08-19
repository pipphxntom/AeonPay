import { type User, type InsertUser, type Plan, type InsertPlan, type Merchant, type Campus, type Voucher, type Mandate, type Transaction } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Plans
  getPlan(id: string): Promise<Plan | undefined>;
  getUserPlans(userId: string): Promise<Plan[]>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, updates: Partial<Plan>): Promise<Plan | undefined>;

  // Merchants
  getMerchants(campusId?: string): Promise<Merchant[]>;
  getMerchant(id: string): Promise<Merchant | undefined>;

  // Vouchers
  createVoucher(voucher: any): Promise<Voucher>;
  getVouchersByPlan(planId: string): Promise<Voucher[]>;
  redeemVouchers(vouchers: any[]): Promise<any>;

  // Mandates
  createMandate(mandate: any): Promise<Mandate>;
  getMandatesByPlan(planId: string): Promise<Mandate[]>;
  executeMandate(mandateId: string, amount: number): Promise<any>;

  // Transactions
  createTransaction(transaction: any): Promise<Transaction>;
  updateTransaction(id: string, updates: any): Promise<Transaction | undefined>;
  
  // Idempotency
  checkIdempotency(key: string): Promise<any>;
  storeIdempotentResponse(key: string, response: any): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private plans: Map<string, Plan> = new Map();
  private merchants: Map<string, Merchant> = new Map();
  private campuses: Map<string, Campus> = new Map();
  private vouchers: Map<string, Voucher> = new Map();
  private mandates: Map<string, Mandate> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private planMembers: Map<string, any> = new Map();
  private idempotentRequests: Map<string, any> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed campuses
    const campusIds = ["campus-1", "campus-2", "campus-3"];
    const campusNames = ["Tech Campus North", "Business Campus Central", "Arts Campus South"];
    
    campusIds.forEach((id, index) => {
      this.campuses.set(id, {
        id,
        name: campusNames[index],
        location: `Location ${index + 1}`,
      });
    });

    // Seed merchants
    const merchantCategories = [
      { name: "Chai Point", category: "beverages", icon: "☕" },
      { name: "Pizza Corner", category: "food", icon: "🍕" },
      { name: "Sandwich Station", category: "food", icon: "🥪" },
      { name: "Juice Bar", category: "beverages", icon: "🥤" },
      { name: "Canteen Central", category: "food", icon: "🍽️" },
      { name: "Coffee Bean", category: "beverages", icon: "☕" },
      { name: "Rolls & Wraps", category: "food", icon: "🌯" },
      { name: "Fresh Fruits", category: "snacks", icon: "🍎" },
      { name: "Ice Cream Parlor", category: "desserts", icon: "🍦" },
      { name: "Bakery Corner", category: "snacks", icon: "🥐" },
    ];

    campusIds.forEach(campusId => {
      merchantCategories.forEach((merchant, index) => {
        const id = `merchant-${campusId}-${index}`;
        this.merchants.set(id, {
          id,
          name: merchant.name,
          category: merchant.category,
          campus_id: campusId,
          icon: merchant.icon,
          location: `Shop ${index + 1}`,
        });
      });
    });

    // Seed users
    const userNames = [
      "John Doe", "Jane Smith", "Alice Johnson", "Bob Wilson",
      "Carol Brown", "David Lee", "Emma Davis", "Frank Miller"
    ];
    
    userNames.forEach((name, index) => {
      const id = `user-${index + 1}`;
      this.users.set(id, {
        id,
        phone: `+91 9876543${index.toString().padStart(3, '0')}`,
        name,
        email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
        avatar: null,
        created_at: new Date(),
      });
    });

    // Seed demo plans
    const demoPlan1: Plan = {
      id: "plan-demo-1",
      name: "Birthday Party",
      cap_per_head: "300.00",
      window_start: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      window_end: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
      merchant_whitelist: ["merchant-campus-1-0", "merchant-campus-1-1"],
      status: "active",
      created_by: "user-1",
      created_at: new Date(),
    };

    const demoPlan2: Plan = {
      id: "plan-demo-2", 
      name: "Movie Night",
      cap_per_head: "200.00",
      window_start: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
      window_end: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
      merchant_whitelist: ["merchant-campus-1-2", "merchant-campus-1-3"],
      status: "active",
      created_by: "user-2",
      created_at: new Date(),
    };

    this.plans.set(demoPlan1.id, demoPlan1);
    this.plans.set(demoPlan2.id, demoPlan2);

    // Seed plan members
    ["user-1", "user-2", "user-3", "user-4", "user-5"].forEach((userId, index) => {
      this.planMembers.set(`member-${demoPlan1.id}-${userId}`, {
        id: `member-${demoPlan1.id}-${userId}`,
        plan_id: demoPlan1.id,
        user_id: userId,
        state: "active",
        joined_at: new Date(),
      });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.phone === phone);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      id,
      email: insertUser.email || null,
      avatar: insertUser.avatar || null,
      created_at: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    return this.plans.get(id);
  }

  async getUserPlans(userId: string): Promise<Plan[]> {
    const userPlanIds = Array.from(this.planMembers.values())
      .filter(member => member.user_id === userId && member.state === "active")
      .map(member => member.plan_id);
    
    return Array.from(this.plans.values())
      .filter(plan => userPlanIds.includes(plan.id) || plan.created_by === userId);
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const id = randomUUID();
    const plan: Plan = { 
      ...insertPlan,
      id,
      status: insertPlan.status || "active",
      merchant_whitelist: insertPlan.merchant_whitelist || [],
      created_by: insertPlan.created_by || null,
      created_at: new Date() 
    };
    this.plans.set(id, plan);
    return plan;
  }

  async updatePlan(id: string, updates: Partial<Plan>): Promise<Plan | undefined> {
    const plan = this.plans.get(id);
    if (!plan) return undefined;
    
    const updatedPlan = { ...plan, ...updates };
    this.plans.set(id, updatedPlan);
    return updatedPlan;
  }

  async getMerchants(campusId?: string): Promise<Merchant[]> {
    return Array.from(this.merchants.values())
      .filter(merchant => !campusId || merchant.campus_id === campusId);
  }

  async getMerchant(id: string): Promise<Merchant | undefined> {
    return this.merchants.get(id);
  }

  async createVoucher(voucher: any): Promise<Voucher> {
    const id = randomUUID();
    const voucherObj: Voucher = { 
      ...voucher, 
      id, 
      created_at: new Date() 
    };
    this.vouchers.set(id, voucherObj);
    return voucherObj;
  }

  async getVouchersByPlan(planId: string): Promise<Voucher[]> {
    return Array.from(this.vouchers.values())
      .filter(voucher => voucher.plan_id === planId);
  }

  async redeemVouchers(vouchers: any[]): Promise<any> {
    // Mock implementation
    return { success: true, redeemed: vouchers.length };
  }

  async createMandate(mandate: any): Promise<Mandate> {
    const id = randomUUID();
    const mandateObj: Mandate = { 
      ...mandate, 
      id, 
      created_at: new Date() 
    };
    this.mandates.set(id, mandateObj);
    return mandateObj;
  }

  async getMandatesByPlan(planId: string): Promise<Mandate[]> {
    return Array.from(this.mandates.values())
      .filter(mandate => mandate.plan_id === planId);
  }

  async executeMandate(mandateId: string, amount: number): Promise<any> {
    // Mock implementation
    return { success: true, mandateId, amount };
  }

  async createTransaction(transaction: any): Promise<Transaction> {
    const id = randomUUID();
    const transactionObj: Transaction = { 
      ...transaction, 
      id, 
      created_at: new Date() 
    };
    this.transactions.set(id, transactionObj);
    return transactionObj;
  }

  async updateTransaction(id: string, updates: any): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...updates };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async checkIdempotency(key: string): Promise<any> {
    return this.idempotentRequests.get(key);
  }

  async storeIdempotentResponse(key: string, response: any): Promise<void> {
    this.idempotentRequests.set(key, {
      id: randomUUID(),
      idempotency_key: key,
      response_data: response,
      created_at: new Date(),
    });
  }
}

export const storage = new MemStorage();
