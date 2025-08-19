import { create } from 'zustand';

interface Merchant {
  id: string;
  name: string;
  email: string;
  campus_id: string;
  category: string;
  kyc_status: string;
}

interface AuthState {
  merchant: Merchant | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  setMerchant: (merchant: Merchant) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  merchant: null,
  token: null,
  isLoading: false,

  login: async (credentials) => {
    set({ isLoading: true });
    
    try {
      // Mock login for demo - in production this would call the API
      const mockMerchant: Merchant = {
        id: 'merchant-1',
        name: 'Campus Cafe',
        email: credentials.email,
        campus_id: 'campus-1',
        category: 'food',
        kyc_status: 'verified'
      };
      
      const mockToken = 'mock-jwt-token';
      
      set({ 
        merchant: mockMerchant, 
        token: mockToken, 
        isLoading: false 
      });
      
      localStorage.setItem('merchant_token', mockToken);
      localStorage.setItem('merchant_data', JSON.stringify(mockMerchant));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    set({ merchant: null, token: null });
    localStorage.removeItem('merchant_token');
    localStorage.removeItem('merchant_data');
  },

  setMerchant: (merchant) => {
    set({ merchant });
  },
}));

// Initialize from localStorage on app start
const initializeAuth = () => {
  const token = localStorage.getItem('merchant_token');
  const merchantData = localStorage.getItem('merchant_data');
  
  if (token && merchantData) {
    try {
      const merchant = JSON.parse(merchantData);
      useAuthStore.getState().setMerchant(merchant);
    } catch (error) {
      localStorage.removeItem('merchant_token');
      localStorage.removeItem('merchant_data');
    }
  }
};

initializeAuth();