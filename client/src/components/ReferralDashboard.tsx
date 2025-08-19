import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Star, Users, Gift, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '@/lib/i18n';

interface ReferralData {
  code: string;
  uses_count: number;
  max_uses: number;
  is_active: boolean;
  created_at: string;
  reward_state: string;
}

interface CampusKarma {
  points: number;
  level: string;
  total_referrals: number;
  total_plans_created: number;
}

interface ShareUrls {
  whatsapp: string;
  copy: string;
  generic: string;
}

export function ReferralDashboard() {
  const { t } = useTranslation(['referrals', 'common']);
  const { toast } = useToast();
  
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [campusKarma, setCampusKarma] = useState<CampusKarma | null>(null);
  const [shareUrls, setShareUrls] = useState<ShareUrls | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      
      // Load existing referrals
      const referralsResponse = await fetch('/api/referrals/mine', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (referralsResponse.ok) {
        const referralsData = await referralsResponse.json();
        setReferrals(referralsData);
      }
      
      // Load campus karma
      const karmaResponse = await fetch('/api/me/campus-karma', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (karmaResponse.ok) {
        const karmaData = await karmaResponse.json();
        setCampusKarma(karmaData);
      }
      
      // Create referral code if none exists
      if (referralsData.length === 0) {
        await createReferralCode();
      } else {
        // Generate share URLs for existing code
        const code = referralsData[0].code;
        generateShareUrls(code);
      }
      
    } catch (error) {
      console.error('Failed to load referral data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createReferralCode = async () => {
    try {
      const response = await fetch('/api/referrals/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setShareUrls(data.shareUrls);
        
        // Reload referrals to get the new one
        await loadReferralData();
      } else {
        throw new Error('Failed to create referral code');
      }
    } catch (error) {
      console.error('Failed to create referral code:', error);
      toast({
        title: 'Error',
        description: 'Failed to create referral code',
        variant: 'destructive'
      });
    }
  };

  const generateShareUrls = (code: string) => {
    const baseUrl = window.location.origin;
    const message = t('shareMessage');
    const fullMessage = `${message} Use code ${code} to get started! ${baseUrl}/join?ref=${code}`;
    
    setShareUrls({
      whatsapp: `https://wa.me/?text=${encodeURIComponent(fullMessage)}`,
      copy: code,
      generic: `${baseUrl}/join?ref=${code}`
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(text);
      
      toast({
        title: t('common:copied'),
        description: 'Referral code copied to clipboard',
      });
      
      // Track copy event
      await fetch('/api/growth/event', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType: 'referral_copy',
          data: { code: text }
        })
      });
      
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      });
    } finally {
      setCopying(false);
    }
  };

  const shareViaWhatsApp = () => {
    if (shareUrls?.whatsapp) {
      window.open(shareUrls.whatsapp, '_blank');
      
      // Track share event
      fetch('/api/growth/event', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType: 'referral_share',
          data: { platform: 'whatsapp' }
        })
      });
    }
  };

  const getLevelColor = (level: string): string => {
    const colors = {
      fresher: 'bg-green-100 text-green-800',
      regular: 'bg-blue-100 text-blue-800',
      senior: 'bg-purple-100 text-purple-800',
      ambassador: 'bg-yellow-100 text-yellow-800'
    };
    return colors[level as keyof typeof colors] || colors.fresher;
  };

  const getLevelEmoji = (level: string): string => {
    const emojis = {
      fresher: '🌱',
      regular: '⭐',
      senior: '👑',
      ambassador: '🏆'
    };
    return emojis[level as keyof typeof emojis] || emojis.fresher;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  const mainReferral = referrals[0];

  return (
    <div className="space-y-6" data-testid="referral-dashboard">
      {/* Campus Karma Card */}
      {campusKarma && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                {t('campusKarma')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{getLevelEmoji(campusKarma.level)}</span>
                    <Badge className={`${getLevelColor(campusKarma.level)} border-0`}>
                      {campusKarma.level}
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold">{campusKarma.points}</p>
                  <p className="text-sm opacity-90">{t('points')}</p>
                </div>
                <div className="text-right">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{campusKarma.total_referrals} {t('totalReferrals')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      <span>{campusKarma.total_plans_created} Plans Created</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Referral Code Card */}
      {mainReferral && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                {t('title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Code Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('yourCode')}</label>
                <div className="flex gap-2">
                  <Input
                    value={mainReferral.code}
                    readOnly
                    className="font-mono text-lg text-center"
                    data-testid="input-referral-code"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(mainReferral.code)}
                    disabled={copying}
                    data-testid="button-copy-code"
                  >
                    <Copy className={`h-4 w-4 ${copying ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <p className="font-medium">Usage</p>
                  <p className="text-muted-foreground">
                    {mainReferral.uses_count} / {mainReferral.max_uses} uses
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">Status</p>
                  <Badge variant={mainReferral.is_active ? 'default' : 'secondary'}>
                    {mainReferral.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={shareViaWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="button-share-whatsapp"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('inviteViaWhatsApp')}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => shareUrls && copyToClipboard(shareUrls.generic)}
                  className="w-full"
                  data-testid="button-copy-link"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t('copyCode')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>How Referrals Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Share Your Code</p>
                  <p className="text-sm text-muted-foreground">
                    Send your referral code to friends via WhatsApp or copy the link
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Friends Join</p>
                  <p className="text-sm text-muted-foreground">
                    When they sign up using your code, both of you earn Campus Karma points
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Build Reputation</p>
                  <p className="text-sm text-muted-foreground">
                    Earn points, level up, and unlock ambassador status for campus perks
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}