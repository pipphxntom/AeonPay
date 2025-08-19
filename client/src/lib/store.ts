import { create } from 'zustand';
import { User, Plan, Merchant } from '@shared/schema';

interface UIState {
  currentScreen: string;
  isCreatePlanModalOpen: boolean;
  isReserveCapsSheetOpen: boolean;
  isPaymentIntentSheetOpen: boolean;
  isGuardrailDialogOpen: boolean;
  selectedPlan: Plan | null;
  selectedMerchant: Merchant | null;
  paymentAmount: number;
  paymentMode: 'vouchers' | 'mandates' | 'split_later';
  reservationMode: 'vouchers' | 'mandates';
}

interface AppState extends UIState {
  // UI Actions
  setCurrentScreen: (screen: string) => void;
  openCreatePlanModal: () => void;
  closeCreatePlanModal: () => void;
  openReserveCapsSheet: () => void;
  closeReserveCapsSheet: () => void;
  openPaymentIntentSheet: () => void;
  closePaymentIntentSheet: () => void;
  openGuardrailDialog: () => void;
  closeGuardrailDialog: () => void;
  setSelectedPlan: (plan: Plan | null) => void;
  setSelectedMerchant: (merchant: Merchant | null) => void;
  setPaymentAmount: (amount: number) => void;
  setPaymentMode: (mode: 'vouchers' | 'mandates' | 'split_later') => void;
  setReservationMode: (mode: 'vouchers' | 'mandates') => void;
  
  // Close all modals
  closeAllModals: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  currentScreen: 'home',
  isCreatePlanModalOpen: false,
  isReserveCapsSheetOpen: false,
  isPaymentIntentSheetOpen: false,
  isGuardrailDialogOpen: false,
  selectedPlan: null,
  selectedMerchant: null,
  paymentAmount: 0,
  paymentMode: 'vouchers',
  reservationMode: 'vouchers',
  
  // Actions
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  
  openCreatePlanModal: () => set({ isCreatePlanModalOpen: true }),
  closeCreatePlanModal: () => set({ isCreatePlanModalOpen: false }),
  
  openReserveCapsSheet: () => set({ 
    isReserveCapsSheetOpen: true,
    isCreatePlanModalOpen: false 
  }),
  closeReserveCapsSheet: () => set({ isReserveCapsSheetOpen: false }),
  
  openPaymentIntentSheet: () => set({ isPaymentIntentSheetOpen: true }),
  closePaymentIntentSheet: () => set({ isPaymentIntentSheetOpen: false }),
  
  openGuardrailDialog: () => set({ 
    isGuardrailDialogOpen: true,
    isPaymentIntentSheetOpen: false 
  }),
  closeGuardrailDialog: () => set({ isGuardrailDialogOpen: false }),
  
  setSelectedPlan: (plan) => set({ selectedPlan: plan }),
  setSelectedMerchant: (merchant) => set({ selectedMerchant: merchant }),
  setPaymentAmount: (amount) => set({ paymentAmount: amount }),
  setPaymentMode: (mode) => set({ paymentMode: mode }),
  setReservationMode: (mode) => set({ reservationMode: mode }),
  
  closeAllModals: () => set({
    isCreatePlanModalOpen: false,
    isReserveCapsSheetOpen: false,
    isPaymentIntentSheetOpen: false,
    isGuardrailDialogOpen: false,
  }),
}));
