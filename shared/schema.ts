import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  avatar: text("avatar"),
  created_at: timestamp("created_at").defaultNow(),
});

// Campuses table
export const campuses = pgTable("campuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull(),
});

// Merchants table
export const merchants = pgTable("merchants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  campus_id: varchar("campus_id").references(() => campuses.id),
  icon: text("icon"),
  location: text("location"),
});

// Plans table
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cap_per_head: decimal("cap_per_head", { precision: 10, scale: 2 }).notNull(),
  window_start: timestamp("window_start").notNull(),
  window_end: timestamp("window_end").notNull(),
  merchant_whitelist: jsonb("merchant_whitelist").default([]),
  status: text("status").notNull().default("active"), // active, completed, cancelled
  created_by: varchar("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Plan members table
export const plan_members = pgTable("plan_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plan_id: varchar("plan_id").references(() => plans.id),
  user_id: varchar("user_id").references(() => users.id),
  state: text("state").notNull().default("active"), // active, left, removed
  joined_at: timestamp("joined_at").defaultNow(),
});

// Vouchers table
export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plan_id: varchar("plan_id").references(() => plans.id),
  member_user_id: varchar("member_user_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  merchant_list: jsonb("merchant_list").default([]),
  expires_at: timestamp("expires_at").notNull(),
  state: text("state").notNull().default("active"), // active, redeemed, expired
  created_at: timestamp("created_at").defaultNow(),
});

// Mandates table
export const mandates = pgTable("mandates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plan_id: varchar("plan_id").references(() => plans.id),
  member_user_id: varchar("member_user_id").references(() => users.id),
  cap_amount: decimal("cap_amount", { precision: 10, scale: 2 }).notNull(),
  valid_from: timestamp("valid_from").notNull(),
  valid_to: timestamp("valid_to").notNull(),
  state: text("state").notNull().default("active"), // active, expired, cancelled
  created_at: timestamp("created_at").defaultNow(),
});

// Voucher redemptions table
export const voucher_redemptions = pgTable("voucher_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucher_id: varchar("voucher_id").references(() => vouchers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  merchant_id: varchar("merchant_id").references(() => merchants.id),
  transaction_id: varchar("transaction_id"),
  created_at: timestamp("created_at").defaultNow(),
});

// Mandate executions table
export const mandate_executions = pgTable("mandate_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mandate_id: varchar("mandate_id").references(() => mandates.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  merchant_id: varchar("merchant_id").references(() => merchants.id),
  transaction_id: varchar("transaction_id"),
  status: text("status").notNull(), // success, failed
  created_at: timestamp("created_at").defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intent_id: varchar("intent_id").unique().notNull(),
  plan_id: varchar("plan_id").references(() => plans.id),
  merchant_id: varchar("merchant_id").references(() => merchants.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  mode: text("mode").notNull(), // vouchers, mandates, split_later
  status: text("status").notNull().default("pending"), // pending, completed, failed
  rrn_stub: text("rrn_stub"),
  created_at: timestamp("created_at").defaultNow(),
});

// Ledger entries table
export const ledger_entries = pgTable("ledger_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  txn_id: varchar("txn_id").references(() => transactions.id),
  account: text("account").notNull(),
  leg: text("leg").notNull(), // debit, credit
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Idempotent requests table
export const idempotent_requests = pgTable("idempotent_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  idempotency_key: text("idempotency_key").unique().notNull(),
  response_data: jsonb("response_data"),
  created_at: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  created_at: true,
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
  created_at: true,
});

export const insertMandateSchema = createInsertSchema(mandates).omit({
  id: true,
  created_at: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  created_at: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type Mandate = typeof mandates.$inferSelect;
export type InsertMandate = z.infer<typeof insertMandateSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Merchant = typeof merchants.$inferSelect;
export type Campus = typeof campuses.$inferSelect;
export type PlanMember = typeof plan_members.$inferSelect;
