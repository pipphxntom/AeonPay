import { ArrowRight, DollarSign, Smartphone, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SwapOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType;
  color: string;
  disabled?: boolean;
}

export default function Swap() {
  const { toast } = useToast();

  const swapOptions: SwapOption[] = [
    {
      id: 'cash-to-upi',
      title: 'Cash → UPI',
      description: 'Convert cash to digital money',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'upi-to-cash',
      title: 'UPI → Cash',
      description: 'Withdraw cash from UPI balance',
      icon: Smartphone,
      color: 'from-blue-500 to-cyan-500',
    },
  ];

  const handleSwapOption = (option: SwapOption) => {
    toast({
      title: "Coming Soon",
      description: `${option.title} will be available in Part-B of the application.`,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Swap</h1>
        <p className="text-white/80">Exchange cash and digital money</p>
      </div>

      {/* Swap Options */}
      <div className="space-y-4">
        {swapOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <Button
              key={option.id}
              onClick={() => handleSwapOption(option)}
              className="w-full glass-card rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 h-auto tap-target focus-ring"
              variant="ghost"
              data-testid={`swap-option-${option.id}`}
            >
              <div className="flex items-center space-x-4 w-full">
                <div className={`w-12 h-12 bg-gradient-to-r ${option.color} bg-opacity-30 rounded-xl flex items-center justify-center`}>
                  <div className="w-6 h-6 text-white flex items-center justify-center">
                    <IconComponent />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-semibold text-lg">{option.title}</h3>
                  <p className="text-white/70 text-sm">{option.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/50" />
              </div>
            </Button>
          );
        })}
      </div>

      {/* Coming Soon Card */}
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 bg-opacity-30 rounded-2xl mx-auto mb-6 flex items-center justify-center">
          <Rocket className="text-yellow-400 w-8 h-8" />
        </div>
        <h3 className="text-white font-semibold text-xl mb-3">Coming in Part-B</h3>
        <p className="text-white/70 mb-6 max-w-md mx-auto">
          Cash-to-UPI and UPI-to-cash exchange features will be available in the next release. 
          Stay tuned for seamless money conversion capabilities.
        </p>
        
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-2xl mb-2">💳</div>
            <p className="text-white/80 text-sm font-medium">Instant Conversion</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-white/80 text-sm font-medium">Secure Transactions</p>
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">What's Coming</h3>
        
        <div className="grid gap-3">
          <div className="glass-card rounded-xl p-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500/30 rounded-lg flex items-center justify-center">
              <span className="text-green-400 text-sm">✓</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">Real-time exchange rates</p>
              <p className="text-white/60 text-xs">Live rates for optimal conversions</p>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center">
              <span className="text-blue-400 text-sm">✓</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">QR code withdrawals</p>
              <p className="text-white/60 text-xs">Scan to withdraw cash from ATMs</p>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-500/30 rounded-lg flex items-center justify-center">
              <span className="text-purple-400 text-sm">✓</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">Multi-currency support</p>
              <p className="text-white/60 text-xs">Support for multiple digital currencies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
