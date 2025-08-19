import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Minus, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

export default function GuardrailDialog() {
  const { 
    isGuardrailDialogOpen, 
    closeGuardrailDialog,
    closePaymentIntentSheet,
    paymentAmount,
    setPaymentAmount 
  } = useAppStore();
  
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(5);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isGuardrailDialogOpen) {
      setCountdown(5);
      setIsActive(true);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsActive(false);
            handleProceed();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        setIsActive(false);
      };
    }
  }, [isGuardrailDialogOpen]);

  const handleAddFunds = () => {
    toast({
      title: "Top-up Required",
      description: "This feature will be available in Part-B.",
      variant: "default",
    });
    closeGuardrailDialog();
  };

  const handleTrimAmount = () => {
    const newAmount = Math.max(0, paymentAmount - 50);
    setPaymentAmount(newAmount);
    
    toast({
      title: "Amount Reduced",
      description: `Amount reduced by ₹50. New amount: ₹${newAmount}`,
    });
    closeGuardrailDialog();
  };

  const handleProceed = () => {
    toast({
      title: "Payment Successful!",
      description: "Your payment has been processed successfully.",
    });
    closeGuardrailDialog();
    closePaymentIntentSheet();
    setPaymentAmount(0);
  };

  const overCapAmount = 180; // Mock over-cap amount

  return (
    <Dialog open={isGuardrailDialogOpen} onOpenChange={() => {}}>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/30 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="text-red-400 w-8 h-8" />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">Over Budget Alert</h2>
          <p className="text-white/80 mb-6">
            Over cap by ₹{overCapAmount} — add ₹50 each or trim?
          </p>
          
          {/* Countdown Timer */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle 
                cx="40" 
                cy="40" 
                r="36" 
                stroke="rgba(255,255,255,0.2)" 
                strokeWidth="4" 
                fill="none"
              />
              <circle 
                cx="40" 
                cy="40" 
                r="36" 
                stroke="#EF4444" 
                strokeWidth="4" 
                fill="none" 
                className={isActive ? 'countdown-ring' : ''}
                style={{ 
                  strokeDasharray: '226',
                  strokeDashoffset: isActive ? '226' : '0'
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-xl" data-testid="countdown-timer">
                {countdown}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={handleAddFunds}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 tap-target focus-ring"
              data-testid="button-add-funds"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add ₹50 each
            </Button>
            
            <Button
              onClick={handleTrimAmount}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-4 tap-target focus-ring"
              data-testid="button-trim-amount"
            >
              <Minus className="w-4 h-4 mr-2" />
              Trim items
            </Button>
            
            <Button
              onClick={handleProceed}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 tap-target focus-ring"
              data-testid="button-proceed-anyway"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Proceed anyway
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
