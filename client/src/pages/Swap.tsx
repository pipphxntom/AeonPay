import { useState } from 'react';
import { ArrowLeftRight, MapPin, DollarSign, Smartphone, Building2, Navigation, Star, AlertTriangle, Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SwapMatch {
  id: string;
  amount: number;
  distance: string;
  trust_score: number;
  user_name: string;
  location_hint: string;
  created_at: string;
}

interface Partner {
  id: string;
  name: string;
  location_latlng: string;
  incentive_amount: string;
  upi_id: string;
}

interface UpiAtm {
  id: string;
  name: string;
  location_latlng: string;
  provider: string;
  address: string;
}

export default function Swap() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('peer');
  const [swapDirection, setSwapDirection] = useState<'cash_to_upi' | 'upi_to_cash'>('cash_to_upi');
  const [amount, setAmount] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<SwapMatch | null>(null);
  const [swapState, setSwapState] = useState<'selecting' | 'matched' | 'handshake' | 'confirmed' | 'disputed'>('selecting');
  const [swapCode, setSwapCode] = useState('');
  const [showTwoWayQR, setShowTwoWayQR] = useState(false);

  // Fetch swap matches
  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['/api/swap/matches', swapDirection],
    enabled: activeTab === 'peer' && amount !== '',
    queryFn: () => apiRequest(`/api/swap/matches?near=28.6139,77.2090&dir=${swapDirection}`),
  });

  // Fetch partners
  const { data: partners, isLoading: partnersLoading } = useQuery({
    queryKey: ['/api/swap/partners'],
    enabled: activeTab === 'merchant',
  });

  // Fetch UPI ATMs
  const { data: upiAtms, isLoading: atmsLoading } = useQuery({
    queryKey: ['/api/swap/upi_atms'],
    enabled: activeTab === 'atm',
  });

  // Create swap mutation
  const createSwapMutation = useMutation({
    mutationFn: (swapData: any) => apiRequest('/api/swap/create', 'POST', swapData),
    onSuccess: () => {
      toast({
        title: "Swap Created",
        description: "Looking for matches nearby...",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/swap/matches'] });
    },
  });

  // Accept swap mutation
  const acceptSwapMutation = useMutation({
    mutationFn: (swapId: string) => apiRequest('/api/swap/accept', 'POST', { swap_id: swapId }),
    onSuccess: () => {
      setSwapState('matched');
      toast({
        title: "Swap Matched!",
        description: "Initiating handshake process...",
      });
    },
  });

  // Handshake mutation
  const handshakeMutation = useMutation({
    mutationFn: (swapId: string) => apiRequest('/api/swap/handshake', 'POST', { swap_id: swapId }),
    onSuccess: (data) => {
      setSwapCode(data.swap_code);
      setSwapState('handshake');
      setShowTwoWayQR(true);
    },
  });

  // Confirm swap mutation
  const confirmSwapMutation = useMutation({
    mutationFn: (swapId: string) => apiRequest('/api/swap/confirm', 'POST', { swap_id: swapId, upi_verified: true }),
    onSuccess: () => {
      setSwapState('confirmed');
      setShowTwoWayQR(false);
      toast({
        title: "Swap Completed!",
        description: "Transaction confirmed successfully.",
      });
    },
  });

  // Dispute swap mutation
  const disputeSwapMutation = useMutation({
    mutationFn: (data: { swapId: string; reason: string }) => 
      apiRequest('/api/swap/dispute', 'POST', { swap_id: data.swapId, reason: data.reason }),
    onSuccess: () => {
      setSwapState('disputed');
      toast({
        title: "Dispute Raised",
        description: "Your dispute has been recorded. Support will contact you.",
        variant: "destructive"
      });
    },
  });

  const handleCreateSwap = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    createSwapMutation.mutate({
      mode: 'peer',
      direction: swapDirection,
      amount: parseFloat(amount),
      location_latlng: "28.6139,77.2090" // Mock location
    });
  };

  const handleAcceptSwap = (match: SwapMatch) => {
    setSelectedMatch(match);
    acceptSwapMutation.mutate(match.id);
  };

  const handleInitiateHandshake = () => {
    if (selectedMatch) {
      handshakeMutation.mutate(selectedMatch.id);
    }
  };

  const handleConfirmSwap = () => {
    if (selectedMatch) {
      confirmSwapMutation.mutate(selectedMatch.id);
    }
  };

  const handleDispute = (reason: string) => {
    if (selectedMatch) {
      disputeSwapMutation.mutate({ swapId: selectedMatch.id, reason });
    }
  };

  const renderPeerTab = () => (
    <div className="space-y-6">
      {/* Swap Direction Tiles */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => setSwapDirection('cash_to_upi')}
          className={`h-20 glass-card rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 ${
            swapDirection === 'cash_to_upi' ? 'ring-2 ring-green-400' : ''
          }`}
          variant="ghost"
          data-testid="button-cash-to-upi"
        >
          <DollarSign className="w-6 h-6 text-green-400" />
          <span className="text-white text-sm font-medium">Cash → UPI</span>
        </Button>
        
        <Button
          onClick={() => setSwapDirection('upi_to_cash')}
          className={`h-20 glass-card rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 ${
            swapDirection === 'upi_to_cash' ? 'ring-2 ring-blue-400' : ''
          }`}
          variant="ghost"
          data-testid="button-upi-to-cash"
        >
          <Smartphone className="w-6 h-6 text-blue-400" />
          <span className="text-white text-sm font-medium">UPI → Cash</span>
        </Button>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-white">Amount (₹)</Label>
        <Input
          id="amount"
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="glass-card bg-white/10 border-white/20 text-white placeholder-white/60"
          data-testid="input-amount"
        />
      </div>

      <Button
        onClick={handleCreateSwap}
        disabled={createSwapMutation.isPending}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        data-testid="button-create-swap"
      >
        {createSwapMutation.isPending ? 'Creating...' : 'Find Matches'}
      </Button>

      {/* Safety Notice */}
      <div className="glass-card rounded-xl p-4 border-l-4 border-yellow-400">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-medium text-sm">Safety First</span>
        </div>
        <p className="text-white/80 text-sm mt-1">
          Public spots recommended • Daytime preferred • Trust your instincts
        </p>
      </div>

      {/* Matches List */}
      {matches && matches.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold">Nearby Matches</h3>
          {matches.map((match: SwapMatch) => (
            <Card key={match.id} className="glass-card border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-white font-medium">₹{match.amount}</span>
                      <Badge variant="secondary" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {match.distance}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-white/80 text-xs">{match.trust_score}/5</span>
                      </div>
                    </div>
                    <p className="text-white/60 text-sm">{match.location_hint}</p>
                    <p className="text-white/40 text-xs mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(match.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleAcceptSwap(match)}
                    disabled={acceptSwapMutation.isPending}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid={`button-accept-${match.id}`}
                  >
                    Accept
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Two-Way QR Modal */}
      <Dialog open={showTwoWayQR} onOpenChange={setShowTwoWayQR}>
        <DialogContent className="glass-card border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Swap Handshake</DialogTitle>
            <DialogDescription className="text-white/70">
              {swapDirection === 'cash_to_upi' 
                ? "UPI received, hand over cash" 
                : "Cash received, complete UPI transfer"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Swap Code */}
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">Share this code:</p>
              <div className="bg-white/10 rounded-xl p-4">
                <span className="text-2xl font-mono text-white tracking-widest">{swapCode}</span>
              </div>
            </div>

            {/* Mock QR Code */}
            <div className="flex justify-center">
              <div className="w-32 h-32 bg-white rounded-xl p-2">
                <div className="w-full h-full bg-black/10 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gray-600">QR Code</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <Button
                onClick={handleConfirmSwap}
                disabled={confirmSwapMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="button-confirm-swap"
              >
                <Check className="w-4 h-4 mr-2" />
                Confirm
              </Button>
              <Button
                onClick={() => handleDispute("Transaction issue")}
                disabled={disputeSwapMutation.isPending}
                variant="destructive"
                className="flex-1"
                data-testid="button-dispute-swap"
              >
                <X className="w-4 h-4 mr-2" />
                Dispute
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderMerchantTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-semibold mb-2">Merchant Partners</h3>
        <p className="text-white/70 text-sm">Swap with verified merchant partners and earn incentives</p>
      </div>

      {partnersLoading ? (
        <div className="text-white/60 text-center py-8">Loading partners...</div>
      ) : (
        <div className="space-y-3">
          {partners?.map((partner: Partner) => (
            <Card key={partner.id} className="glass-card border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium">{partner.name}</span>
                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                        +₹{partner.incentive_amount}
                      </Badge>
                    </div>
                    <p className="text-white/60 text-sm">{partner.upi_id}</p>
                    <p className="text-white/40 text-xs">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {partner.location_latlng}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid={`button-partner-${partner.id}`}
                  >
                    Swap Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderAtmTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-semibold mb-2">UPI ATMs</h3>
        <p className="text-white/70 text-sm">Find nearby UPI-enabled ATMs for quick cash withdrawals</p>
      </div>

      {atmsLoading ? (
        <div className="text-white/60 text-center py-8">Loading ATMs...</div>
      ) : (
        <div className="space-y-3">
          {upiAtms?.map((atm: UpiAtm) => (
            <Card key={atm.id} className="glass-card border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white font-medium">{atm.name}</span>
                    </div>
                    <p className="text-white/60 text-sm">{atm.provider}</p>
                    <p className="text-white/40 text-xs">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {atm.address}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    data-testid={`button-directions-${atm.id}`}
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    Directions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">SwapHub</h1>
        <p className="text-white/80">Exchange cash and digital money safely</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 glass-card bg-white/10">
          <TabsTrigger value="peer" className="text-white data-[state=active]:bg-white/20">
            Peer
          </TabsTrigger>
          <TabsTrigger value="merchant" className="text-white data-[state=active]:bg-white/20">
            Merchant
          </TabsTrigger>
          <TabsTrigger value="atm" className="text-white data-[state=active]:bg-white/20">
            UPI-ATM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="peer">{renderPeerTab()}</TabsContent>
        <TabsContent value="merchant">{renderMerchantTab()}</TabsContent>
        <TabsContent value="atm">{renderAtmTab()}</TabsContent>
      </Tabs>
    </div>
  );
}