import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface Nudge {
  id: string;
  type: 'spending_limit' | 'merchant_suggestion' | 'savings_tip' | 'kyc_upgrade' | 'security_alert';
  title: string;
  message: string;
  action_text?: string;
  action_url?: string;
  priority: 'low' | 'medium' | 'high';
  conditions: any;
  is_active: boolean;
  created_at: string;
}

interface NudgeContext {
  spending_today: number;
  spending_limit: number;
  nearby_merchants: any[];
  kyc_level: string;
  last_activity: string;
}

export function useNudges() {
  const queryClient = useQueryClient();
  const [currentNudge, setCurrentNudge] = useState<Nudge | null>(null);
  const [nudgeHistory, setNudgeHistory] = useState<string[]>([]);

  // Fetch available nudges
  const { data: nudges = [], isLoading } = useQuery({
    queryKey: ['/api/nudges'],
    staleTime: 30000
  }) as { data: Nudge[], isLoading: boolean };

  // Get user context for nudge targeting
  const { data: context } = useQuery({
    queryKey: ['/api/nudges/context'],
    staleTime: 60000
  }) as { data: NudgeContext | undefined };

  // Mark nudge as seen
  const markSeenMutation = useMutation({
    mutationFn: (nudgeId: string) => 
      apiRequest(`/api/nudges/${nudgeId}/seen`, 'POST'),
    onSuccess: (_, nudgeId) => {
      setNudgeHistory(prev => [...prev, nudgeId]);
      setCurrentNudge(null);
    }
  });

  // Evaluate nudges based on context
  useEffect(() => {
    if (!context || !nudges.length || isLoading) return;

    const evaluateNudges = () => {
      const activeNudges = nudges.filter(nudge => nudge.is_active);
      
      for (const nudge of activeNudges) {
        // Skip if already seen recently
        if (nudgeHistory.includes(nudge.id)) continue;

        const shouldShow = evaluateNudgeConditions(nudge, context);
        if (shouldShow) {
          setCurrentNudge(nudge);
          break;
        }
      }
    };

    evaluateNudges();
  }, [context, nudges, nudgeHistory, isLoading]);

  const evaluateNudgeConditions = (nudge: Nudge, ctx: NudgeContext): boolean => {
    const conditions = nudge.conditions || {};

    switch (nudge.type) {
      case 'spending_limit':
        const spendingRatio = ctx.spending_today / ctx.spending_limit;
        return spendingRatio > (conditions.threshold || 0.8);

      case 'merchant_suggestion':
        return ctx.nearby_merchants.length > (conditions.min_merchants || 0);

      case 'kyc_upgrade':
        const lowKycLevels = ['basic'];
        return lowKycLevels.includes(ctx.kyc_level) && 
               ctx.spending_today > (conditions.spending_threshold || 1000);

      case 'security_alert':
        const lastActivity = new Date(ctx.last_activity);
        const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceActivity > (conditions.days_threshold || 30);

      case 'savings_tip':
        // Show savings tips randomly to engaged users
        return Math.random() < (conditions.probability || 0.1);

      default:
        return false;
    }
  };

  const dismissNudge = (nudgeId?: string) => {
    const id = nudgeId || currentNudge?.id;
    if (id) {
      markSeenMutation.mutate(id);
    }
  };

  const getNudgeIcon = (type: string) => {
    switch (type) {
      case 'spending_limit': return '💳';
      case 'merchant_suggestion': return '🏪';
      case 'savings_tip': return '💡';
      case 'kyc_upgrade': return '🔒';
      case 'security_alert': return '⚠️';
      default: return '💭';
    }
  };

  const getNudgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 border-red-500/20 text-red-600';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600';
      case 'low': return 'bg-blue-500/10 border-blue-500/20 text-blue-600';
      default: return 'bg-gray-500/10 border-gray-500/20 text-gray-600';
    }
  };

  return {
    currentNudge,
    nudges,
    isLoading,
    dismissNudge,
    getNudgeIcon,
    getNudgeColor,
    context
  };
}