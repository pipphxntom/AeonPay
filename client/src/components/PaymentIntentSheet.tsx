import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function PaymentIntentSheet() {
  const { 
    isPaymentIntentSheetOpen, 
    closePaymentIntentSheet,
    openGuardrailDialog,
    selectedMerchant,
    paymentAmount,
    paymentMode,
    setPaymentAmount,
    setPaymentMode 
  } = useAppStore();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [intentId, setIntentId] = useState<string | null>(null);

  const createIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/payments/intent', {
        amount: paymentAmount,
        merchant_id: selectedMerchant?.id || 'merchant-campus-1-0',
        plan_id: 'plan-demo-1',
        mode: paymentMode,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIntentId(data.intent_id);
      
      if (data.guardrail_required) {
        openGuardrailDialog();
      } else {
        confirmPaymentMutation.mutate(data.intent_id);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create payment intent. Please try again.",
        variant: "destructive",
      });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (intentId: string) => {
      const response = await apiRequest('POST', '/api/payments/confirm', {
        intent_id: intentId,
        status: 'completed',
        rrn_stub: `RRN${Date.now()}`,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me/plans'] });
      toast({
        title: "Payment Successful!",
        description: "Your payment has been processed successfully.",
      });
      closePaymentIntentSheet();
      setPaymentAmount(0);
      setIntentId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePayment = () => {
    if (!paymentAmount || paymentAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    createIntentMutation.mutate();
  };

  const isLoading = createIntentMutation.isPending || confirmPaymentMutation.isPending;

  return (
    <Dialog open={isPaymentIntentSheetOpen} onOpenChange={closePaymentIntentSheet}>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Payment</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={closePaymentIntentSheet}
            className="text-white/70 hover:text-white tap-target focus-ring"
            data-testid="close-payment-intent-sheet"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Merchant Info */}
        <div className="flex items-center space-x-4 mb-6 bg-white/10 rounded-xl p-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-400 to-red-400 flex items-center justify-center text-white text-xl">
            {selectedMerchant?.icon || '☕'}
          </div>
          <div>
            <h3 className="text-white font-semibold">{selectedMerchant?.name || 'Chai Point'}</h3>
            <p className="text-white/70 text-sm">{selectedMerchant?.location || 'Main Canteen'}</p>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <Label htmlFor="amount" className="text-white/80 text-sm font-medium">
            Amount
          </Label>
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/80">₹</span>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
              className="pl-8 pr-4 py-4 text-white text-2xl font-bold bg-white/10 border-white/20 placeholder-white/50 focus:border-brand-blue"
              data-testid="input-payment-amount"
            />
          </div>
        </div>

        {/* Payment Mode Selector */}
        <div className="mb-6">
          <Label className="text-white/80 text-sm font-medium mb-3 block">
            Payment Mode
          </Label>
          <RadioGroup 
            value={paymentMode} 
            onValueChange={(value) => setPaymentMode(value as 'vouchers' | 'mandates' | 'split_later')}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3 bg-white/10 rounded-xl p-4">
              <RadioGroupItem value="vouchers" id="vouchers" />
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-green-400">🎫</div>
                <div>
                  <Label htmlFor="vouchers" className="text-white font-medium cursor-pointer">
                    Event Vouchers
                  </Label>
                  <p className="text-white/70 text-sm">Use pre-funded vouchers</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-white/10 rounded-xl p-4">
              <RadioGroupItem value="mandates" id="mandates" />
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-blue-400">🪙</div>
                <div>
                  <Label htmlFor="mandates" className="text-white font-medium cursor-pointer">
                    Cap Tokens
                  </Label>
                  <p className="text-white/70 text-sm">Debit from member caps</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-white/10 rounded-xl p-4">
              <RadioGroupItem value="split_later" id="split_later" />
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-purple-400">⏰</div>
                <div>
                  <Label htmlFor="split_later" className="text-white font-medium cursor-pointer">
                    Split Later
                  </Label>
                  <p className="text-white/70 text-sm">Pay now, settle later</p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <Button
          onClick={handlePayment}
          disabled={isLoading || !paymentAmount}
          className="w-full brand-gradient text-white font-bold py-4 px-6 hover:shadow-lg transition-all duration-300"
          data-testid="button-pay-now"
        >
          {isLoading ? (
            <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
