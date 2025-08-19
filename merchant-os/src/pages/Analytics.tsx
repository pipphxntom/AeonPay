import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';

interface AnalyticsData {
  revenue: {
    daily: Array<{ date: string; amount: number; transactions: number }>;
    weekly: Array<{ week: string; amount: number; transactions: number }>;
    monthly: Array<{ month: string; amount: number; transactions: number }>;
  };
  topOffers: Array<{
    id: string;
    label: string;
    redemptions: number;
    revenue: number;
    conversion_rate: number;
  }>;
  customerInsights: {
    peak_hours: Array<{ hour: number; transactions: number }>;
    repeat_customers: number;
    avg_transaction_value: number;
    customer_satisfaction: number;
  };
  trends: {
    revenue_growth: number;
    transaction_growth: number;
    customer_growth: number;
  };
}

export default function Analytics() {
  const { merchant } = useAuthStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');
  const [viewMode, setViewMode] = useState<'overview' | 'offers' | 'customers'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockAnalytics: AnalyticsData = {
        revenue: {
          daily: [
            { date: '2024-01-13', amount: 1250, transactions: 45 },
            { date: '2024-01-14', amount: 1890, transactions: 62 },
            { date: '2024-01-15', amount: 2100, transactions: 71 },
            { date: '2024-01-16', amount: 1675, transactions: 58 },
            { date: '2024-01-17', amount: 2340, transactions: 83 },
            { date: '2024-01-18', amount: 2890, transactions: 95 },
            { date: '2024-01-19', amount: 2150, transactions: 76 }
          ],
          weekly: [
            { week: 'Week 1', amount: 8500, transactions: 285 },
            { week: 'Week 2', amount: 12400, transactions: 410 },
            { week: 'Week 3', amount: 15600, transactions: 523 }
          ],
          monthly: [
            { month: 'Nov', amount: 45000, transactions: 1250 },
            { month: 'Dec', amount: 52000, transactions: 1450 },
            { month: 'Jan', amount: 36500, transactions: 1218 }
          ]
        },
        topOffers: [
          { id: '1', label: 'Lunch Special', redemptions: 245, revenue: 6125, conversion_rate: 78 },
          { id: '2', label: 'Coffee & Pastry', redemptions: 189, revenue: 2835, conversion_rate: 65 },
          { id: '3', label: 'Dinner Combo', redemptions: 98, revenue: 2940, conversion_rate: 45 },
          { id: '4', label: 'Weekend Brunch', redemptions: 67, revenue: 2010, conversion_rate: 82 }
        ],
        customerInsights: {
          peak_hours: [
            { hour: 8, transactions: 12 },
            { hour: 9, transactions: 18 },
            { hour: 10, transactions: 25 },
            { hour: 11, transactions: 35 },
            { hour: 12, transactions: 52 },
            { hour: 13, transactions: 48 },
            { hour: 14, transactions: 28 },
            { hour: 15, transactions: 15 },
            { hour: 16, transactions: 22 },
            { hour: 17, transactions: 31 },
            { hour: 18, transactions: 38 },
            { hour: 19, transactions: 25 }
          ],
          repeat_customers: 68,
          avg_transaction_value: 28.50,
          customer_satisfaction: 4.6
        },
        trends: {
          revenue_growth: 12.5,
          transaction_growth: 8.3,
          customer_growth: 15.2
        }
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  
  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-500';
    if (growth < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return '↗️';
    if (growth < 0) return '↘️';
    return '→';
  };

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-white/70">Insights and performance metrics for {merchant?.name}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-white/10 rounded-lg p-1">
            {(['overview', 'offers', 'customers'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                data-testid={`button-${mode}`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'quarter')}
            className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            data-testid="select-time-range"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {viewMode === 'overview' && (
        <>
          {/* Growth Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6" data-testid="card-revenue-growth">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Revenue Growth</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {analytics.trends.revenue_growth > 0 ? '+' : ''}{analytics.trends.revenue_growth}%
                  </p>
                </div>
                <div className="text-2xl">
                  {getGrowthIcon(analytics.trends.revenue_growth)}
                </div>
              </div>
              <p className={`text-sm mt-2 ${getGrowthColor(analytics.trends.revenue_growth)}`}>
                vs previous period
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6" data-testid="card-transaction-growth">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Transaction Growth</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {analytics.trends.transaction_growth > 0 ? '+' : ''}{analytics.trends.transaction_growth}%
                  </p>
                </div>
                <div className="text-2xl">
                  {getGrowthIcon(analytics.trends.transaction_growth)}
                </div>
              </div>
              <p className={`text-sm mt-2 ${getGrowthColor(analytics.trends.transaction_growth)}`}>
                vs previous period
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6" data-testid="card-customer-growth">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Customer Growth</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {analytics.trends.customer_growth > 0 ? '+' : ''}{analytics.trends.customer_growth}%
                  </p>
                </div>
                <div className="text-2xl">
                  {getGrowthIcon(analytics.trends.customer_growth)}
                </div>
              </div>
              <p className={`text-sm mt-2 ${getGrowthColor(analytics.trends.customer_growth)}`}>
                new customers
              </p>
            </div>
          </div>

          {/* Revenue Chart Placeholder */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Revenue Trend</h2>
            <div className="bg-white/5 rounded-xl p-8 text-center">
              <p className="text-white/70 mb-4">Revenue visualization would go here</p>
              <div className="grid grid-cols-7 gap-4">
                {analytics.revenue.daily.map((day, index) => (
                  <div key={index} className="text-center">
                    <div
                      className="bg-gradient-to-t from-blue-500 to-purple-600 rounded-lg mb-2 mx-auto"
                      style={{
                        height: `${(day.amount / 3000) * 100}px`,
                        minHeight: '20px',
                        width: '30px'
                      }}
                    ></div>
                    <p className="text-white/70 text-xs">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-white text-xs font-medium">
                      ₹{day.amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === 'offers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performing Offers */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Top Performing Offers</h2>
            <div className="space-y-4">
              {analytics.topOffers.map((offer, index) => (
                <div key={offer.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold mr-4">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{offer.label}</p>
                      <p className="text-white/70 text-sm">{offer.redemptions} redemptions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{formatCurrency(offer.revenue)}</p>
                    <p className="text-green-400 text-sm">{offer.conversion_rate}% conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Offer Performance Metrics */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Performance Insights</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70 text-sm">Average Conversion Rate</span>
                  <span className="text-white font-medium">67.5%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" style={{ width: '67.5%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70 text-sm">Offer Redemption Rate</span>
                  <span className="text-white font-medium">73.2%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '73.2%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70 text-sm">Customer Satisfaction</span>
                  <span className="text-white font-medium">4.6/5.0</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Peak Hours */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Peak Hours Analysis</h2>
            <div className="space-y-3">
              {analytics.customerInsights.peak_hours.map((hour) => (
                <div key={hour.hour} className="flex items-center">
                  <span className="text-white/70 text-sm w-12">
                    {hour.hour}:00
                  </span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                        style={{ width: `${(hour.transactions / 52) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-white text-sm font-medium w-8">
                    {hour.transactions}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Insights */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Customer Metrics</h2>
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-white mb-2">{analytics.customerInsights.repeat_customers}%</p>
                <p className="text-white/70">Repeat Customers</p>
              </div>
              
              <div className="text-center">
                <p className="text-4xl font-bold text-white mb-2">
                  ₹{analytics.customerInsights.avg_transaction_value}
                </p>
                <p className="text-white/70">Average Transaction Value</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-xl ${
                        star <= Math.floor(analytics.customerInsights.customer_satisfaction)
                          ? 'text-yellow-400'
                          : 'text-white/20'
                      }`}
                    >
                      ⭐
                    </span>
                  ))}
                  <span className="text-white font-bold ml-2">
                    {analytics.customerInsights.customer_satisfaction}/5.0
                  </span>
                </div>
                <p className="text-white/70">Customer Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}