import { useState } from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [phone, setPhone] = useState('');
  const loginMutation = useLogin();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate(phone, {
      onError: () => {
        toast({
          title: "Login Failed",
          description: "Unable to login. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-20 h-20 brand-gradient rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">Æ</span>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to AeonPay</h1>
          <p className="text-white/70 mb-8">Smart group payments made simple</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-left">
              <Label htmlFor="phone" className="text-white/80 text-sm font-medium">
                Phone Number
              </Label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-12 bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-brand-blue"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full brand-gradient text-white font-medium py-4 hover:shadow-lg transition-all duration-300 tap-target focus-ring"
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                'Continue with Phone'
              )}
            </Button>
          </form>
          
          <p className="text-white/60 text-sm mt-6">
            Mock authentication - any phone number works
          </p>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-white/60 text-sm">
            Made with 💙 for seamless group payments
          </p>
        </div>
      </div>
    </div>
  );
}
