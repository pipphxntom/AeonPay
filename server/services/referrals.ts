import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

interface ReferralService {
  generateReferralCode(userId: string): Promise<string>;
  createPlanInvite(planId: string, inviterUserId: string, inviteePhone: string): Promise<{ code: string; deepLink: string }>;
  redeemReferral(code: string, userId: string): Promise<{ success: boolean; points?: number; message: string }>;
  redeemPlanInvite(code: string, userId: string): Promise<{ success: boolean; planId?: string; message: string }>;
  getUserReferrals(userId: string): Promise<any[]>;
  getCampusKarma(userId: string): Promise<any>;
  updateAmbassadorStats(userId: string, event: 'plan_create' | 'redemption'): Promise<void>;
  trackGrowthEvent(userId: string, eventType: string, data?: any): Promise<void>;
}

class ReferralManager implements ReferralService {
  private storage: any;
  private baseUrl: string;

  constructor(storage: any) {
    this.storage = storage;
    this.baseUrl = process.env.BASE_URL || 'https://your-replit-app.replit.app';
  }

  async generateReferralCode(userId: string): Promise<string> {
    // Generate human-friendly referral code
    const timestamp = Date.now().toString(36);
    const userHash = createHash('sha256').update(userId).digest('hex').substring(0, 4);
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const code = `${userHash.toUpperCase()}${randomPart}${timestamp.toUpperCase()}`;
    
    try {
      // Check if code already exists
      const existing = await this.storage.getReferralByCode(code);
      if (existing) {
        // Regenerate if collision
        return this.generateReferralCode(userId);
      }

      // Create referral record
      await this.storage.createReferral({
        id: randomUUID(),
        code,
        inviter_user_id: userId,
        reward_state: 'pending',
        uses_count: 0,
        max_uses: 10,
        is_active: true
      });

      await this.trackGrowthEvent(userId, 'referral_code_generated', { code });
      
      return code;
    } catch (error) {
      console.error('[Referrals] Failed to generate referral code:', error);
      throw new Error('Failed to generate referral code');
    }
  }

