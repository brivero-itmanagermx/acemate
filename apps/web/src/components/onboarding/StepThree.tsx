'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface LocationData {
  latitude:  number | null;
  longitude: number | null;
}

interface Props {
  saving:    boolean;
  onBack:    () => void;
  onFinish:  (location: LocationData) => void;
}

type GeoState = 'idle' | 'detecting' | 'detected' | 'denied' | 'error';

export default function StepThree({ saving, onBack, onFinish }: Props) {
  const t  = useTranslations('onboarding.step3');
  const tb = useTranslations('onboarding.buttons');

  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [location, setLocation] = useState<LocationData>({ latitude: null, longitude: null });

  function requestLocation() {
    if (!navigator.geolocation) { setGeoState('error'); return; }

    setGeoState('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude:  Math.round(pos.coords.latitude  * 1e6) / 1e6,
          longitude: Math.round(pos.coords.longitude * 1e6) / 1e6,
        });
        setGeoState('detected');
      },
      (err) => setGeoState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  const mapSrc = location.latitude !== null && location.longitude !== null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.015},${location.latitude - 0.015},${location.longitude + 0.015},${location.latitude + 0.015}&layer=mapnik&marker=${location.latitude},${location.longitude}`
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{t('title')}</h2>
        <p className="mt-1 text-sm text-white/50">{t('subtitle')}</p>
      </div>

      <p className="text-sm leading-relaxed text-white/60">{t('description')}</p>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/50">
        <span className="mt-0.5 shrink-0">🔒</span>
        <p>{t('privacyNotice')}</p>
      </div>

      {geoState !== 'detected' && (
        <button
          type="button"
          disabled={geoState === 'detecting'}
          onClick={requestLocation}
          className="flex items-center gap-2 rounded-xl border-2 border-ace-green/40 bg-ace-green/10 px-6 py-3 text-sm font-semibold text-ace-green transition-colors hover:border-ace-green hover:bg-ace-green/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-xl">📍</span>
          {geoState === 'detecting' ? t('detecting') : t('allowButton')}
        </button>
      )}

      {(geoState === 'denied' || geoState === 'error') && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          {geoState === 'denied' ? t('permissionDenied') : t('genericError')}
        </div>
      )}

      {geoState === 'detected' && location.latitude !== null && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-ace-green/30 bg-ace-green/10 px-4 py-3">
            <span className="text-lg font-bold text-ace-green">✓</span>
            <div>
              <p className="text-sm font-semibold text-ace-green">{t('detected')}</p>
              <p className="mt-0.5 font-mono text-xs text-white/40">
                {location.latitude.toFixed(5)}, {location.longitude!.toFixed(5)}
              </p>
            </div>
            <button type="button" onClick={requestLocation} className="ml-auto text-xs text-ace-green underline hover:no-underline">
              Retry
            </button>
          </div>
          {mapSrc && (
            <iframe src={mapSrc} width="100%" height="220" className="rounded-xl border border-am-border" loading="lazy" title="Location map" />
          )}
        </div>
      )}

      {geoState !== 'detected' && (
        <p className="flex items-start gap-2 text-xs text-white/30">
          <span className="mt-0.5">ℹ️</span>
          {t('noLocationWarning')}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-am-border px-6 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
        >
          {tb('back')}
        </button>

        <div className="flex items-center gap-3">
          {geoState !== 'detected' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onFinish({ latitude: null, longitude: null })}
              className="text-sm font-medium text-white/30 transition-colors hover:text-white/60"
            >
              {tb('skip')}
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => onFinish(location)}
            className="rounded-lg bg-ace-green px-6 py-2.5 text-sm font-bold text-[#1a1a1a] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? tb('finishing') : tb('finish')}
          </button>
        </div>
      </div>
    </div>
  );
}
