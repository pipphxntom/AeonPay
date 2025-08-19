import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  'en-IN': {
    common: {
      loading: 'Loading...',
      error: 'Something went wrong',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      retry: 'Retry',
      share: 'Share',
      copy: 'Copy',
      copied: 'Copied!',
      amount: 'Amount',
      balance: 'Balance',
      total: 'Total',
      remaining: 'Remaining',
      expires: 'Expires',
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      completed: 'Completed',
      failed: 'Failed',
      success: 'Success'
    },
    navigation: {
      home: 'Home',
      pay: 'Pay',
      plans: 'Plans',
      swap: 'Swap',
      me: 'Me'
    },
    home: {
      welcome: 'Welcome to AeonPay',
      quickActions: 'Quick Actions',
      recentActivity: 'Recent Activity',
      createPlan: 'Create Plan',
      scanPay: 'Scan & Pay',
      viewPlans: 'View Plans'
    },
    plans: {
      title: 'Your Plans',
      createNew: 'Create New Plan',
      members: '{{count}} member',
      members_plural: '{{count}} members',
      budget: 'Budget',
      remaining: 'Remaining',
      expired: 'Expired',
      noPlans: 'No plans yet',
      createFirst: 'Create your first spending plan'
    },
    payment: {
      scanQR: 'Scan QR Code',
      enterAmount: 'Enter Amount',
      selectPaymentMode: 'Select Payment Mode',
      voucher: 'Voucher',
      mandate: 'Mandate',
      splitLater: 'Split Later',
      processing: 'Processing Payment...',
      success: 'Payment Successful',
      failed: 'Payment Failed',
      insufficientBalance: 'Insufficient Balance'
    },
    guardrail: {
      title: 'Spending Check',
      overspendWarning: 'This payment will exceed your plan limit',
      suggestion: 'Consider adjusting your plan or payment amount',
      continueAnyway: 'Continue Anyway',
      adjustAmount: 'Adjust Amount',
      topUpPlan: 'Top-up Plan'
    },
    coach: {
      greeting: 'Hi there! How can I help you today?',
      planSuggestion: 'I can help you create a spending plan',
      budgetAdvice: 'Here are some budget suggestions',
      merchantRecommendation: 'I recommend these merchants for your plan'
    },
    swap: {
      title: 'Currency Swap',
      cashToUPI: 'Cash → UPI',
      upiToCash: 'UPI → Cash',
      findPeers: 'Find Peers',
      createRequest: 'Create Request',
      scanToComplete: 'Scan to Complete',
      trustScore: 'Trust Score',
      swapCompleted: 'Swap Completed!',
      ratePartner: 'Rate your swap partner'
    },
    referrals: {
      title: 'Invite Friends',
      yourCode: 'Your Referral Code',
      shareMessage: 'Join me on AeonPay for smart campus payments!',
      inviteViaWhatsApp: 'Invite via WhatsApp',
      copyCode: 'Copy Code',
      campusKarma: 'Campus Karma',
      level: 'Level',
      points: 'Points',
      totalReferrals: 'Total Referrals'
    },
    currency: {
      format: '₹ {{amount}}',
      rupees: 'Rupees'
    }
  },
  'hi-IN': {
    common: {
      loading: 'लोड हो रहा है...',
      error: 'कुछ गलत हुआ',
      save: 'सेव करें',
      cancel: 'रद्द करें',
      confirm: 'पुष्टि करें',
      back: 'वापस',
      next: 'आगे',
      done: 'हो गया',
      retry: 'दोबारा करें',
      share: 'शेयर करें',
      copy: 'कॉपी करें',
      copied: 'कॉपी हो गया!',
      amount: 'राशि',
      balance: 'बैलेंस',
      total: 'कुल',
      remaining: 'बाकी',
      expires: 'समाप्त होता है',
      active: 'सक्रिय',
      inactive: 'निष्क्रिय',
      pending: 'प्रतीक्षारत',
      completed: 'पूरा',
      failed: 'असफल',
      success: 'सफल'
    },
    navigation: {
      home: 'होम',
      pay: 'पे',
      plans: 'प्लान्स',
      swap: 'स्वैप',
      me: 'मैं'
    },
    home: {
      welcome: 'AeonPay में आपका स्वागत है',
      quickActions: 'त्वरित कार्य',
      recentActivity: 'हाल की गतिविधि',
      createPlan: 'प्लान बनाएं',
      scanPay: 'स्कैन और पे',
      viewPlans: 'प्लान देखें'
    },
    plans: {
      title: 'आपके प्लान्स',
      createNew: 'नया प्लान बनाएं',
      members: '{{count}} सदस्य',
      members_plural: '{{count}} सदस्य',
      budget: 'बजट',
      remaining: 'बाकी',
      expired: 'समाप्त',
      noPlans: 'अभी तक कोई प्लान नहीं',
      createFirst: 'अपना पहला खर्च प्लान बनाएं'
    },
    payment: {
      scanQR: 'QR कोड स्कैन करें',
      enterAmount: 'राशि दर्ज करें',
      selectPaymentMode: 'भुगतान मोड चुनें',
      voucher: 'वाउचर',
      mandate: 'मेंडेट',
      splitLater: 'बाद में बांटें',
      processing: 'भुगतान प्रोसेस हो रहा है...',
      success: 'भुगतान सफल',
      failed: 'भुगतान असफल',
      insufficientBalance: 'अपर्याप्त बैलेंस'
    },
    guardrail: {
      title: 'खर्च जांच',
      overspendWarning: 'यह भुगतान आपकी प्लान सीमा से अधिक होगा',
      suggestion: 'अपने प्लान या भुगतान राशि को समायोजित करने पर विचार करें',
      continueAnyway: 'फिर भी जारी रखें',
      adjustAmount: 'राशि समायोजित करें',
      topUpPlan: 'प्लान टॉप-अप करें'
    },
    coach: {
      greeting: 'नमस्ते! आज मैं आपकी कैसे मदद कर सकता हूं?',
      planSuggestion: 'मैं आपको खर्च प्लान बनाने में मदद कर सकता हूं',
      budgetAdvice: 'यहां कुछ बजट सुझाव हैं',
      merchantRecommendation: 'मैं आपके प्लान के लिए इन मर्चेंट्स की सिफारिश करता हूं'
    },
    swap: {
      title: 'करेंसी स्वैप',
      cashToUPI: 'कैश → UPI',
      upiToCash: 'UPI → कैश',
      findPeers: 'साथी खोजें',
      createRequest: 'रिक्वेस्ट बनाएं',
      scanToComplete: 'पूरा करने के लिए स्कैन करें',
      trustScore: 'ट्रस्ट स्कोर',
      swapCompleted: 'स्वैप पूरा!',
      ratePartner: 'अपने स्वैप पार्टनर को रेट करें'
    },
    referrals: {
      title: 'दोस्तों को आमंत्रित करें',
      yourCode: 'आपका रेफरल कोड',
      shareMessage: 'स्मार्ट कैंपस भुगतान के लिए AeonPay पर मेरे साथ जुड़ें!',
      inviteViaWhatsApp: 'WhatsApp के जरिए आमंत्रित करें',
      copyCode: 'कोड कॉपी करें',
      campusKarma: 'कैंपस कर्मा',
      level: 'स्तर',
      points: 'अंक',
      totalReferrals: 'कुल रेफरल'
    },
    currency: {
      format: '₹ {{amount}}',
      rupees: 'रुपये'
    }
  },
  'hiHinglish': {
    common: {
      loading: 'Loading ho raha hai...',
      error: 'Kuch galat hua',
      save: 'Save karo',
      cancel: 'Cancel karo',
      confirm: 'Confirm karo',
      back: 'Wapas',
      next: 'Aage',
      done: 'Ho gaya',
      retry: 'Dobara try karo',
      share: 'Share karo',
      copy: 'Copy karo',
      copied: 'Copy ho gaya!',
      amount: 'Amount',
      balance: 'Balance',
      total: 'Total',
      remaining: 'Baaki',
      expires: 'Expire hota hai',
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      completed: 'Complete',
      failed: 'Fail',
      success: 'Success'
    },
    navigation: {
      home: 'Home',
      pay: 'Pay',
      plans: 'Plans',
      swap: 'Swap',
      me: 'Me'
    },
    home: {
      welcome: 'AeonPay mein welcome!',
      quickActions: 'Quick Actions',
      recentActivity: 'Recent Activity',
      createPlan: 'Plan banao',
      scanPay: 'Scan & Pay',
      viewPlans: 'Plans dekho'
    },
    plans: {
      title: 'Tumhare Plans',
      createNew: 'Naya Plan banao',
      members: '{{count}} member',
      members_plural: '{{count}} members',
      budget: 'Budget',
      remaining: 'Baaki',
      expired: 'Expire ho gaya',
      noPlans: 'Abhi tak koi plans nahi',
      createFirst: 'Apna pehla spending plan banao'
    },
    payment: {
      scanQR: 'QR Code scan karo',
      enterAmount: 'Amount daalo',
      selectPaymentMode: 'Payment mode choose karo',
      voucher: 'Voucher',
      mandate: 'Mandate',
      splitLater: 'Baad mein split karo',
      processing: 'Payment process ho raha hai...',
      success: 'Payment successful!',
      failed: 'Payment fail ho gaya',
      insufficientBalance: 'Balance kam hai'
    },
    guardrail: {
      title: 'Spending Check',
      overspendWarning: 'Yeh payment tumhari plan limit se zyada hai',
      suggestion: 'Plan ya amount adjust karne ka socho',
      continueAnyway: 'Phir bhi continue karo',
      adjustAmount: 'Amount adjust karo',
      topUpPlan: 'Plan top-up karo'
    },
    coach: {
      greeting: 'Hey! Aaj main tumhari kaise help kar sakta hun?',
      planSuggestion: 'Main tumhe spending plan banane mein help kar sakta hun',
      budgetAdvice: 'Yahan kuch budget suggestions hain',
      merchantRecommendation: 'Main tumhare plan ke liye ye merchants recommend karta hun'
    },
    swap: {
      title: 'Currency Swap',
      cashToUPI: 'Cash → UPI',
      upiToCash: 'UPI → Cash',
      findPeers: 'Peers dhundo',
      createRequest: 'Request banao',
      scanToComplete: 'Complete karne ke liye scan karo',
      trustScore: 'Trust Score',
      swapCompleted: 'Swap complete!',
      ratePartner: 'Apne swap partner ko rate karo'
    },
    referrals: {
      title: 'Friends ko invite karo',
      yourCode: 'Tumhara Referral Code',
      shareMessage: 'Smart campus payments ke liye AeonPay pe mere saath join karo!',
      inviteViaWhatsApp: 'WhatsApp se invite karo',
      copyCode: 'Code copy karo',
      campusKarma: 'Campus Karma',
      level: 'Level',
      points: 'Points',
      totalReferrals: 'Total Referrals'
    },
    currency: {
      format: '₹ {{amount}}',
      rupees: 'Rupees'
    }
  }
};