  async createPlanInvite(planId: string, inviterUserId: string, inviteePhone: string): Promise<{ code: string; deepLink: string }> {
    // Hash the phone number for privacy
    const phoneHash = createHash('sha256').update(inviteePhone).digest('hex');
    
    // Generate invite code
    const inviteCode = `PLAN${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    try {
      // Create plan invite record
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await this.storage.createPlanInvite({
        id: randomUUID(),
        plan_id: planId,
        invitee_phone_hash: phoneHash,
        code: inviteCode,
        state: 'pending',
        expires_at: expiresAt,
        invited_by: inviterUserId
      });

      // Generate deep link
      const deepLink = `aeonpay://plan/${planId}/reserve?code=${inviteCode}`;
      
      await this.trackGrowthEvent(inviterUserId, 'plan_invite_created', { 
        planId, 
        inviteCode,
        expiresAt: expiresAt.toISOString()
      });

      return { code: inviteCode, deepLink };
    } catch (error) {
      console.error('[Referrals] Failed to create plan invite:', error);
      throw new Error('Failed to create plan invite');
    }
  }

  async redeemReferral(code: string, userId: string): Promise<{ success: boolean; points?: number; message: string }> {
    try {
      const referral = await this.storage.getReferralByCode(code);
      
      if (!referral) {
        return { success: false, message: 'Invalid referral code' };
      }

      if (!referral.is_active) {
        return { success: false, message: 'Referral code is no longer active' };
      }

      if (referral.inviter_user_id === userId) {
        return { success: false, message: 'Cannot use your own referral code' };
      }

      if (referral.uses_count >= referral.max_uses) {
        return { success: false, message: 'Referral code has reached maximum uses' };
      }

      // Check if user already redeemed this code
      const existingRedemption = await this.storage.getReferralRedemption(code, userId);
      if (existingRedemption) {
        return { success: false, message: 'You have already used this referral code' };
      }

      // Abuse control: check recent redemptions from same user
      const recentRedemptions = await this.storage.getRecentReferralRedemptions(userId, 24); // Last 24 hours
      if (recentRedemptions.length >= 5) {
        return { success: false, message: 'Too many referral redemptions. Please try again later.' };
      }

      const rewardPoints = 1; // Campus Karma +1

      // Create redemption record
      await this.storage.createReferralRedemption({
        id: randomUUID(),
        referral_code: code,
        redeemed_by: userId,
        reward_points: rewardPoints
      });

      // Update referral usage count
      await this.storage.updateReferral(referral.id, {
        uses_count: referral.uses_count + 1
      });

      // Update campus karma for both users
      await this.updateCampusKarma(userId, rewardPoints);
      await this.updateCampusKarma(referral.inviter_user_id, rewardPoints);

      await this.trackGrowthEvent(userId, 'referral_redeemed', { code, rewardPoints });
      await this.trackGrowthEvent(referral.inviter_user_id, 'referral_earned', { code, rewardPoints });

      return { 
        success: true, 
        points: rewardPoints, 
        message: `Campus Karma +${rewardPoints}! Welcome to the community 🎉` 
      };
    } catch (error) {
      console.error('[Referrals] Failed to redeem referral:', error);
      return { success: false, message: 'Failed to process referral. Please try again.' };
    }
  }

  async redeemPlanInvite(code: string, userId: string): Promise<{ success: boolean; planId?: string; message: string }> {
    try {
      const invite = await this.storage.getPlanInvite(code);
      
      if (!invite) {
        return { success: false, message: 'Invalid invite code' };
      }

      if (invite.state !== 'pending') {
        return { success: false, message: 'Invite has already been used or expired' };
      }

      if (new Date() > new Date(invite.expires_at)) {
        await this.storage.updatePlanInvite(invite.id, { state: 'expired' });
        return { success: false, message: 'Invite has expired' };
      }

      if (invite.invited_by === userId) {
        return { success: false, message: 'Cannot use your own plan invite' };
      }

      // Mark invite as accepted
      await this.storage.updatePlanInvite(invite.id, { state: 'accepted' });

      // Award karma points for successful invite redemption
      await this.updateCampusKarma(userId, 1);
      await this.updateCampusKarma(invite.invited_by, 2); // Bonus for successful invite

      await this.trackGrowthEvent(userId, 'plan_invite_redeemed', { code, planId: invite.plan_id });
      await this.trackGrowthEvent(invite.invited_by, 'plan_invite_accepted', { code, planId: invite.plan_id });

      return { 
        success: true, 
        planId: invite.plan_id, 
        message: 'Successfully joined the plan!' 
      };
    } catch (error) {
      console.error('[Referrals] Failed to redeem plan invite:', error);
      return { success: false, message: 'Failed to process invite. Please try again.' };
    }
  }

  async getUserReferrals(userId: string): Promise<any[]> {
    try {
      const referrals = await this.storage.getUserReferrals(userId);
      return referrals.map((ref: any) => ({
        code: ref.code,
        uses_count: ref.uses_count,
        max_uses: ref.max_uses,
        is_active: ref.is_active,
        created_at: ref.created_at,
        reward_state: ref.reward_state
      }));
    } catch (error) {
      console.error('[Referrals] Failed to get user referrals:', error);
      return [];
    }
  }

  async getCampusKarma(userId: string): Promise<any> {
    try {
      let karma = await this.storage.getCampusKarma(userId);
      
      if (!karma) {
        // Create initial karma record
        karma = await this.storage.createCampusKarma({
          id: randomUUID(),
          user_id: userId,
          points: 0,
          level: 'fresher',
          total_referrals: 0,
          total_plans_created: 0
        });
      }

      // Calculate level based on points
      const level = this.calculateKarmaLevel(karma.points);
      if (level !== karma.level) {
        await this.storage.updateCampusKarma(karma.id, { level });
        karma.level = level;
      }

      return karma;
    } catch (error) {
      console.error('[Referrals] Failed to get campus karma:', error);
      return { points: 0, level: 'fresher', total_referrals: 0, total_plans_created: 0 };
    }
  }

  async updateAmbassadorStats(userId: string, event: 'plan_create' | 'redemption'): Promise<void> {
    try {
      let profile = await this.storage.getAmbassadorProfile(userId);
      
      if (!profile) {
        profile = await this.storage.createAmbassadorProfile({
          id: randomUUID(),
          user_id: userId,
          is_ambassador: false,
          total_credited_plans: 0,
          total_credited_redemptions: 0,
          ambassador_score: '0.00'
        });
      }

      const updates: any = {};
      
      if (event === 'plan_create') {
        updates.total_credited_plans = profile.total_credited_plans + 1;
      } else if (event === 'redemption') {
        updates.total_credited_redemptions = profile.total_credited_redemptions + 1;
      }

      // Calculate ambassador score (weighted)
      const planWeight = 5; // Plans are worth more
      const redemptionWeight = 1;
      const newScore = (updates.total_credited_plans || profile.total_credited_plans) * planWeight + 
                      (updates.total_credited_redemptions || profile.total_credited_redemptions) * redemptionWeight;
      updates.ambassador_score = newScore.toFixed(2);

      // Auto-promote to ambassador if score is high enough
      if (newScore >= 50 && !profile.is_ambassador) {
        updates.is_ambassador = true;
        updates.verified_at = new Date();
        await this.trackGrowthEvent(userId, 'ambassador_promoted', { score: newScore });
      }

      await this.storage.updateAmbassadorProfile(profile.id, updates);
    } catch (error) {
      console.error('[Referrals] Failed to update ambassador stats:', error);
    }
  }

  async trackGrowthEvent(userId: string, eventType: string, data?: any): Promise<void> {
    try {
      await this.storage.createGrowthEvent({
        id: randomUUID(),
        user_id: userId,
        event_type: eventType,
        event_data: data ? JSON.stringify(data) : null,
        referral_code: data?.code || null
      });
    } catch (error) {
      console.error('[Referrals] Failed to track growth event:', error);
    }
  }

  private async updateCampusKarma(userId: string, points: number): Promise<void> {
    try {
      let karma = await this.storage.getCampusKarma(userId);
      
      if (!karma) {
        karma = await this.storage.createCampusKarma({
          id: randomUUID(),
          user_id: userId,
          points,
          level: 'fresher',
          total_referrals: 0,
          total_plans_created: 0
        });
      } else {
        await this.storage.updateCampusKarma(karma.id, {
          points: karma.points + points,
          last_activity: new Date()
        });
      }
    } catch (error) {
      console.error('[Referrals] Failed to update campus karma:', error);
    }
  }

  private calculateKarmaLevel(points: number): string {
    if (points >= 100) return 'ambassador';
    if (points >= 50) return 'senior';
    if (points >= 20) return 'regular';
    return 'fresher';
  }

  // Generate share URLs for different platforms
  generateShareUrls(referralCode: string): { whatsapp: string; copy: string; generic: string } {
    const message = `Hey! Join AeonPay for smart campus payments. Use my code ${referralCode} to get started! ${this.baseUrl}/join?ref=${referralCode}`;
    
    return {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      copy: referralCode,
      generic: `${this.baseUrl}/join?ref=${referralCode}`
    };
  }
}

export { ReferralManager, type ReferralService };