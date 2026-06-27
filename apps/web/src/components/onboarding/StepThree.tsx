'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  saving: boolean;
  onBack: () => void;
  onFinish: (location: LocationData) => void;
}

type GeoState = 'idle' | 'detecting' | 'detected' | 'denied' | 'error';

export default function StepThree({ saving, onBack, onFinish }: Props) {
  const t  = useTranslations('onboarding.step3');
  const tb = useTranslations('onboarding.buttons');

  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [location, setLocation] = useState<LocationData>({ latitude: null, longitude: null });

  function requestLocation() {
    if (!navigator.geolocation) {
      setGeoState('error');
      return;
    }

    setGeoState('detecting');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude:  Math.round(pos.coords.latitude  * 1e6) / 1e6,
          longitude: Math.round(pos.coords.longitude * 1e6) / 1e6,
        };
        setLocation(coords);
        setGeoState('detected');
      },
      (err) => {
        setGeoState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  const mapSrc = location.latitude !== null && location.longitude !== null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.015},${location.latitude - 0.015},${location.longitude + 0.015},${location.latitude + 0.015}&layer=mapnik&marker=${location.latitude},${location.longitude}`
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">{t('title')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed">{t('description')}</p>

      {/* Privacy notice — always shown */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <span className="mt-0.5 shrink-0">🔒</span>
        <p>{t('privacyNotice')}</p>
      </div>

      {/* Detect location button */}
      {geoState !== 'detected' && (
        <button
          type="button"
          disabled={geoState === 'detecting'}
          onClick={requestLocation}
          className="flex items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-6 py-3 text-sm font-semibold text-green-800 transition-colors hover:border-green-400 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-xl">📍</span>
          {geoState === 'detecting' ? t('detecting') : t('allowButton')}
        </button>
      )}

      {/* Error / denied feedback */}
      {(geoState === 'denied' || geoState === 'error') && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {geoState === 'denied' ? t('permissionDenied') : t('genericError')}
        </div>
      )}

      {/* Detected state — coordinates + OSM map */}
      {geoState === 'detected' && location.latitude !== null && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <span className="text-green-600 font-bold text-lg">✓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">{t('detected')}</p>
              <p className="text-xs text-green-700 font-mono mt-0.5">
                {location.latitude.toFixed(5)}, {location.longitude!.toFixed(5)}
              </p>
            </div>
            <button
              type="button"
              onClick={requestLocation}
              className="ml-auto text-xs text-green-700 underline hover:no-underline"
            >
              Retry
            </button>
          </div>

          {mapSrc && (
            <iframe
              src={mapSrc}
              width="100%"
              height="220"
              className="rounded-xl border border-gray-200"
              loading="lazy"
              title="Location map"
            />
          )}
        </div>
      )}

      {/* No-location warning shown while idle or after error */}
      {geoState !== 'detected' && (
        <p className="flex items-start gap-2 text-xs text-gray-500">
          <span className="mt-0.5">ℹ️</span>
          {t('noLocationWarning')}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          {tb('back')}
        </button>

        <div className="flex items-center gap-3">
          {/* Skip only shown when location not yet detected */}
          {geoState !== 'detected' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onFinish({ latitude: null, longitude: null })}
              className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              {tb('skip')}
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => onFinish(location)}
            className="rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-400"
          >
            {saving ? tb('finishing') : tb('finish')}
          </button>
        </div>
      </div>
    </div>
  );
}