// Custom number formatting for Indian locale
const formatCurrency = (amount: number, locale: string): string => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  // Remove the INR symbol and add non-breaking space with ₹
  return `₹\u00A0${formatter.format(amount).replace('₹', '').replace(/^[^0-9]*/, '')}`;
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'hiHinglish', // Default to Hinglish for Gen-Z
    debug: import.meta.env.DEV,
    
    interpolation: {
      escapeValue: false,
      format: (value, format, lng) => {
        if (format === 'currency') {
          return formatCurrency(value, lng || 'en-IN');
        }
        return value;
      }
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'aeonpay-language'
    },
    
    // Custom pluralization for Hindi/Hinglish
    pluralSeparator: '_',
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'navigation', 'home', 'plans', 'payment', 'guardrail', 'coach', 'swap', 'referrals'],
    
    // React specific options
    react: {
      useSuspense: false // Disable suspense for now
    }
  });

// Helper functions for language management
export const supportedLanguages = [
  { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'hiHinglish', name: 'Hinglish', flag: '💬' }
];

export const getCurrentLanguage = () => {
  return i18n.language || 'hiHinglish';
};

export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('aeonpay-language', lng);
};

export const formatAmount = (amount: number, locale?: string) => {
  return formatCurrency(amount, locale || getCurrentLanguage());
};

export { formatCurrency };
export default i18n;