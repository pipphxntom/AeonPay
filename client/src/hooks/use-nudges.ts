import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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

export function useNudges() {
  const nudgeMutation = useMutation({
    mutationFn: (request: NudgeRequest) => apiRequest('/api/ai/nudge', 'POST', request)
  });

  const outcomeMutation = useMutation({
    mutationFn: (outcome: NudgeOutcome) => apiRequest('/api/ai/nudge/outcome', 'POST', outcome)
  });

  const getNudge = async (eventType: string, context: any = {}): Promise<NudgeResponse | null> => {
    try {
      const response = await nudgeMutation.mutateAsync({ event_type: eventType, context });
      return response;
    } catch (error) {
      console.error('Failed to get nudge:', error);
      return null;
    }
  };

  const recordOutcome = async (variantId: string, outcome: 'clicked' | 'cancelled' | 'swapped') => {
    try {
      await outcomeMutation.mutateAsync({
        variant_id: variantId,
        [outcome]: true
      });
    } catch (error) {
      console.error('Failed to record nudge outcome:', error);
    }
  };

  return {
    getNudge,
    recordOutcome,
    isLoading: nudgeMutation.isPending,
    isRecording: outcomeMutation.isPending
  };
}