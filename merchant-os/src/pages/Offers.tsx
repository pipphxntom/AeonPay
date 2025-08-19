import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';

interface MerchantOffer {
  id: string;
  label: string;
  description: string;
  cap_price_per_head: string;
  window_start: string;
  window_end: string;
  days_of_week: number[];
  is_active: boolean;
  max_redemptions_per_day: number;
  terms: string;
}

export default function Offers() {
  const { merchant } = useAuthStore();
  const [offers, setOffers] = useState<MerchantOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    description: '',
    cap_price_per_head: '',
    window_start: '09:00',
    window_end: '17:00',
    days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
    max_redemptions_per_day: 100,
    terms: ''
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    setIsLoading(true);
    try {
      // Simulate API call - in production this would fetch from /api/merchant/offers
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOffers([
        {
          id: '1',
          label: 'Lunch Special',
          description: '20% off on all lunch items',
          cap_price_per_head: '25.00',
          window_start: '11:00',
          window_end: '15:00',
          days_of_week: [1, 2, 3, 4, 5],
          is_active: true,
          max_redemptions_per_day: 50,
          terms: 'Valid for dine-in only'
        },
        {
          id: '2',
          label: 'Coffee & Pastry Combo',
          description: 'Get coffee and pastry for ₹15',
          cap_price_per_head: '15.00',
          window_start: '07:00',
          window_end: '11:00',
          days_of_week: [1, 2, 3, 4, 5, 6, 0],
          is_active: true,
          max_redemptions_per_day: 30,
          terms: 'Subject to availability'
        }
      ]);
    } catch (error) {
      console.error('Failed to load offers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Simulate API call - in production this would POST to /api/merchant/offers
      const newOffer: MerchantOffer = {
        id: Date.now().toString(),
        ...formData,
        is_active: true
      };
      
      setOffers([...offers, newOffer]);
      setShowCreateForm(false);
      setFormData({
        label: '',
        description: '',
        cap_price_per_head: '',
        window_start: '09:00',
        window_end: '17:00',
        days_of_week: [1, 2, 3, 4, 5],
        max_redemptions_per_day: 100,
        terms: ''
      });
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  };

  const toggleOfferStatus = async (offerId: string) => {
    setOffers(offers.map(offer => 
      offer.id === offerId 
        ? { ...offer, is_active: !offer.is_active }
        : offer
    ));
  };

  const getDayName = (dayNum: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayNum];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded-lg mb-4"></div>
          <div className="grid gap-6">
            {[1, 2].map(i => (
              <div key={i} className="glass-card rounded-2xl p-6">
                <div className="h-6 bg-white/10 rounded mb-2"></div>
                <div className="h-4 bg-white/10 rounded mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Offers Management</h1>
          <p className="text-white/70">Create and manage your promotional offers</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-white font-medium transition-colors spring-bounce"
          data-testid="button-create-offer"
        >
          + Create Offer
        </button>
      </div>

      {/* Create Offer Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Offer</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-white/70 hover:text-white text-2xl"
                data-testid="button-close-modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">Offer Name</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="e.g., Lunch Special"
                    required
                    data-testid="input-offer-name"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Price Cap (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cap_price_per_head}
                    onChange={(e) => setFormData({ ...formData, cap_price_per_head: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="25.00"
                    required
                    data-testid="input-price-cap"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 h-24 resize-none"
                  placeholder="Brief description of the offer"
                  required
                  data-testid="input-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">Start Time</label>
                  <input
                    type="time"
                    value={formData.window_start}
                    onChange={(e) => setFormData({ ...formData, window_start: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    data-testid="input-start-time"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">End Time</label>
                  <input
                    type="time"
                    value={formData.window_end}
                    onChange={(e) => setFormData({ ...formData, window_end: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    data-testid="input-end-time"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Daily Redemption Limit</label>
                <input
                  type="number"
                  value={formData.max_redemptions_per_day}
                  onChange={(e) => setFormData({ ...formData, max_redemptions_per_day: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="100"
                  data-testid="input-redemption-limit"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Terms & Conditions</label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 h-20 resize-none"
                  placeholder="Any terms and conditions for the offer"
                  data-testid="input-terms"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                  data-testid="button-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-white font-medium transition-colors spring-bounce"
                  data-testid="button-submit-offer"
                >
                  Create Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offers List */}
      <div className="space-y-6">
        {offers.map((offer) => (
          <div key={offer.id} className="glass-card rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-bold text-white">{offer.label}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    offer.is_active
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {offer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-white/70 mb-4">{offer.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-white/70">Price Cap:</span>
                    <span className="text-white ml-2 font-medium">₹{offer.cap_price_per_head}</span>
                  </div>
                  <div>
                    <span className="text-white/70">Time:</span>
                    <span className="text-white ml-2 font-medium">{offer.window_start} - {offer.window_end}</span>
                  </div>
                  <div>
                    <span className="text-white/70">Daily Limit:</span>
                    <span className="text-white ml-2 font-medium">{offer.max_redemptions_per_day}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-white/70 text-sm">Active Days:</span>
                  <div className="flex space-x-2 mt-1">
                    {offer.days_of_week.map((day) => (
                      <span key={day} className="px-2 py-1 bg-white/10 rounded text-white text-xs">
                        {getDayName(day)}
                      </span>
                    ))}
                  </div>
                </div>

                {offer.terms && (
                  <div className="mt-3">
                    <span className="text-white/70 text-sm">Terms:</span>
                    <p className="text-white/70 text-sm mt-1">{offer.terms}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 ml-6">
                <button
                  onClick={() => toggleOfferStatus(offer.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    offer.is_active
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                      : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                  }`}
                  data-testid={`button-toggle-${offer.id}`}
                >
                  {offer.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}