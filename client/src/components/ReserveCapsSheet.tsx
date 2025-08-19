import { useState } from 'react';
import { X, Check, Ticket, Coins } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function ReserveCapsSheet() {
  const { 
    isReserveCapsSheetOpen, 
    closeReserveCapsSheet,
    reservationMode,
    setReservationMode 
  } = useAppStore();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTab, setSelectedTab] = useState<'vouchers' | 'mandates'>('vouchers');

  const reserveVouchersMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6);
      
      const response = await apiRequest('POST', '/api/vouchers/mint', {
        plan_id: 'plan-demo-1',
        member_user_ids: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
        amount: 300,
        merchant_list: [],
        expires_at: expiresAt.toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me/plans'] });
      toast({
        title: "Vouchers Reserved",
        description: "Vouchers have been reserved for all members.",
      });
      closeReserveCapsSheet();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reserve vouchers. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createMandatesMutation = useMutation({
    mutationFn: async () => {
      const validFrom = new Date();
      const validTo = new Date();
      validTo.setHours(validTo.getHours() + 6);
      
      const response = await apiRequest('POST', '/api/mandates/create', {
        plan_id: 'plan-demo-1',
        member_user_ids: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
        cap_amount: 300,
        valid_from: validFrom.toISOString(),
        valid_to: validTo.toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me/plans'] });
      toast({
        title: "Cap Tokens Created",
        description: "Cap tokens have been created for all members.",
      });
      closeReserveCapsSheet();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create cap tokens. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReserve = () => {
    if (selectedTab === 'vouchers') {
      reserveVouchersMutation.mutate();
    } else {
      createMandatesMutation.mutate();
    }
  };

  const isLoading = reserveVouchersMutation.isPending || createMandatesMutation.isPending;

  return (
    <Dialog open={isReserveCapsSheetOpen} onOpenChange={closeReserveCapsSheet}>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Reserve Spending Caps</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeReserveCapsSheet}
            className="text-white/70 hover:text-white tap-target focus-ring"
            data-testid="close-reserve-caps-sheet"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'vouchers' | 'mandates')}>
          <TabsList className="grid w-full grid-cols-2 bg-white/10">
            <TabsTrigger value="vouchers" data-testid="tab-vouchers" className="data-[state=active]:bg-white/20">
              Event Vouchers
            </TabsTrigger>
            <TabsTrigger value="mandates" data-testid="tab-mandates" className="data-[state=active]:bg-white/20">
              Cap Tokens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vouchers" className="mt-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/30 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Ticket className="text-green-400 w-8 h-8" />
              </div>
              <h3 className="text-white font-semibold mb-2">Event Vouchers</h3>
              <p className="text-white/70 text-sm">Pre-funded vouchers for each member</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-white/80">Total Amount</span>
                <span className="text-white font-bold">₹1,500</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/80">Members</span>
                <span className="text-white font-bold">5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/80">Per Member</span>
                <span className="text-white font-bold">₹300</span>
              </div>
            </div>

            <Button
              onClick={handleReserve}
              disabled={isLoading}
              className="w-full brand-gradient text-white font-medium py-4 px-6 hover:shadow-lg transition-all duration-300"
              data-testid="button-reserve-vouchers"
            >
              {isLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Reserve Vouchers
                </>
              )}
            </Button>
            
            <p className="text-center text-white/70 text-sm mt-3">
              Reserved for 6:00 PM - 10:00 PM
            </p>
          </TabsContent>

          <TabsContent value="mandates" className="mt-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500/30 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Coins className="text-blue-400 w-8 h-8" />
              </div>
              <h3 className="text-white font-semibold mb-2">Cap Tokens</h3>
              <p className="text-white/70 text-sm">Dynamic spending limits per member</p>
            </div>

            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-white/80 text-sm mb-2">Cap per member</p>
              <p className="text-white font-bold text-xl">₹300</p>
            </div>

            <Button
              onClick={handleReserve}
              disabled={isLoading}
              className="w-full brand-gradient text-white font-medium py-4 px-6 hover:shadow-lg transition-all duration-300"
              data-testid="button-create-mandates"
            >
              {isLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Cap Tokens
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
