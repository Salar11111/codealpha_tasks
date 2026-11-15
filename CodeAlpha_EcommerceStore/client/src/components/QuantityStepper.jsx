import { cn } from '../lib/utils';

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  className,
  disabled = false,
}) {
  const clamp = (next) => Math.max(min, Math.min(max, next));
  return (
    <div className={cn('inline-flex h-10 items-center border border-line bg-surface', className)}>
      <button
        type="button"
        className="flex h-full w-9 items-center justify-center text-lg leading-none text-muted transition-colors hover:text-ink disabled:opacity-30"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-8 text-center text-[13px] tabular-nums">{value}</span>
      <button
        type="button"
        className="flex h-full w-9 items-center justify-center text-lg leading-none text-muted transition-colors hover:text-ink disabled:opacity-30"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
