import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhTW from './locales/zh-TW'
import en from './locales/en'

// Phase F (v2): i18n framework. zh-TW is the default; language persists in
// localStorage and is mirrored onto <html lang>.

export const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

const STORAGE_KEY = 'lang'

export function readLang(): LanguageCode {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'en' ? 'en' : 'zh-TW'
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': zhTW,
    en,
  },
  lng: readLang(),
  fallbackLng: 'zh-TW',
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React already escapes
})

document.documentElement.lang = readLang()

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export function setLanguage(code: LanguageCode) {
  localStorage.setItem(STORAGE_KEY, code)
  i18n.changeLanguage(code)
}

export default i18n
