import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './en';
import { hinglish } from './hinglish';

export type Language = 'en' | 'hinglish';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  tRandom: (keyPath: string, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'nsha_language';

const translations: Record<Language, any> = {
  en,
  hinglish,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved === 'en' || saved === 'hinglish') return saved;
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  };

  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    let text = getNestedValue(translations[language], keyPath);

    // Fallback to English if not found in current language
    if (text === undefined && language !== 'en') {
      text = getNestedValue(translations.en, keyPath);
    }

    if (text === undefined || typeof text !== 'string') {
      return keyPath;
    }

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }

    return text;
  };

  const tRandom = (keyPath: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(translations[language], keyPath);
    if (value === undefined && language !== 'en') {
      value = getNestedValue(translations.en, keyPath);
    }

    if (Array.isArray(value) && value.length > 0) {
      let text = value[Math.floor(Math.random() * value.length)];
      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }
      return text;
    }

    return t(keyPath, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tRandom }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
