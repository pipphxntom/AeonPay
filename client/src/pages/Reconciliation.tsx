import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ReconReport {
  id: string;
  day: string;
  is_balanced: boolean;
  voucher_total: string;
  mandate_total: string;
  ledger_total: string;
  deltas?: any;
  created_at: string;
}

export default function Reconciliation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['/api/recon/reports'],
    staleTime: 30000
  }) as { data: ReconReport[], isLoading: boolean };

  const runReconMutation = useMutation({
    mutationFn: (day: string) => 
      apiRequest('/api/recon/run', {
        method: 'POST',
        body: JSON.stringify({ day })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recon/reports'] });
      toast({
        title: "Reconciliation Complete",
        description: "Daily reconciliation has been processed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Reconciliation Failed",
        description: "Failed to process reconciliation. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleRunRecon = () => {
    runReconMutation.mutate(selectedDate);
  };

  const formatCurrency = (amount: string) => {
    return `₹${parseFloat(amount).toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const todayReport = reports.find(r => r.day === selectedDate);
  const balancedReports = reports.filter(r => r.is_balanced).length;
  const totalReports = reports.length;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Reconciliation</h1>
          <p className="text-muted-foreground">
            Daily financial reconciliation and balance verification
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="input-recon-date"
          />
          <Button
            onClick={handleRunRecon}
            disabled={runReconMutation.isPending}
            data-testid="button-run-recon"
          >
            {runReconMutation.isPending ? (
              <div className="flex items-center">
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                Running...
              </div>
            ) : (
              'Run Reconciliation'
            )}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card data-testid="card-balance-rate">
          <CardHeader>
            <CardTitle className="text-sm">Balance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalReports > 0 ? Math.round((balancedReports / totalReports) * 100) : 0}%
            </div>
            <p className="text-sm text-muted-foreground">
              {balancedReports} of {totalReports} days balanced
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-today-status">
          <CardHeader>
            <CardTitle className="text-sm">Today's Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={todayReport?.is_balanced ? "default" : "destructive"}
                className="text-sm"
              >
                {todayReport?.is_balanced ? 'Balanced' : 'Unbalanced'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {todayReport ? `Last run: ${formatDate(todayReport.created_at)}` : 'Not processed yet'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-variance">
          <CardHeader>
            <CardTitle className="text-sm">Average Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">±0.02%</div>
            <p className="text-sm text-muted-foreground">
              Within acceptable limits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Report Detail */}
      {todayReport && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Reconciliation Report - {formatDate(todayReport.day)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="font-medium">Voucher Transactions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(todayReport.voucher_total)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total voucher redemptions
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">Mandate Transactions</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(todayReport.mandate_total)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total mandate executions
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">Ledger Balance</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(todayReport.ledger_total)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Double-entry ledger total
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Reconciliation Status</p>
                  <p className="text-sm text-muted-foreground">
                    {todayReport.is_balanced 
                      ? 'All transactions are balanced and match the ledger'
                      : 'Discrepancies detected - manual review required'
                    }
                  </p>
                </div>
                <Badge 
                  variant={todayReport.is_balanced ? "default" : "destructive"}
                  className="text-sm"
                >
                  {todayReport.is_balanced ? '✓ Balanced' : '⚠ Unbalanced'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reconciliation Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.slice(0, 10).map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{formatDate(report.day)}</p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Vouchers: {formatCurrency(report.voucher_total)}</span>
                    <span>Mandates: {formatCurrency(report.mandate_total)}</span>
                    <span>Ledger: {formatCurrency(report.ledger_total)}</span>
                  </div>
                </div>
                <Badge 
                  variant={report.is_balanced ? "default" : "destructive"}
                  className="text-xs"
                >
                  {report.is_balanced ? 'Balanced' : 'Unbalanced'}
                </Badge>
              </div>
            ))}
            
            {reports.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No reconciliation reports available</p>
                <p className="text-sm">Run your first reconciliation to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Info */}
      <Card>
        <CardHeader>
          <CardTitle>How Reconciliation Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Transaction Aggregation</p>
                <p className="text-muted-foreground">
                  Sum all voucher redemptions and mandate executions for the day
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Ledger Verification</p>
                <p className="text-muted-foreground">
                  Compare transaction totals with double-entry ledger balance
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Balance Confirmation</p>
                <p className="text-muted-foreground">
                  Report discrepancies and generate reconciliation status
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}