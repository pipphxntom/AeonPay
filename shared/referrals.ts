import { pgTable, text, varchar, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Referrals table
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  inviter_user_id: varchar("inviter_user_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  reward_state: text("reward_state").notNull().default("pending"), // pending, earned, claimed
  uses_count: integer("uses_count").notNull().default(0),
  max_uses: integer("max_uses").notNull().default(10),
  is_active: boolean("is_active").notNull().default(true),
});

// Plan invites table
export const plan_invites = pgTable("plan_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plan_id: varchar("plan_id").notNull(),
  invitee_phone_hash: text("invitee_phone_hash").notNull(),
  code: text("code").notNull(),
  state: text("state").notNull().default("pending"), // pending, accepted, expired
  created_at: timestamp("created_at").defaultNow(),
  expires_at: timestamp("expires_at").notNull(),
  invited_by: varchar("invited_by").notNull(),
});

// Referral redemptions table
export const referral_redemptions = pgTable("referral_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referral_code: text("referral_code").notNull(),
  redeemed_by: varchar("redeemed_by").notNull(),
  redeemed_at: timestamp("redeemed_at").defaultNow(),
  reward_points: integer("reward_points").notNull().default(1),
  plan_id: varchar("plan_id"), // If redeemed through plan invite
});

// Campus karma points table
export const campus_karma = pgTable("campus_karma", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  points: integer("points").notNull().default(0),
  level: text("level").notNull().default("fresher"), // fresher, regular, senior, ambassador
  total_referrals: integer("total_referrals").notNull().default(0),
  total_plans_created: integer("total_plans_created").notNull().default(0),
  last_activity: timestamp("last_activity").defaultNow(),
});

// Ambassador profiles table
export const ambassador_profiles = pgTable("ambassador_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().unique(),
  is_ambassador: boolean("is_ambassador").notNull().default(false),
  verified_at: timestamp("verified_at"),
  campus_id: varchar("campus_id"),
  total_credited_plans: integer("total_credited_plans").notNull().default(0),
  total_credited_redemptions: integer("total_credited_redemptions").notNull().default(0),
  ambassador_score: decimal("ambassador_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
});

// Growth tracking events
export const growth_events = pgTable("growth_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  event_type: text("event_type").notNull(), // referral_copy, referral_share, invite_redeem, plan_create
  event_data: text("event_data"), // JSON string with event details
  timestamp: timestamp("timestamp").defaultNow(),
  referral_code: text("referral_code"), // Associated referral code if applicable
});

// Type exports
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

export type PlanInvite = typeof plan_invites.$inferSelect;
export type InsertPlanInvite = typeof plan_invites.$inferInsert;

export type ReferralRedemption = typeof referral_redemptions.$inferSelect;
export type InsertReferralRedemption = typeof referral_redemptions.$inferInsert;

export type CampusKarma = typeof campus_karma.$inferSelect;
export type InsertCampusKarma = typeof campus_karma.$inferInsert;

export type AmbassadorProfile = typeof ambassador_profiles.$inferSelect;
export type InsertAmbassadorProfile = typeof ambassador_profiles.$inferInsert;

export type GrowthEvent = typeof growth_events.$inferSelect;
export type InsertGrowthEvent = typeof growth_events.$inferInsert;

// Zod schemas
export const insertReferralSchema = createInsertSchema(referrals);
export const insertPlanInviteSchema = createInsertSchema(plan_invites);
export const insertReferralRedemptionSchema = createInsertSchema(referral_redemptions);
export const insertCampusKarmaSchema = createInsertSchema(campus_karma);
export const insertAmbassadorProfileSchema = createInsertSchema(ambassador_profiles);
export const insertGrowthEventSchema = createInsertSchema(growth_events);