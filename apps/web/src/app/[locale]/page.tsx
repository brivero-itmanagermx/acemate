import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-green-50">
      <div className="text-center space-y-6 p-8">
        <div className="flex items-center justify-center gap-3">
          <span className="text-6xl">🎾</span>
          <h1 className="text-6xl font-bold text-green-800">{t('title')}</h1>
        </div>
        <p className="text-2xl font-medium text-green-700">{t('tagline')}</p>
        <p className="text-lg text-gray-600 max-w-md">{t('description')}</p>
        <button className="bg-green-700 hover:bg-green-800 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
          {t('getStarted')}
        </button>
      </div>
    </main>
  );
}
