import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  ar: {
    // Navigation
    home: 'الرئيسية',
    explore: 'استكشف',
    services: 'الخدمات',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    dashboard: 'لوحة التحكم',
    logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    
    // Common
    search: 'بحث',
    filter: 'تصفية',
    sort: 'ترتيب',
    category: 'الفئة',
    date: 'التاريخ',
    time: 'الوقت',
    location: 'الموقع',
    price: 'السعر',
    rating: 'التقييم',
    reviews: 'المراجعات',
    book: 'احجز',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    save: 'حفظ',
    edit: 'تعديل',
    delete: 'حذف',
    view: 'عرض',
    share: 'مشاركة',
    favorite: 'مفضل',
    
    // Events
    events: 'الفعاليات',
    createEvent: 'إنشاء فعالية',
    eventDetails: 'تفاصيل الفعالية',
    upcomingEvents: 'الفعاليات القادمة',
    pastEvents: 'الفعاليات السابقة',
    featuredEvents: 'الفعاليات المميزة',
    eventType: 'نوع الفعالية',
    eventDuration: 'مدة الفعالية',
    eventCapacity: 'سعة الفعالية',
    
    // Services
    createService: 'إنشاء خدمة',
    serviceDetails: 'تفاصيل الخدمة',
    serviceProvider: 'مقدم الخدمة',
    serviceType: 'نوع الخدمة',
    
    // User Types
    attendee: 'حاضر',
    organizer: 'منظم',
    provider: 'مقدم خدمة',
    admin: 'مدير',
    
    // Forms
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    phone: 'الهاتف',
    address: 'العنوان',
    city: 'المدينة',
    description: 'الوصف',
    
    // Search & Filters
    searchPlaceholder: 'ابحث عن الفعاليات والخدمات...',
    advancedSearch: 'البحث المتقدم',
    searchResults: 'نتائج البحث',
    noResults: 'لا توجد نتائج',
    suggestions: 'اقتراحات',
    recentSearches: 'عمليات البحث الأخيرة',
    
    // Reviews & Ratings
    writeReview: 'اكتب مراجعة',
    basedOnReviews: 'بناءً على المراجعات',
    wouldRecommend: 'ينصح بها',
    recommends: 'ينصح',
    doesNotRecommend: 'لا ينصح',
    helpful: 'مفيد',
    notHelpful: 'غير مفيد',
    reviewSubmitted: 'تم إرسال المراجعة',
    
    // Notifications
    notifications: 'الإشعارات',
    markAllRead: 'تحديد الكل كمقروء',
    newNotification: 'إشعار جديد',
    notificationSettings: 'إعدادات الإشعارات',
    
    // File Upload
    uploadFiles: 'رفع الملفات',
    dragDropFiles: 'اسحب وأفلت الملفات هنا',
    selectFiles: 'اختر الملفات',
    takePhoto: 'التقط صورة',
    maxFileSize: 'أقصى حجم للملف',
    maxFiles: 'أقصى عدد للملفات',
    supportedFormats: 'الصيغ المدعومة',
    fileTypeNotAllowed: 'نوع الملف غير مسموح',
    fileTooLarge: 'الملف كبير جداً',
    tooManyFiles: 'عدد كبير من الملفات',
    maxFilesAllowed: 'أقصى عدد مسموح للملفات',
    
    // Maps & Location
    mapView: 'عرض الخريطة',
    nearbyEvents: 'الفعاليات القريبة',
    getDirections: 'الحصول على الاتجاهات',
    
    // QR Scanner
    scanQR: 'مسح رمز QR',
    scanTicket: 'مسح التذكرة',
    validTicket: 'تذكرة صالحة',
    invalidTicket: 'تذكرة غير صالحة',
    attendanceMarked: 'تم تسجيل الحضور',
    
    // Wallet & Points
    wallet: 'المحفظة',
    points: 'النقاط',
    balance: 'الرصيد',
    transaction: 'المعاملة',
    transactionHistory: 'تاريخ المعاملات',
    earnPoints: 'اكسب نقاط',
    redeemPoints: 'استخدم النقاط',
    
    // Chat
    chat: 'الدردشة',
    sendMessage: 'إرسال رسالة',
    typing: 'يكتب...',
    online: 'متصل',
    offline: 'غير متصل',
  },
  en: {
    // Navigation
    home: 'Home',
    explore: 'Explore',
    services: 'Services',
    profile: 'Profile',
    settings: 'Settings',
    dashboard: 'Dashboard',
    logout: 'Logout',
    login: 'Login',
    signup: 'Sign Up',
    
    // Common
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    category: 'Category',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    price: 'Price',
    rating: 'Rating',
    reviews: 'Reviews',
    book: 'Book',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    share: 'Share',
    favorite: 'Favorite',
    
    // Events
    events: 'Events',
    createEvent: 'Create Event',
    eventDetails: 'Event Details',
    upcomingEvents: 'Upcoming Events',
    pastEvents: 'Past Events',
    featuredEvents: 'Featured Events',
    eventType: 'Event Type',
    eventDuration: 'Event Duration',
    eventCapacity: 'Event Capacity',
    
    // Services
    createService: 'Create Service',
    serviceDetails: 'Service Details',
    serviceProvider: 'Service Provider',
    serviceType: 'Service Type',
    
    // User Types
    attendee: 'Attendee',
    organizer: 'Organizer',
    provider: 'Provider',
    admin: 'Admin',
    
    // Forms
    name: 'Name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    phone: 'Phone',
    address: 'Address',
    city: 'City',
    description: 'Description',
    
    // Search & Filters
    searchPlaceholder: 'Search for events and services...',
    advancedSearch: 'Advanced Search',
    searchResults: 'Search Results',
    noResults: 'No Results',
    suggestions: 'Suggestions',
    recentSearches: 'Recent Searches',
    
    // Reviews & Ratings
    writeReview: 'Write Review',
    basedOnReviews: 'Based on Reviews',
    wouldRecommend: 'Would Recommend',
    recommends: 'Recommends',
    doesNotRecommend: 'Does Not Recommend',
    helpful: 'Helpful',
    notHelpful: 'Not Helpful',
    reviewSubmitted: 'Review Submitted',
    
    // Notifications
    notifications: 'Notifications',
    markAllRead: 'Mark All Read',
    newNotification: 'New Notification',
    notificationSettings: 'Notification Settings',
    
    // File Upload
    uploadFiles: 'Upload Files',
    dragDropFiles: 'Drag and drop files here',
    selectFiles: 'Select Files',
    takePhoto: 'Take Photo',
    maxFileSize: 'Max File Size',
    maxFiles: 'Max Files',
    supportedFormats: 'Supported Formats',
    fileTypeNotAllowed: 'File type not allowed',
    fileTooLarge: 'File too large',
    tooManyFiles: 'Too many files',
    maxFilesAllowed: 'Max files allowed',
    
    // Maps & Location
    mapView: 'Map View',
    nearbyEvents: 'Nearby Events',
    getDirections: 'Get Directions',
    
    // QR Scanner
    scanQR: 'Scan QR',
    scanTicket: 'Scan Ticket',
    validTicket: 'Valid Ticket',
    invalidTicket: 'Invalid Ticket',
    attendanceMarked: 'Attendance Marked',
    
    // Wallet & Points
    wallet: 'Wallet',
    points: 'Points',
    balance: 'Balance',
    transaction: 'Transaction',
    transactionHistory: 'Transaction History',
    earnPoints: 'Earn Points',
    redeemPoints: 'Redeem Points',
    
    // Chat
    chat: 'Chat',
    sendMessage: 'Send Message',
    typing: 'Typing...',
    online: 'Online',
    offline: 'Offline',
  }
};

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as 'ar' | 'en';
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    // Update document direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const handleSetLanguage = (lang: 'ar' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['ar']] || key;
  };

  const value = {
    language,
    setLanguage: handleSetLanguage,
    t,
    isRTL: language === 'ar'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};