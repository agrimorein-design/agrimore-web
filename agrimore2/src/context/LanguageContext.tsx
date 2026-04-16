import React, { createContext, useState, useContext } from 'react';

type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    welcome: 'Welcome to Agrimore',
    home: 'Home',
    cart: 'Cart',
    profile: 'Profile',
    orders: 'Orders',
    delivery_in: 'Delivery in',
    search_placeholder: 'Search "Fresh Vegetables"',
    nearby_fresh_items: 'Nearby Fresh Items',
    checkout: 'Checkout',
  },
  ta: {
    welcome: 'அக்ரிமோருக்கு வரவேற்கிறோம்',
    home: 'முகப்பு',
    cart: 'கூடை',
    profile: 'சுயவிவரம்',
    orders: 'ஆர்டர்கள்',
    delivery_in: 'டெலிவரி ஆகும் நேரம்',
    search_placeholder: '"புதிய காய்கறிகளை" தேடுங்கள்',
    nearby_fresh_items: 'அருகிலுள்ள புதிய பொருட்கள்',
    checkout: 'செக் அவுட்',
  }
};

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return (translations[language] as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
