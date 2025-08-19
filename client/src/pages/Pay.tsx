import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Cake, Film, Map, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { getAuthToken } from '@/lib/queryClient';
import { Merchant } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  capPerHead: number;
  icon: React.ComponentType;
  color: string;
}

export default function Pay() {
  const { openPaymentIntentSheet, setSelectedMerchant, setPaymentAmount } = useAppStore();
  const { toast } = useToast();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [manualUPI, setManualUPI] = useState('');

  const { data: merchants = [] } = useQuery({
    queryKey: ['/api/merchants'],
    queryFn: async (): Promise<Merchant[]> => {
      const response = await fetch('/api/merchants', {
        headers: { 
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      return response.json();
    },
  });

  const planTemplates: PlanTemplate[] = [
    {
      id: 'birthday',
      name: 'Birthday Party',
      description: 'Perfect for celebrations',
      capPerHead: 300,
      icon: Cake,
      color: 'from-pink-500 to-rose-500',
    },
    {
      id: 'movie',
      name: 'Movie Night',
      description: 'Snacks and tickets',
      capPerHead: 200,
      icon: Film,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'trip',
      name: 'Trip Planning',
      description: 'Travel and activities',
      capPerHead: 1500,
      icon: Map,
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const handleTemplateSelect = (template: PlanTemplate) => {
    // For demo purposes, show coming soon for templates
    toast({
      title: "Feature Preview",
      description: `${template.name} template will prefill the create plan form.`,
    });
  };

  const handleQRScan = () => {
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(() => {
          toast({
            title: "Camera Access Granted",
            description: "In production, this would open the QR scanner.",
          });
          // Simulate QR scan success - select first merchant
          if (merchants.length > 0) {
            setSelectedMerchant(merchants[0]);
            setPaymentAmount(150); // Demo amount
            openPaymentIntentSheet();
          }
        })
        .catch(() => {
          toast({
            title: "Camera Access Denied",
            description: "Please enable camera access or enter UPI ID manually.",
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "Camera Not Available",
        description: "Please enter UPI ID manually.",
        variant: "destructive",
      });
    }
  };

  const handleManualEntry = () => {
    if (!manualUPI.trim()) {
      toast({
        title: "UPI ID Required",
        description: "Please enter a valid UPI ID.",
        variant: "destructive",
      });
      return;
    }

    // Simulate finding merchant
    if (merchants.length > 0) {
      setSelectedMerchant(merchants[0]);
      setPaymentAmount(200); // Demo amount
      openPaymentIntentSheet();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Pay</h1>
        <p className="text-white/80">Choose a plan template or scan QR</p>
      </div>

      {/* Plan Templates */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Plan Templates</h2>
        <div className="space-y-4">
          {planTemplates.map((template) => {
            const IconComponent = template.icon;
            return (
              <Button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="w-full glass-card rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 h-auto tap-target focus-ring"
                variant="ghost"
                data-testid={`template-${template.id}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${template.color} bg-opacity-30 rounded-xl flex items-center justify-center`}>
                      <div className="w-6 h-6 text-white flex items-center justify-center">
                        <IconComponent />
                      </div>
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-semibold">{template.name}</h3>
                      <p className="text-white/70 text-sm">{template.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">₹{template.capPerHead.toLocaleString()}</p>
                    <p className="text-white/70 text-sm">per head</p>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* QR Scanner Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="text-center">
          <div className="w-16 h-16 brand-gradient rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Camera className="text-white w-8 h-8" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Scan QR Code</h3>
          <p className="text-white/70 mb-6">Point your camera at a merchant QR code</p>
          
          <Button
            onClick={handleQRScan}
            className="w-full brand-gradient text-white font-medium py-4 px-6 hover:shadow-lg transition-all duration-300 mb-3"
            data-testid="button-open-scanner"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Open Scanner
          </Button>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-transparent px-2 text-white/70">or</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="manualUPI" className="text-white/80 text-sm font-medium sr-only">
                UPI ID
              </Label>
              <Input
                id="manualUPI"
                type="text"
                placeholder="Enter UPI ID (e.g., merchant@paytm)"
                value={manualUPI}
                onChange={(e) => setManualUPI(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-brand-blue"
                data-testid="input-manual-upi"
              />
            </div>
            
            <Button
              onClick={handleManualEntry}
              variant="outline"
              className="w-full border-white/30 text-white hover:bg-white/10"
              data-testid="button-manual-entry"
            >
              Continue with UPI ID
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
