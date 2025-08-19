import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface KycVerification {
  id: string;
  kyc_level: string;
  verification_status: string;
  name?: string;
  date_of_birth?: string;
  document_type?: string;
  document_number?: string;
}

interface KycLimits {
  [key: string]: {
    dailySwapLimit: number;
    monthlySpendLimit: number;
    features: string[];
  };
}

const KYC_LIMITS: KycLimits = {
  basic: {
    dailySwapLimit: 5000,
    monthlySpendLimit: 50000,
    features: ['Basic payments', 'Campus merchants', 'Simple swaps']
  },
  plus: {
    dailySwapLimit: 25000,
    monthlySpendLimit: 200000,
    features: ['All basic features', 'Partner merchant swaps', 'UPI ATM access', 'Advanced analytics']
  },
  premium: {
    dailySwapLimit: 100000,
    monthlySpendLimit: 1000000,
    features: ['All plus features', 'International payments', 'Priority support', 'Investment features']
  }
};

export default function KycUpgrade() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState<'plus' | 'premium'>('plus');
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    document_type: 'aadhar',
    document_number: ''
  });

  const { data: kycData, isLoading } = useQuery({
    queryKey: ['/api/kyc/verification'],
    staleTime: 30000
  }) as { data: KycVerification | { status: string }, isLoading: boolean };

  const upgradeMutation = useMutation({
    mutationFn: (upgradeData: any) => 
      apiRequest('/api/kyc/submit', {
        method: 'POST',
        body: JSON.stringify({
          ...upgradeData,
          kyc_level: selectedLevel
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kyc/verification'] });
      toast({
        title: "KYC Upgrade Submitted",
        description: "Your verification request has been submitted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upgrade Failed",
        description: "Failed to submit KYC upgrade request. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upgradeMutation.mutate(formData);
  };

  const currentLevel = kycData && 'kyc_level' in kycData 
    ? kycData.kyc_level 
    : 'basic';

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Upgrade Your KYC Level</h1>
        <p className="text-muted-foreground">
          Unlock higher limits and premium features with KYC verification
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Current KYC Level
            <span className="text-sm px-3 py-1 bg-primary/10 text-primary rounded-full">
              {currentLevel.toUpperCase()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Daily Swap Limit</p>
              <p className="text-2xl font-bold text-primary">
                ₹{KYC_LIMITS[currentLevel as keyof KycLimits]?.dailySwapLimit.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="font-medium">Monthly Spend Limit</p>
              <p className="text-2xl font-bold text-primary">
                ₹{KYC_LIMITS[currentLevel as keyof KycLimits]?.monthlySpendLimit.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      <div className="grid md:grid-cols-2 gap-4">
        {(['plus', 'premium'] as const).map((level) => (
          <Card 
            key={level}
            className={`cursor-pointer border-2 transition-colors ${
              selectedLevel === level 
                ? 'border-primary bg-primary/5' 
                : 'border-muted hover:border-primary/50'
            }`}
            onClick={() => setSelectedLevel(level)}
            data-testid={`card-${level}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                KYC {level.charAt(0).toUpperCase() + level.slice(1)}
                <input
                  type="radio"
                  name="kycLevel"
                  value={level}
                  checked={selectedLevel === level}
                  onChange={() => setSelectedLevel(level)}
                  className="w-4 h-4"
                  data-testid={`radio-${level}`}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Daily Limit</p>
                  <p className="text-lg font-bold text-primary">
                    ₹{KYC_LIMITS[level].dailySwapLimit.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Monthly Limit</p>
                  <p className="text-lg font-bold text-primary">
                    ₹{KYC_LIMITS[level].monthlySpendLimit.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="font-medium mb-2">Features Included:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {KYC_LIMITS[level].features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Verification Form */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="As per government ID"
                  required
                  data-testid="input-name"
                />
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  required
                  data-testid="input-dob"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="docType">Document Type</Label>
                <Select 
                  value={formData.document_type} 
                  onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                >
                  <SelectTrigger data-testid="select-document-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aadhar">Aadhar Card</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="driving_license">Driving License</SelectItem>
                    <SelectItem value="voter_id">Voter ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="docNumber">Document Number</Label>
                <Input
                  id="docNumber"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  placeholder="Enter document number"
                  required
                  data-testid="input-document-number"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={upgradeMutation.isPending}
                data-testid="button-submit-kyc"
              >
                {upgradeMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  `Upgrade to KYC ${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)}`
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <div>
                <p className="font-medium">Valid Government ID</p>
                <p className="text-muted-foreground">Aadhar, Passport, Driving License, or Voter ID</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <div>
                <p className="font-medium">Verification Process</p>
                <p className="text-muted-foreground">Takes 1-2 business days for manual review</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <div>
                <p className="font-medium">Data Security</p>
                <p className="text-muted-foreground">All information is encrypted and stored securely</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}