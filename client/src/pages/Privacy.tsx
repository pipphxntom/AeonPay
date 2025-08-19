import { useState } from 'react';
import { Shield, Eye, Download, Trash2, Calendar, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PrivacyEvent {
  id: string;
  field: string;
  purpose: string;
  created_at: string;
}

export default function Privacy() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState(30);

  const { data: privacyEvents, isLoading } = useQuery({
    queryKey: ['/api/privacy/events'],
    queryFn: () => apiRequest('/api/privacy/events')
  });

  const handleExportData = () => {
    if (!privacyEvents || privacyEvents.length === 0) {
      toast({
        title: "No Data",
        description: "No privacy events found to export.",
        variant: "destructive"
      });
      return;
    }

    const csvData = privacyEvents.map((event: PrivacyEvent) => ({
      Date: new Date(event.created_at).toLocaleDateString(),
      'Data Field': event.field,
      Purpose: event.purpose
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aeonpay-privacy-ledger.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Privacy ledger downloaded as CSV file.",
    });
  };

  const handleDeleteData = () => {
    // Frontend-only stub as specified
    toast({
      title: "Delete Request",
      description: "Data deletion requests are processed manually. Contact support for assistance.",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPurposeIcon = (purpose: string) => {
    if (purpose.includes('ai_coach')) return '🤖';
    if (purpose.includes('payment')) return '💳';
    if (purpose.includes('analytics')) return '📊';
    return '🔒';
  };

  const getPurposeBadgeColor = (purpose: string) => {
    if (purpose.includes('ai_coach')) return 'bg-purple-500/20 text-purple-400';
    if (purpose.includes('payment')) return 'bg-green-500/20 text-green-400';
    if (purpose.includes('analytics')) return 'bg-blue-500/20 text-blue-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Ledger</h1>
        <p className="text-white/80">Track what data you've shared and why</p>
      </div>

      {/* Privacy Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">Total Shares</p>
                <p className="text-2xl font-bold text-white">
                  {privacyEvents?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/30 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">AI Interactions</p>
                <p className="text-2xl font-bold text-white">
                  {privacyEvents?.filter((e: PrivacyEvent) => e.purpose.includes('ai')).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/30 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Last 30 Days</p>
                <p className="text-2xl font-bold text-white">
                  {privacyEvents?.filter((e: PrivacyEvent) => {
                    const eventDate = new Date(e.created_at);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return eventDate >= thirtyDaysAgo;
                  }).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleExportData}
          className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
          data-testid="button-export-data"
        >
          <Download className="w-4 h-4" />
          <span>Export Data</span>
        </Button>
        <Button
          onClick={handleDeleteData}
          variant="destructive"
          className="flex items-center space-x-2"
          data-testid="button-delete-data"
        >
          <Trash2 className="w-4 h-4" />
          <span>Request Deletion</span>
        </Button>
      </div>

      {/* Privacy Events List */}
      <Card className="glass-card border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Recent Data Shares</span>
          </CardTitle>
          <CardDescription className="text-white/70">
            Data fields exposed to AI services and other features
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-white/60 text-center py-8">Loading privacy events...</div>
          ) : privacyEvents && privacyEvents.length > 0 ? (
            <div className="space-y-3">
              {privacyEvents.slice(0, 20).map((event: PrivacyEvent) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">{getPurposeIcon(event.purpose)}</div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {event.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={`text-xs ${getPurposeBadgeColor(event.purpose)}`}>
                          {event.purpose.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-white/40 text-xs">
                          {formatDate(event.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {privacyEvents.length > 20 && (
                <div className="text-center pt-4">
                  <p className="text-white/60 text-sm">
                    Showing first 20 of {privacyEvents.length} events
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 mb-2">No privacy events yet</p>
              <p className="text-white/40 text-sm">
                When you interact with AI features or share data, it will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Information */}
      <Card className="glass-card border-white/20">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Shield className="w-6 h-6 text-green-400 mt-1" />
            <div>
              <h3 className="text-white font-semibold mb-2">Your Privacy Matters</h3>
              <div className="text-white/70 text-sm space-y-2">
                <p>
                  • <strong>Data Tokenization:</strong> Personal information like names and phone numbers are replaced with tokens before being sent to AI services.
                </p>
                <p>
                  • <strong>Purpose Limitation:</strong> Data is only used for the specific purpose you consented to.
                </p>
                <p>
                  • <strong>Retention Control:</strong> You can export or request deletion of your data at any time.
                </p>
                <p>
                  • <strong>Transparency:</strong> This ledger shows exactly what data was shared and why.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}