import { useState, useEffect, useCallback } from 'react';
import { translations, languageNames } from './translations';
import type { Language, Translations } from './translations';

const LANGUAGE_KEY_PREFIX = 'app_language_';

// Get user ID from localStorage (set during login)
function getCurrentUserId(): string | null {
  try {
    const storeData = localStorage.getItem('stock-management-store');
    if (storeData) {
      const parsed = JSON.parse(storeData);
      return parsed?.state?.currentUser?.id || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Get the language key for the current user
function getLanguageKey(): string {
  const userId = getCurrentUserId();
  return userId ? `${LANGUAGE_KEY_PREFIX}${userId}` : `${LANGUAGE_KEY_PREFIX}default`;
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(() => {
    // Get language from user-specific localStorage or default to 'en'
    const key = getLanguageKey();
    const saved = localStorage.getItem(key);
    return (saved as Language) || 'en';
  });

  const [t, setT] = useState<Translations>(translations[language]);

  // Re-check language when user changes (e.g., after login)
  useEffect(() => {
    const key = getLanguageKey();
    const saved = localStorage.getItem(key);
    if (saved && saved !== language) {
      setLanguageState(saved as Language);
    }
  }, []);

  useEffect(() => {
    setT(translations[language]);
    // Save to user-specific key
    const key = getLanguageKey();
    localStorage.setItem(key, language);

    // Set document direction for RTL languages if needed
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    // Also save immediately to ensure persistence
    const key = getLanguageKey();
    localStorage.setItem(key, lang);
  }, []);

  const getLanguageName = useCallback((lang: Language) => {
    return languageNames[lang];
  }, []);

  return {
    language,
    setLanguage,
    t,
    languageNames,
    getLanguageName,
    availableLanguages: Object.keys(translations) as Language[],
  };
}

// Export functions for use outside React components
export function getTranslations(): Translations {
  const key = getLanguageKey();
  const currentLanguage = (localStorage.getItem(key) as Language) || 'en';
  return translations[currentLanguage];
}

export function getCurrentLanguage(): Language {
  const key = getLanguageKey();
  return (localStorage.getItem(key) as Language) || 'en';
}

export function setGlobalLanguage(lang: Language) {
  const key = getLanguageKey();
  localStorage.setItem(key, lang);
}
