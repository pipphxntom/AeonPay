import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, date, decimal, boolean } from "drizzle-orm/pg-core";
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

// Swaps table
export const swaps = pgTable("swaps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mode: text("mode").notNull(), // 'peer' | 'merchant'
  direction: text("direction").notNull(), // 'cash_to_upi' | 'upi_to_cash'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  state: text("state").notNull().default("open"), // 'open' | 'matched' | 'paid' | 'confirmed' | 'disputed'
  location_latlng: text("location_latlng"), // "lat,lng"
  created_by: varchar("created_by").references(() => users.id),
  matched_with: varchar("matched_with").references(() => users.id),
  swap_code: varchar("swap_code"), // For handshake
  created_at: timestamp("created_at").defaultNow(),
});

// Swap events table
export const swap_events = pgTable("swap_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  swap_id: varchar("swap_id").references(() => swaps.id),
  event: text("event").notNull(),
  meta: jsonb("meta"),
  created_at: timestamp("created_at").defaultNow(),
});

// Partners table (merchant swap partners)
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location_latlng: text("location_latlng"),
  upi_id: text("upi_id"),
  incentive_amount: decimal("incentive_amount", { precision: 10, scale: 2 }),
});

// UPI ATMs table
export const upi_atms = pgTable("upi_atms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location_latlng: text("location_latlng").notNull(),
  provider: text("provider").notNull(),
  address: text("address"),
});

// Privacy events table
export const privacy_events = pgTable("privacy_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id),
  field: text("field").notNull(),
  purpose: text("purpose").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Nudges arms table (A/B testing for AI nudges)
export const nudges_arms = pgTable("nudges_arms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  event_type: text("event_type").notNull(),
  arm_key: text("arm_key").notNull().unique(),
  copy_text: text("copy_text").notNull(),
  cta_text: text("cta_text"),
  active: boolean("active").default(true),
  rewards_sum: decimal("rewards_sum", { precision: 10, scale: 2 }).default("0"),
  trials_count: integer("trials_count").default(0),
});

// Nudges events table (tracking outcomes)
export const nudges_events = pgTable("nudges_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arm_key: text("arm_key").references(() => nudges_arms.arm_key),
  context: jsonb("context"),
  outcome: text("outcome"), // 'shown', 'clicked', 'cancelled', 'swapped'
  reward: decimal("reward", { precision: 10, scale: 2 }),
  created_at: timestamp("created_at").defaultNow(),
});

