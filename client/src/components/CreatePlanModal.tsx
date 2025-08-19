import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '@/lib/store';
import { apiRequest, getAuthToken } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Merchant } from '@shared/schema';

export default function CreatePlanModal() {
  const { 
    isCreatePlanModalOpen, 
    closeCreatePlanModal, 
    openReserveCapsSheet 
  } = useAppStore();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: '',
    capPerHead: '300',
    duration: '6',
    merchantCategories: [] as string[],
    memberIds: [] as string[],
  });

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

  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + parseInt(formData.duration) * 60 * 60 * 1000);
      
      const response = await apiRequest('POST', '/api/plans', {
        ...planData,
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me/plans'] });
      toast({
        title: "Plan Created",
        description: "Your plan has been created successfully.",
      });
      closeCreatePlanModal();
      openReserveCapsSheet();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedMerchants = merchants
      .filter(m => formData.merchantCategories.includes(m.category))
      .map(m => m.id);

    createPlanMutation.mutate({
      name: formData.name,
      cap_per_head: formData.capPerHead,
      merchant_whitelist: selectedMerchants,
      member_ids: formData.memberIds,
    });
  };

  const merchantCategories = [
    { id: 'food', name: '🍕 Food', description: 'Pizza, sandwiches, meals' },
    { id: 'beverages', name: '☕ Drinks', description: 'Coffee, juice, tea' },
    { id: 'snacks', name: '🥪 Snacks', description: 'Quick bites, fruits' },
    { id: 'desserts', name: '🍦 Desserts', description: 'Ice cream, cakes' },
  ];

  const demoUsers = [
    { id: 'user-1', name: 'Alice Johnson', avatar: 'A' },
    { id: 'user-2', name: 'Bob Wilson', avatar: 'B' },
    { id: 'user-3', name: 'Carol Brown', avatar: 'C' },
    { id: 'user-4', name: 'David Lee', avatar: 'D' },
    { id: 'user-5', name: 'Emma Davis', avatar: 'E' },
  ];

  return (
    <Dialog open={isCreatePlanModalOpen} onOpenChange={closeCreatePlanModal}>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create New Plan</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeCreatePlanModal}
            className="text-white/70 hover:text-white tap-target focus-ring"
            data-testid="close-create-plan-modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="planName" className="text-white/80 text-sm font-medium">
              Plan Name
            </Label>
            <Input
              id="planName"
              type="text"
              placeholder="e.g., Birthday Party"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-2 bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-brand-blue"
              required
              data-testid="input-plan-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/80 text-sm font-medium">Cap per head</Label>
              <Select value={formData.capPerHead} onValueChange={(value) => 
                setFormData({ ...formData, capPerHead: value })
              }>
                <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white focus:border-brand-blue" data-testid="select-cap-per-head">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="200">₹200</SelectItem>
                  <SelectItem value="300">₹300</SelectItem>
                  <SelectItem value="400">₹400</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-white/80 text-sm font-medium">Duration</Label>
              <Select value={formData.duration} onValueChange={(value) =>
                setFormData({ ...formData, duration: value })
              }>
                <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white focus:border-brand-blue" data-testid="select-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">Full day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white/80 text-sm font-medium mb-3 block">
              Merchant Categories
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {merchantCategories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center space-x-2 bg-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-colors"
                >
                  <Checkbox
                    checked={formData.merchantCategories.includes(category.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          merchantCategories: [...formData.merchantCategories, category.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          merchantCategories: formData.merchantCategories.filter(c => c !== category.id)
                        });
                      }
                    }}
                    data-testid={`checkbox-category-${category.id}`}
                  />
                  <span className="text-white text-sm">{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-white/80 text-sm font-medium mb-3 block">
              Invite Members
            </Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {demoUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center space-x-3 bg-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-colors"
                >
                  <Checkbox
                    checked={formData.memberIds.includes(user.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          memberIds: [...formData.memberIds, user.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          memberIds: formData.memberIds.filter(id => id !== user.id)
                        });
                      }
                    }}
                    data-testid={`checkbox-member-${user.id}`}
                  />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-xs text-white font-medium">
                    {user.avatar}
                  </div>
                  <span className="text-white text-sm">{user.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={closeCreatePlanModal}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white"
              data-testid="button-cancel-create-plan"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPlanMutation.isPending}
              className="flex-1 brand-gradient text-white font-medium hover:shadow-lg transition-all duration-300"
              data-testid="button-submit-create-plan"
            >
              {createPlanMutation.isPending ? (
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Next
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
