import React, { useState, useEffect, createContext, useContext } from 'react';

interface LanguageContextType {
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations = {
  ar: {
    // Navigation
    home: 'الرئيسية',
    explore: 'استكشاف',
    services: 'الخدمات',
    events: 'الفعاليات',
    groups: 'المجموعات',
    wallet: 'المحفظة',
    points: 'النقاط',
    notifications: 'الإشعارات',
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
    
    // Common
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    view: 'عرض',
    search: 'بحث',
    filter: 'فلتر',
    loading: 'جاري التحميل...',
    submit: 'إرسال',
    
    // Points & Loyalty
    loyaltyPoints: 'نقاط الولاء',
    currentPoints: 'النقاط الحالية',
    earnPoints: 'اكسب نقاط',
    redeemPoints: 'استبدل النقاط',
    pointsBalance: 'رصيد النقاط',
    
    // Notifications
    notifications_title: 'الإشعارات',
    emailNotifications: 'إشعارات الإيميل',
    smsNotifications: 'إشعارات الرسائل النصية',
    pushNotifications: 'الإشعارات المباشرة',
    
    // Reviews
    rating: 'التقييم',
    writeReview: 'اكتب مراجعة',
    reviews: 'المراجعات',
    rateEvent: 'قيم الفعالية',
    
    // Wallet
    balance: 'الرصيد',
    withdraw: 'سحب',
    transaction: 'معاملة',
    transactions: 'المعاملات',
    
    // Search
    searchEvents: 'البحث في الفعاليات',
    searchServices: 'البحث في الخدمات',
    advancedSearch: 'بحث متقدم',
    
    // Chat
    chat: 'الدردشة',
    sendMessage: 'إرسال رسالة',
    typing: 'يكتب...',
    online: 'متصل',
    offline: 'غير متصل',
    
    // Location
    location: 'الموقع',
    nearbyEvents: 'الفعاليات القريبة',
    mapView: 'عرض الخريطة',
  },
  en: {
    // Navigation
    home: 'Home',
    explore: 'Explore',
    services: 'Services',
    events: 'Events',
    groups: 'Groups',
    wallet: 'Wallet',
    points: 'Points',
    notifications: 'Notifications',
    settings: 'Settings',
    profile: 'Profile',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading...',
    submit: 'Submit',
    
    // Points & Loyalty
    loyaltyPoints: 'Loyalty Points',
    currentPoints: 'Current Points',
    earnPoints: 'Earn Points',
    redeemPoints: 'Redeem Points',
    pointsBalance: 'Points Balance',
    
    // Notifications
    notifications_title: 'Notifications',
    emailNotifications: 'Email Notifications',
    smsNotifications: 'SMS Notifications',
    pushNotifications: 'Push Notifications',
    
    // Reviews
    rating: 'Rating',
    writeReview: 'Write Review',
    reviews: 'Reviews',
    rateEvent: 'Rate Event',
    
    // Wallet
    balance: 'Balance',
    withdraw: 'Withdraw',
    transaction: 'Transaction',
    transactions: 'Transactions',
    
    // Search
    searchEvents: 'Search Events',
    searchServices: 'Search Services',
    advancedSearch: 'Advanced Search',
    
    // Chat
    chat: 'Chat',
    sendMessage: 'Send Message',
    typing: 'Typing...',
    online: 'Online',
    offline: 'Offline',
    
    // Location
    location: 'Location',
    nearbyEvents: 'Nearby Events',
    mapView: 'Map View',
  }
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const useLanguageState = () => {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as 'ar' | 'en';
    if (savedLang) {
      setLanguage(savedLang);
    }
    
    // Set document direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const handleSetLanguage = (lang: 'ar' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['ar']] || key;
  };

  return {
    language,
    setLanguage: handleSetLanguage,
    t,
    isRTL: language === 'ar'
  };
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const languageState = useLanguageState();
  
  return (
    <LanguageContext.Provider value={languageState}>
      {children}
    </LanguageContext.Provider>
  );
};