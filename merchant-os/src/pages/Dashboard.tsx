import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';

interface DashboardStats {
  todayRedemptions: number;
  todayRevenue: string;
  activeOffers: number;
  settlementStatus: 'pending' | 'processed' | 'failed';
}

interface RecentRedemption {
  id: string;
  user_name: string;
  amount: string;
  offer_label: string;
  timestamp: string;
}

export default function Dashboard() {
  const { merchant } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    todayRedemptions: 0,
    todayRevenue: '0.00',
    activeOffers: 0,
    settlementStatus: 'pending'
  });
  const [recentRedemptions, setRecentRedemptions] = useState<RecentRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Simulate API calls - in production these would fetch real data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStats({
          todayRedemptions: Math.floor(Math.random() * 50) + 10,
          todayRevenue: (Math.random() * 5000 + 1000).toFixed(2),
          activeOffers: Math.floor(Math.random() * 5) + 2,
          settlementStatus: Math.random() > 0.3 ? 'processed' : 'pending'
        });
        
        setRecentRedemptions([
          {
            id: '1',
            user_name: 'Student A',
            amount: '25.00',
            offer_label: 'Lunch Special',
            timestamp: new Date(Date.now() - 300000).toISOString()
          },
          {
            id: '2',
            user_name: 'Student B',
            amount: '15.50',
            offer_label: 'Coffee & Pastry',
            timestamp: new Date(Date.now() - 600000).toISOString()
          },
          {
            id: '3',
            user_name: 'Student C',
            amount: '30.25',
            offer_label: 'Dinner Combo',
            timestamp: new Date(Date.now() - 900000).toISOString()
          }
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'text-green-400 bg-green-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'failed': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card rounded-2xl p-6">
                <div className="h-4 bg-white/10 rounded mb-2"></div>
                <div className="h-8 bg-white/10 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome back, {merchant?.name}
            </h1>
            <p className="text-white/70">
              Here's what's happening with your business today
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(stats.settlementStatus)}`}>
              Settlement: {stats.settlementStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card rounded-2xl p-6" data-testid="card-redemptions">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">Today's Redemptions</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.todayRedemptions}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-green-400 text-sm">↑ 12%</span>
            <span className="text-white/70 text-sm ml-2">vs yesterday</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6" data-testid="card-revenue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">Today's Revenue</p>
              <p className="text-3xl font-bold text-white mt-2">₹{stats.todayRevenue}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-green-400 text-sm">↑ 8%</span>
            <span className="text-white/70 text-sm ml-2">vs yesterday</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6" data-testid="card-offers">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">Active Offers</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.activeOffers}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏷️</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-white/70 text-sm">2 ending today</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6" data-testid="card-conversion">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">Conversion Rate</p>
              <p className="text-3xl font-bold text-white mt-2">78%</p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-green-400 text-sm">↑ 5%</span>
            <span className="text-white/70 text-sm ml-2">vs last week</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Redemptions */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Redemptions</h2>
            <button className="text-white/70 hover:text-white text-sm">
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {recentRedemptions.map((redemption) => (
              <div key={redemption.id} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white text-sm font-medium">
                      {redemption.user_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{redemption.user_name}</p>
                    <p className="text-white/70 text-sm">{redemption.offer_label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">₹{redemption.amount}</p>
                  <p className="text-white/70 text-sm">{formatTimeAgo(redemption.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              className="p-4 bg-white/10 hover:bg-white/20 rounded-xl text-left transition-colors spring-bounce"
              data-testid="button-create-offer"
            >
              <div className="text-2xl mb-2">🎯</div>
              <p className="text-white font-medium">Create Offer</p>
              <p className="text-white/70 text-sm">Launch new promotion</p>
            </button>
            
            <button 
              className="p-4 bg-white/10 hover:bg-white/20 rounded-xl text-left transition-colors spring-bounce"
              data-testid="button-view-settlements"
            >
              <div className="text-2xl mb-2">💳</div>
              <p className="text-white font-medium">Settlements</p>
              <p className="text-white/70 text-sm">Check payouts</p>
            </button>
            
            <button 
              className="p-4 bg-white/10 hover:bg-white/20 rounded-xl text-left transition-colors spring-bounce"
              data-testid="button-analytics"
            >
              <div className="text-2xl mb-2">📈</div>
              <p className="text-white font-medium">Analytics</p>
              <p className="text-white/70 text-sm">View insights</p>
            </button>
            
            <button 
              className="p-4 bg-white/10 hover:bg-white/20 rounded-xl text-left transition-colors spring-bounce"
              data-testid="button-reconciliation"
            >
              <div className="text-2xl mb-2">⚖️</div>
              <p className="text-white font-medium">Reconciliation</p>
              <p className="text-white/70 text-sm">Balance books</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}