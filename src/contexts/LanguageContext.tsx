import { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '../types';
import { translations, T } from '../i18n/translations';

interface LangCtx { language: Language; setLanguage: (l: Language) => void; t: T; }
const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>(() =>
    (localStorage.getItem('smm_lang') as Language) || 'ru'
  );
  function setLanguage(l: Language) { setLang(l); localStorage.setItem('smm_lang', l); }
  return (
    <Ctx.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLanguage() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLanguage must be used within LanguageProvider');
  return c;
}
