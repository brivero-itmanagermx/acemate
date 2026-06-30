import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import en from '../locales/en.json';
import es from '../locales/es.json';

const i18n = new I18n({ en, es });

i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Pick device locale, fall back to English
const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
i18n.locale = ['en', 'es'].includes(deviceLocale) ? deviceLocale : 'en';

export default i18n;
