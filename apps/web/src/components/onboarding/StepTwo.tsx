'use client';

import { useTranslations } from 'next-intl';

type Level   = 'beginner' | 'intermediate' | 'advanced' | 'competitive';
type Hand    = 'left' | 'right';
type Surface = 'clay' | 'hard' | 'grass' | 'indoor';

interface StepTwoData {
  level: string;
  dominantHand: string;
  preferredSurface: string;
}

interface Props {
  data: StepTwoData;
  onChange: (fields: Partial<StepTwoData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const LEVELS: { id: Level; emoji: string; descKey: string }[] = [
  { id: 'beginner',     emoji: '🌱', descKey: 'beginnerDesc'     },
  { id: 'intermediate', emoji: '🎾', descKey: 'intermediateDesc' },
  { id: 'advanced',     emoji: '⭐', descKey: 'advancedDesc'     },
  { id: 'competitive',  emoji: '🏆', descKey: 'competitiveDesc'  },
];

const SURFACES: { id: Surface; emoji: string; labelKey: string }[] = [
  { id: 'clay',   emoji: '🟤', labelKey: 'clay'   },
  { id: 'hard',   emoji: '🔵', labelKey: 'hard'   },
  { id: 'grass',  emoji: '🟢', labelKey: 'grass'  },
  { id: 'indoor', emoji: '🏠', labelKey: 'indoor' },
];

export default function StepTwo({ data, onChange, onNext, onBack }: Props) {
  const t  = useTranslations('onboarding.step2');
  const tb = useTranslations('onboarding.buttons');

  const canProceed = data.level.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">{t('title')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {/* Skill level */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">{t('levelLabel')}</p>
        <div className="grid grid-cols-2 gap-3">
          {LEVELS.map(({ id, emoji, descKey }) => {
            const active = data.level === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ level: id })}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                  active
                    ? 'border-green-600 bg-green-50 ring-1 ring-green-600'
                    : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <div>
                  <div className={`text-sm font-semibold ${active ? 'text-green-800' : 'text-gray-800'}`}>
                    {t(id as Level)}
                  </div>
                  <div className="text-xs text-gray-500">{t(descKey as Level)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dominant hand */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">{t('handLabel')}</p>
        <div className="flex gap-3">
          {(['left', 'right'] as Hand[]).map((hand) => {
            const active = data.dominantHand === hand;
            return (
              <button
                key={hand}
                type="button"
                onClick={() => onChange({ dominantHand: hand })}
                className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                  active
                    ? 'border-green-600 bg-green-50 text-green-800 ring-1 ring-green-600'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                {hand === 'left' ? '← ' : ''}{t(hand)}{hand === 'right' ? ' →' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferred surface */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">{t('surfaceLabel')}</p>
        <div className="grid grid-cols-4 gap-2">
          {SURFACES.map(({ id, emoji, labelKey }) => {
            const active = data.preferredSurface === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ preferredSurface: id })}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 px-2 text-xs font-medium transition-all ${
                  active
                    ? 'border-green-600 bg-green-50 text-green-800 ring-1 ring-green-600'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                <span className="text-xl">{emoji}</span>
                {t(labelKey as Surface)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          {tb('back')}
        </button>
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-300"
        >
          {tb('next')}
        </button>
      </div>
    </div>
  );
}
