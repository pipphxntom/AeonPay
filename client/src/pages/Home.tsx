import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowRight, Users, Utensils, Film, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { getAuthToken } from '@/lib/queryClient';
import { Plan } from '@shared/schema';

export default function Home() {
  const { data: user } = useAuth();
  const { openCreatePlanModal, setCurrentScreen } = useAppStore();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['/api/me/plans'],
    queryFn: async (): Promise<Plan[]> => {
      const response = await fetch('/api/me/plans', {
        headers: { 
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      return response.json();
    },
  });

  const activePlans = plans.filter(plan => plan.status === 'active');

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatPlanBalance = (plan: Plan) => {
    const capPerHead = parseFloat(plan.cap_per_head);
    const memberCount = 5; // Mock member count
    return (capPerHead * memberCount).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-white/10 rounded-2xl"></div>
          <div className="h-32 bg-white/10 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{getTimeOfDay()}</h1>
          <p className="text-white/80">{user?.name || 'User'}</p>
        </div>
        
        <div className="relative">
          <div className="w-12 h-12 rounded-full brand-gradient flex items-center justify-center text-white font-semibold text-lg">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">2</span>
          </div>
        </div>
      </div>

      {/* Active Plans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Active Plans</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentScreen('plans')}
            className="text-white/80 hover:text-white tap-target focus-ring"
            data-testid="button-view-all-plans"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        
        {activePlans.length > 0 ? (
          <div className="space-y-4">
            {activePlans.slice(0, 2).map((plan) => (
              <div 
                key={plan.id}
                className="glass-card rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 spring-enter"
                data-testid={`plan-card-${plan.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white text-lg">{plan.name}</h3>
                  <span className="text-sm text-white/70 bg-white/20 px-3 py-1 rounded-full">
                    {plan.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white/80 text-sm">Available Balance</p>
                    <p className="text-white font-bold text-2xl">₹{formatPlanBalance(plan)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-sm">Cap per head</p>
                    <p className="text-white font-semibold">₹{parseFloat(plan.cap_per_head).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 border-2 border-white flex items-center justify-center text-xs text-white font-medium">A</div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 border-2 border-white flex items-center justify-center text-xs text-white font-medium">S</div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-400 border-2 border-white flex items-center justify-center text-xs text-white font-medium">R</div>
                    </div>
                    <span className="text-white/70 text-sm">+2 others</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white"
                    data-testid={`button-view-plan-${plan.id}`}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Users className="w-12 h-12 text-white/50 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No Active Plans</h3>
            <p className="text-white/70 text-sm mb-4">Create your first plan to start managing group expenses</p>
            <Button
              onClick={openCreatePlanModal}
              className="brand-gradient text-white"
              data-testid="button-create-first-plan"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={openCreatePlanModal}
            className="glass-card rounded-2xl p-6 h-auto hover:bg-white/20 transition-all duration-300 tap-target focus-ring"
            variant="ghost"
            data-testid="button-create-plan"
          >
            <div className="text-center">
              <div className="w-12 h-12 brand-gradient rounded-xl mx-auto mb-3 flex items-center justify-center">
                <Plus className="text-white w-6 h-6" />
              </div>
              <p className="text-white font-medium">Create Plan</p>
              <p className="text-white/70 text-sm">Start a new group</p>
            </div>
          </Button>
          
          <Button
            onClick={() => setCurrentScreen('pay')}
            className="glass-card rounded-2xl p-6 h-auto hover:bg-white/20 transition-all duration-300 tap-target focus-ring"
            variant="ghost"
            data-testid="button-scan-pay"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h5.01M4 20h4.01" />
                </svg>
              </div>
              <p className="text-white font-medium">Scan & Pay</p>
              <p className="text-white/70 text-sm">Quick payment</p>
            </div>
          </Button>
        </div>
      </div>

      {/* Envelopes Snapshot */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Envelopes</h3>
          <span className="text-white/70 text-sm">Overview</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/30 rounded-xl mx-auto mb-2 flex items-center justify-center">
              <Utensils className="text-green-400 w-6 h-6" />
            </div>
            <p className="text-white/80 text-sm">Food</p>
            <p className="text-white font-medium">₹850</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500/30 rounded-xl mx-auto mb-2 flex items-center justify-center">
              <Film className="text-blue-400 w-6 h-6" />
            </div>
            <p className="text-white/80 text-sm">Movies</p>
            <p className="text-white font-medium">₹400</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/30 rounded-xl mx-auto mb-2 flex items-center justify-center">
              <Plane className="text-purple-400 w-6 h-6" />
            </div>
            <p className="text-white/80 text-sm">Travel</p>
            <p className="text-white font-medium">₹1,500</p>
          </div>
        </div>
      </div>
    </div>
  );
}