// Merchant OS tables
export const merchant_offers = pgTable("merchant_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchant_id: varchar("merchant_id").references(() => merchants.id),
  label: text("label").notNull(),
  description: text("description"),
  cap_price_per_head: decimal("cap_price_per_head", { precision: 10, scale: 2 }).notNull(),
  window_start: text("window_start").notNull(),
  window_end: text("window_end").notNull(),
  days_of_week: jsonb("days_of_week").notNull(), // JSON array [0,1,2,3,4,5,6]
  is_active: boolean("is_active").default(true),
  terms: text("terms"),
  max_redemptions_per_day: integer("max_redemptions_per_day"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const merchant_redemptions = pgTable("merchant_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchant_id: varchar("merchant_id").references(() => merchants.id),
  user_id: varchar("user_id").references(() => users.id),
  plan_id: varchar("plan_id").references(() => plans.id),
  voucher_id: varchar("voucher_id").references(() => vouchers.id),
  mandate_id: varchar("mandate_id").references(() => mandates.id),
  offer_id: varchar("offer_id").references(() => merchant_offers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  original_amount: decimal("original_amount", { precision: 10, scale: 2 }),
  discount_amount: decimal("discount_amount", { precision: 10, scale: 2 }),
  payment_method: text("payment_method").notNull(),
  status: text("status").notNull(), // redeemed, refunded, disputed
  metadata: jsonb("metadata"),
  redeemed_at: timestamp("redeemed_at").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
});

export const merchant_flags = pgTable("merchant_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchant_id: varchar("merchant_id").references(() => merchants.id),
  redemption_id: varchar("redemption_id").references(() => merchant_redemptions.id),
  flag_type: text("flag_type").notNull(),
  description: text("description"),
  status: text("status").default("pending"),
  created_by: varchar("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

export const settlements = pgTable("settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchant_id: varchar("merchant_id").references(() => merchants.id),
  settlement_date: date("settlement_date").notNull(),
  gross_amount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull(),
  tax_amount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
  net_amount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, processed, failed
  processed_at: timestamp("processed_at"),
  reference_number: text("reference_number"),
  created_at: timestamp("created_at").defaultNow(),
});

// Reconciliation tables
export const recon_reports = pgTable("recon_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  day: date("day").notNull(),
  is_balanced: boolean("is_balanced").notNull(),
  voucher_total: decimal("voucher_total", { precision: 10, scale: 2 }).notNull(),
  mandate_total: decimal("mandate_total", { precision: 10, scale: 2 }).notNull(),
  ledger_total: decimal("ledger_total", { precision: 10, scale: 2 }).notNull(),
  deltas: jsonb("deltas"),
  created_at: timestamp("created_at").defaultNow(),
});

// Feature flags & experimentation
export const feature_flags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flag_key: text("flag_key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  is_enabled: boolean("is_enabled").default(false),
  rollout_percentage: integer("rollout_percentage").default(0),
  targeting_rules: jsonb("targeting_rules"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const experiment_assignments = pgTable("experiment_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id),
  experiment_key: text("experiment_key").notNull(),
  variant: text("variant").notNull(),
  assigned_at: timestamp("assigned_at").defaultNow(),
});

// KYC & Limits
export const kyc_verifications = pgTable("kyc_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id),
  kyc_level: text("kyc_level").notNull(), // basic, plus, premium
  name: text("name"),
  date_of_birth: date("date_of_birth"),
  document_type: text("document_type"),
  document_number: text("document_number"),
  document_url: text("document_url"),
  verification_status: text("verification_status").default("pending"),
  verified_at: timestamp("verified_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const user_limits = pgTable("user_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id),
  limit_type: text("limit_type").notNull(), // daily_swap, monthly_spend
  current_usage: decimal("current_usage", { precision: 10, scale: 2 }).default("0"),
  limit_amount: decimal("limit_amount", { precision: 10, scale: 2 }).notNull(),
  reset_period: text("reset_period").notNull(), // daily, monthly
  last_reset: timestamp("last_reset").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
});

// OTP system
export const otp_codes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  purpose: text("purpose").notNull(), // login, kyc_upgrade
  attempts: integer("attempts").default(0),
  is_verified: boolean("is_verified").default(false),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Analytics events
export const analytics_events = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id),
  session_id: text("session_id"),
  event_name: text("event_name").notNull(),
  properties: jsonb("properties"),
  timestamp: timestamp("timestamp").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// PWA offline outbox
export const offline_outbox = pgTable("offline_outbox", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id),
  action_type: text("action_type").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").default("pending"), // pending, synced, failed
  retry_count: integer("retry_count").default(0),
  created_at: timestamp("created_at").defaultNow(),
  synced_at: timestamp("synced_at"),
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

export const insertSwapSchema = createInsertSchema(swaps).omit({
  id: true,
  created_at: true,
});

export const insertSwapEventSchema = createInsertSchema(swap_events).omit({
  id: true,
  created_at: true,
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
});

export const insertUpiAtmSchema = createInsertSchema(upi_atms).omit({
  id: true,
});

export const insertPrivacyEventSchema = createInsertSchema(privacy_events).omit({
  id: true,
  created_at: true,
});

export const insertNudgesArmSchema = createInsertSchema(nudges_arms).omit({
  id: true,
});

export const insertNudgesEventSchema = createInsertSchema(nudges_events).omit({
  id: true,
  created_at: true,
});

export const insertMerchantOfferSchema = createInsertSchema(merchant_offers).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertMerchantRedemptionSchema = createInsertSchema(merchant_redemptions).omit({
  id: true,
  created_at: true,
  redeemed_at: true,
});

export const insertMerchantFlagSchema = createInsertSchema(merchant_flags).omit({
  id: true,
  created_at: true,
});

export const insertSettlementSchema = createInsertSchema(settlements).omit({
  id: true,
  created_at: true,
});

export const insertFeatureFlagSchema = createInsertSchema(feature_flags).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertKycVerificationSchema = createInsertSchema(kyc_verifications).omit({
  id: true,
  created_at: true,
});

export const insertOtpCodeSchema = createInsertSchema(otp_codes).omit({
  id: true,
  created_at: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analytics_events).omit({
  id: true,
  created_at: true,
});

export const insertOfflineOutboxSchema = createInsertSchema(offline_outbox).omit({
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
export type Swap = typeof swaps.$inferSelect;
export type InsertSwap = z.infer<typeof insertSwapSchema>;
export type SwapEvent = typeof swap_events.$inferSelect;
export type InsertSwapEvent = z.infer<typeof insertSwapEventSchema>;
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type UpiAtm = typeof upi_atms.$inferSelect;
export type InsertUpiAtm = z.infer<typeof insertUpiAtmSchema>;
export type PrivacyEvent = typeof privacy_events.$inferSelect;
export type InsertPrivacyEvent = z.infer<typeof insertPrivacyEventSchema>;
export type NudgesArm = typeof nudges_arms.$inferSelect;
export type InsertNudgesArm = z.infer<typeof insertNudgesArmSchema>;
export type NudgesEvent = typeof nudges_events.$inferSelect;
export type InsertNudgesEvent = z.infer<typeof insertNudgesEventSchema>;

export type MerchantOffer = typeof merchant_offers.$inferSelect;
export type InsertMerchantOffer = z.infer<typeof insertMerchantOfferSchema>;
export type MerchantRedemption = typeof merchant_redemptions.$inferSelect;
export type InsertMerchantRedemption = z.infer<typeof insertMerchantRedemptionSchema>;
export type MerchantFlag = typeof merchant_flags.$inferSelect;
export type InsertMerchantFlag = z.infer<typeof insertMerchantFlagSchema>;
export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type ReconReport = typeof recon_reports.$inferSelect;
export type FeatureFlag = typeof feature_flags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type ExperimentAssignment = typeof experiment_assignments.$inferSelect;
export type KycVerification = typeof kyc_verifications.$inferSelect;
export type InsertKycVerification = z.infer<typeof insertKycVerificationSchema>;
export type UserLimit = typeof user_limits.$inferSelect;
export type OtpCode = typeof otp_codes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type AnalyticsEvent = typeof analytics_events.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type OfflineOutbox = typeof offline_outbox.$inferSelect;
export type InsertOfflineOutbox = z.infer<typeof insertOfflineOutboxSchema>;
