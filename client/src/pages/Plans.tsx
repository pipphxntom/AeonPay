import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, IndianRupee, MoreHorizontal, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getAuthToken } from '@/lib/queryClient';
import { Plan } from '@shared/schema';
import { format } from 'date-fns';

export default function Plans() {
  const [activeFilter, setActiveFilter] = useState<'active' | 'completed' | 'archived'>('active');

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

  const filteredPlans = plans.filter(plan => {
    switch (activeFilter) {
      case 'active':
        return plan.status === 'active';
      case 'completed':
        return plan.status === 'completed';
      case 'archived':
        return plan.status === 'cancelled';
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDateRange = (start: Date | string, end: Date | string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const today = new Date();
    
    if (startDate.toDateString() === today.toDateString()) {
      return `Today ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
    }
    
    return `${format(startDate, 'MMM d, h:mm a')} - ${format(endDate, 'h:mm a')}`;
  };

  const calculateProgress = (plan: Plan) => {
    const capPerHead = parseFloat(plan.cap_per_head);
    const memberCount = 5; // Mock member count
    const totalBudget = capPerHead * memberCount;
    const spent = Math.random() * totalBudget * 0.7; // Mock spent amount
    return { spent, remaining: totalBudget - spent, total: totalBudget };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-white/10 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Plans</h1>
        <p className="text-white/80">Manage your group spending plans</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-3">
        <Button
          onClick={() => setActiveFilter('active')}
          className={`tap-target focus-ring px-4 py-2 rounded-xl font-medium transition-colors ${
            activeFilter === 'active'
              ? 'bg-white/20 text-white border border-white/30'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          data-testid="filter-active"
        >
          Active
        </Button>
        <Button
          onClick={() => setActiveFilter('completed')}
          className={`tap-target focus-ring px-4 py-2 rounded-xl font-medium transition-colors ${
            activeFilter === 'completed'
              ? 'bg-white/20 text-white border border-white/30'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          data-testid="filter-completed"
        >
          Completed
        </Button>
        <Button
          onClick={() => setActiveFilter('archived')}
          className={`tap-target focus-ring px-4 py-2 rounded-xl font-medium transition-colors ${
            activeFilter === 'archived'
              ? 'bg-white/20 text-white border border-white/30'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          data-testid="filter-archived"
        >
          Archived
        </Button>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {filteredPlans.length > 0 ? (
          filteredPlans.map((plan) => {
            const progress = calculateProgress(plan);
            return (
              <div 
                key={plan.id}
                className="glass-card rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 spring-enter"
                data-testid={`plan-item-${plan.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">{plan.name}</h3>
                    <div className="flex items-center space-x-2 text-white/70 text-sm mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateRange(plan.window_start, plan.window_end)}</span>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(plan.status)} border-none`}>
                    {plan.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-white/70 text-sm">Spent</p>
                    <p className="text-white font-bold text-xl">
                      ₹{Math.round(progress.spent).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Remaining</p>
                    <p className="text-white font-bold text-xl">
                      ₹{Math.round(progress.remaining).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-white/70 mb-1">
                    <span>Budget Usage</span>
                    <span>{Math.round((progress.spent / progress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="brand-gradient h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.spent / progress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 border-2 border-white flex items-center justify-center text-xs text-white font-medium">A</div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 border-2 border-white flex items-center justify-center text-xs text-white font-medium">S</div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-400 border-2 border-white flex items-center justify-center text-xs text-white font-medium">R</div>
                    </div>
                    <span className="text-white/70 text-sm">5 members</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      className="brand-gradient text-white hover:shadow-lg transition-all"
                      data-testid={`button-view-details-${plan.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/70 hover:text-white hover:bg-white/10"
                      data-testid={`button-more-options-${plan.id}`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Users className="w-12 h-12 text-white/50 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">
              No {activeFilter} Plans
            </h3>
            <p className="text-white/70 text-sm">
              {activeFilter === 'active' 
                ? "You don't have any active plans right now."
                : `No ${activeFilter} plans found.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
