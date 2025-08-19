import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';

interface Settlement {
  id: string;
  settlement_date: string;
  gross_amount: string;
  commission: string;
  tax_amount: string;
  net_amount: string;
  status: 'pending' | 'processed' | 'failed';
  reference_number?: string;
  processed_at?: string;
}

interface SettlementSummary {
  todayAmount: string;
  weekAmount: string;
  monthAmount: string;
  pendingCount: number;
}

export default function Settlements() {
  const { merchant } = useAuthStore();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [summary, setSummary] = useState<SettlementSummary>({
    todayAmount: '0.00',
    weekAmount: '0.00',
    monthAmount: '0.00',
    pendingCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');

  useEffect(() => {
    loadSettlements();
  }, []);

  const loadSettlements = async () => {
    setIsLoading(true);
    try {
      // Simulate API call - in production this would fetch from /api/merchant/settlements
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockSettlements: Settlement[] = [
        {
          id: '1',
          settlement_date: '2024-01-19',
          gross_amount: '2540.00',
          commission: '63.50',
          tax_amount: '76.20',
          net_amount: '2400.30',
          status: 'processed',
          reference_number: 'STL-2024-001',
          processed_at: '2024-01-19T10:30:00Z'
        },
        {
          id: '2',
          settlement_date: '2024-01-18',
          gross_amount: '1890.00',
          commission: '47.25',
          tax_amount: '56.70',
          net_amount: '1786.05',
          status: 'processed',
          reference_number: 'STL-2024-002',
          processed_at: '2024-01-18T11:15:00Z'
        },
        {
          id: '3',
          settlement_date: '2024-01-17',
          gross_amount: '3210.00',
          commission: '80.25',
          tax_amount: '96.30',
          net_amount: '3033.45',
          status: 'pending',
        },
        {
          id: '4',
          settlement_date: '2024-01-16',
          gross_amount: '1675.00',
          commission: '41.88',
          tax_amount: '50.25',
          net_amount: '1582.87',
          status: 'failed',
        }
      ];
      
      setSettlements(mockSettlements);
      
      // Calculate summary
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const todaySettlements = mockSettlements.filter(s => s.settlement_date === today && s.status === 'processed');
      const weekSettlements = mockSettlements.filter(s => s.settlement_date >= weekAgo && s.status === 'processed');
      const monthSettlements = mockSettlements.filter(s => s.settlement_date >= monthAgo && s.status === 'processed');
      const pendingSettlements = mockSettlements.filter(s => s.status === 'pending');
      
      setSummary({
        todayAmount: todaySettlements.reduce((sum, s) => sum + parseFloat(s.net_amount), 0).toFixed(2),
        weekAmount: weekSettlements.reduce((sum, s) => sum + parseFloat(s.net_amount), 0).toFixed(2),
        monthAmount: monthSettlements.reduce((sum, s) => sum + parseFloat(s.net_amount), 0).toFixed(2),
        pendingCount: pendingSettlements.length
      });
      
    } catch (error) {
      console.error('Failed to load settlements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settlements</h1>
          <p className="text-white/70">Track your payment settlements and earnings</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'quarter')}
            className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            data-testid="select-period"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <button
            onClick={() => window.open('#', '_blank')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
            data-testid="button-export"
          >
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-2xl p-6" data-testid="card-today-earnings">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">Today's Earnings</p>
              <p className="text-2xl font-bold text-white mt-1">₹{summary.todayAmount}</p>
            </div>
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">💰</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6" data-testid="card-week-earnings">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">This Week</p>
              <p className="text-2xl font-bold text-white mt-1">₹{summary.weekAmount}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6" data-testid="card-month-earnings">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">This Month</p>
              <p className="text-2xl font-bold text-white mt-1">₹{summary.monthAmount}</p>
            </div>
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6" data-testid="card-pending-settlements">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">Pending</p>
              <p className="text-2xl font-bold text-white mt-1">{summary.pendingCount}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">⏳</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Recent Settlements</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-white/70 font-medium text-sm">Date</th>
                <th className="px-6 py-4 text-left text-white/70 font-medium text-sm">Gross Amount</th>
                <th className="px-6 py-4 text-left text-white/70 font-medium text-sm">Commission</th>
                <th className="px-6 py-4 text-left text-white/70 font-medium text-sm">Tax</th>
                <th className="px-6 py-4 text-left text-white/70 font-medium text-sm">Net Amount</th>
                <th className="px-6 py-4 text-left text-white/70 font-medium text-sm">Status</th>
                <th className="px-6 py-4 text-left text-white/70 font-medium text-sm">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {settlements.map((settlement) => (
                <tr key={settlement.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{formatDate(settlement.settlement_date)}</p>
                      {settlement.processed_at && (
                        <p className="text-white/70 text-sm">
                          Processed: {formatDateTime(settlement.processed_at)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">₹{settlement.gross_amount}</td>
                  <td className="px-6 py-4 text-white/70">₹{settlement.commission}</td>
                  <td className="px-6 py-4 text-white/70">₹{settlement.tax_amount}</td>
                  <td className="px-6 py-4 text-white font-bold">₹{settlement.net_amount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(settlement.status)}`}>
                      {settlement.status.charAt(0).toUpperCase() + settlement.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {settlement.reference_number ? (
                      <span className="text-white/70 text-sm font-mono">
                        {settlement.reference_number}
                      </span>
                    ) : (
                      <span className="text-white/40 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement Info */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Settlement Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-3">Commission Structure</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Base Commission:</span>
                <span className="text-white">2.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">GST (18%):</span>
                <span className="text-white">0.45%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Total Deduction:</span>
                <span className="text-white font-medium">2.95%</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">Settlement Schedule</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Frequency:</span>
                <span className="text-white">Daily</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Processing Time:</span>
                <span className="text-white">T+1 working day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Next Settlement:</span>
                <span className="text-white font-medium">Tomorrow, 11:00 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}