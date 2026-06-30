interface Props {
  current: number;
  labels:  [string, string, string];
}

export default function StepIndicator({ current, labels }: Props) {
  return (
    <div className="border-b border-am-border px-8 pb-6 pt-8">
      <div className="flex items-start">
        {labels.map((label, i) => {
          const step   = i + 1;
          const done   = step < current;
          const active = step === current;
          const isLast = step === labels.length;

          return (
            <div key={step} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  done   ? 'bg-ace-green text-[#1a1a1a]' :
                  active ? 'bg-ace-green/20 text-ace-green ring-2 ring-ace-green' :
                           'bg-white/8 text-white/30'
                }`}>
                  {done ? '✓' : step}
                </div>
                <span className={`mt-1.5 whitespace-nowrap text-xs font-medium ${
                  done || active ? 'text-ace-green' : 'text-white/30'
                }`}>
                  {label}
                </span>
              </div>

              {!isLast && (
                <div className={`mx-3 mt-4 h-0.5 flex-1 transition-colors ${
                  done ? 'bg-ace-green' : 'bg-white/10'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
