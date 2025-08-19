import { storage } from '../storage';

interface NudgeRequest {
  event_type: string;
  context: any;
}

interface NudgeResponse {
  variant_id: string;
  text: string;
  cta?: string;
}

interface NudgeOutcome {
  variant_id: string;
  clicked?: boolean;
  cancelled?: boolean;
  swapped?: boolean;
}

// Thompson Sampling implementation for multi-armed bandit
export class ThompsonSamplingNudges {
  
  async getNudge(request: NudgeRequest): Promise<NudgeResponse> {
    try {
      // Get all active arms for this event type
      const arms = await storage.getNudgeArms(request.event_type);
      
      if (arms.length === 0) {
        // Fallback nudge
        return {
          variant_id: 'fallback',
          text: 'Consider your spending carefully to stay within budget.',
          cta: 'Got it'
        };
      }

      // Thompson Sampling: sample from Beta distribution for each arm
      let bestArm = arms[0];
      let bestSample = 0;

      for (const arm of arms) {
        const rewardSum = parseFloat(arm.rewards_sum?.toString() || "0");
        const trials = arm.trials_count || 0;
        const alpha = rewardSum + 1; // Success count + 1
        const beta = trials - rewardSum + 1; // Failure count + 1
        
        // Simple approximation of Beta(alpha, beta) sampling
        const sample = this.sampleBeta(alpha, beta);
        
        if (sample > bestSample) {
          bestSample = sample;
          bestArm = arm;
        }
      }

      // Record that this arm was shown
      await storage.recordNudgeEvent({
        arm_key: bestArm.arm_key,
        context: request.context,
        outcome: 'shown',
        reward: 0
      });

      return {
        variant_id: bestArm.arm_key,
        text: bestArm.copy_text,
        cta: bestArm.cta_text || undefined
      };

    } catch (error) {
      console.error('Error getting nudge:', error);
      return {
        variant_id: 'error_fallback',
        text: 'Please review your spending to stay within limits.',
        cta: 'Okay'
      };
    }
  }

  async recordOutcome(outcome: NudgeOutcome): Promise<void> {
    try {
      let reward = 0;
      let outcomeType = 'unknown';

      // Calculate reward based on outcome
      if (outcome.cancelled) {
        reward = 1.0; // Best outcome - user was successfully nudged away
        outcomeType = 'cancelled';
      } else if (outcome.swapped) {
        reward = 0.7; // Good outcome - user found alternative
        outcomeType = 'swapped';
      } else if (outcome.clicked) {
        reward = 0.3; // Some engagement but no behavior change
        outcomeType = 'clicked';
      }

      // Record the outcome event
      await storage.recordNudgeEvent({
        arm_key: outcome.variant_id,
        context: {},
        outcome: outcomeType,
        reward
      });

      // Update the arm's cumulative stats
      await storage.updateNudgeArmStats(outcome.variant_id, reward);

    } catch (error) {
      console.error('Error recording nudge outcome:', error);
    }
  }

  // Simple Beta distribution sampling (approximation)
  private sampleBeta(alpha: number, beta: number): number {
    // For simplicity, using a normal approximation when alpha and beta are large
    if (alpha > 10 && beta > 10) {
      const mean = alpha / (alpha + beta);
      const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
      return Math.max(0, Math.min(1, this.sampleNormal(mean, Math.sqrt(variance))));
    }

    // For small values, use a simple uniform approximation
    return Math.random();
  }

  private sampleNormal(mean: number, stddev: number): number {
    // Box-Muller transform for normal sampling
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stddev + mean;
  }
}

// Seed some default nudges
export async function seedDefaultNudges(): Promise<void> {
  try {
    const defaultNudges = [
      // Guardrail event nudges
      {
        event_type: 'guardrail_triggered',
        arm_key: 'guardrail_friendly',
        copy_text: 'Looks like you\'re going a bit over budget! Want to check some alternatives?',
        cta_text: 'Show alternatives',
        active: true
      },
      {
        event_type: 'guardrail_triggered', 
        arm_key: 'guardrail_urgent',
        copy_text: '⚠️ Budget exceeded! This will impact your group\'s spending plan.',
        cta_text: 'Find cheaper option',
        active: true
      },
      {
        event_type: 'guardrail_triggered',
        arm_key: 'guardrail_social',
        copy_text: 'Your friends are counting on staying within the group budget. Consider alternatives?',
        cta_text: 'Browse options',
        active: true
      },

      // Swap promotion nudges
      {
        event_type: 'payment_high_amount',
        arm_key: 'swap_promotion_casual',
        copy_text: 'Big purchase! You could save by finding someone to swap cash/UPI with.',
        cta_text: 'Check SwapHub',
        active: true
      },
      {
        event_type: 'payment_high_amount',
        arm_key: 'swap_promotion_savings',
        copy_text: 'Save fees and time! Find nearby cash-UPI swaps for purchases like this.',
        cta_text: 'Find swap',
        active: true
      },

      // Low balance nudges
      {
        event_type: 'balance_low',
        arm_key: 'topup_suggestion',
        copy_text: 'Running low on funds. Top up now or find a UPI-to-cash swap nearby?',
        cta_text: 'Explore options',
        active: true
      }
    ];

    for (const nudge of defaultNudges) {
      try {
        await storage.createNudgeArm(nudge);
      } catch (error) {
        // Ignore duplicate key errors
        if (!(error instanceof Error) || !error.message?.includes('duplicate key')) {
          console.error('Error seeding nudge:', error);
        }
      }
    }

    console.log('Default nudges seeded successfully');
  } catch (error) {
    console.error('Error seeding default nudges:', error);
  }
}

export const nudgesService = new ThompsonSamplingNudges();