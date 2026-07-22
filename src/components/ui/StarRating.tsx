/** Reusable 5-star rating component mapping to a 0–10 scale (each star = 2 pts). */
export function StarRating({
  value,
  onChange,
  size = '2xl',
  interactive = true,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'base' | 'xl' | '2xl';
  interactive?: boolean;
}) {
  const sizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  }[size];

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value >= star * 2;
        const half = !filled && value >= star * 2 - 1;
        return (
          <button
            key={star}
            type="button"
            onClick={() => {
              if (interactive && onChange) {
                onChange(value === star * 2 ? 0 : star * 2);
              }
            }}
            disabled={!interactive}
            className={`${sizeClass} transition-all ${
              interactive ? 'cursor-pointer' : 'cursor-default'
            } ${
              filled
                ? 'text-mood-joy drop-shadow-[0_0_8px_rgba(255,209,102,0.4)]'
                : half
                  ? 'text-mood-joy/50'
                  : 'text-white/15'
            } ${interactive ? 'hover:text-mood-joy/70' : ''}`}
          >
            {filled || half ? '★' : '☆'}
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-1.5 text-sm text-white/50">{value}/10</span>
      )}
    </div>
  );
}
