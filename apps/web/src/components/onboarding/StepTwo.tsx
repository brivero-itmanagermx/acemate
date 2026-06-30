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
  data:     StepTwoData;
  onChange: (fields: Partial<StepTwoData>) => void;
  onNext:   () => void;
  onBack:   () => void;
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
        <h2 className="text-xl font-bold text-white">{t('title')}</h2>
        <p className="mt-1 text-sm text-white/50">{t('subtitle')}</p>
      </div>

      {/* Skill level */}
      <div>
        <p className="mb-3 text-sm font-medium text-white/60">{t('levelLabel')}</p>
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
                    ? 'border-ace-green bg-ace-green/10'
                    : 'border-am-border bg-am-card hover:border-ace-green/40 hover:bg-ace-green/5'
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <div>
                  <div className={`text-sm font-semibold ${active ? 'text-ace-green' : 'text-white'}`}>
                    {t(id as Level)}
                  </div>
                  <div className="text-xs text-white/40">{t(descKey as Level)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dominant hand */}
      <div>
        <p className="mb-3 text-sm font-medium text-white/60">{t('handLabel')}</p>
        <div className="flex gap-3">
          {(['left', 'right'] as Hand[]).map(hand => {
            const active = data.dominantHand === hand;
            return (
              <button
                key={hand}
                type="button"
                onClick={() => onChange({ dominantHand: hand })}
                className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                  active
                    ? 'border-ace-green bg-ace-green/10 text-ace-green'
                    : 'border-am-border bg-am-card text-white/60 hover:border-ace-green/40'
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
        <p className="mb-3 text-sm font-medium text-white/60">{t('surfaceLabel')}</p>
        <div className="grid grid-cols-4 gap-2">
          {SURFACES.map(({ id, emoji, labelKey }) => {
            const active = data.preferredSurface === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ preferredSurface: id })}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-medium transition-all ${
                  active
                    ? 'border-ace-green bg-ace-green/10 text-ace-green'
                    : 'border-am-border bg-am-card text-white/50 hover:border-ace-green/40'
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
          className="rounded-lg border border-am-border px-6 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
        >
          {tb('back')}
        </button>
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="rounded-lg bg-ace-green px-6 py-2.5 text-sm font-bold text-[#1a1a1a] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {tb('next')}
        </button>
      </div>
    </div>
  );
}
