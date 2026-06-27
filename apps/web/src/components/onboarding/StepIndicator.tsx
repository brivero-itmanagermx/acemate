interface Props {
  current: number;
  labels: [string, string, string];
}

export default function StepIndicator({ current, labels }: Props) {
  return (
    <div className="px-8 pt-8 pb-6 border-b border-gray-100">
      <div className="flex items-start">
        {labels.map((label, i) => {
          const step = i + 1;
          const done   = step < current;
          const active = step === current;
          const isLast = step === labels.length;

          return (
            <div key={step} className="flex items-start flex-1 last:flex-none">
              {/* Circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    done || active
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {done ? '✓' : step}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                    done || active ? 'text-green-700' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* Connector line between circles */}
              {!isLast && (
                <div
                  className={`h-0.5 flex-1 mx-3 mt-4 transition-colors ${
                    done ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
