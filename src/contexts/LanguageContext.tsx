import React, { createContext, useContext, useEffect } from 'react';
import { useLanguageState } from '@/hooks/useLanguage';

interface LanguageContextType {
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const languageState = useLanguageState();

  useEffect(() => {
    // Update document direction
    document.documentElement.dir = languageState.isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = languageState.language;
  }, [languageState.language, languageState.isRTL]);

  return (
    <LanguageContext.Provider value={languageState}>
      {children}
    </LanguageContext.Provider>
  );
};