import { cn } from '../../lib/utils';

export default function Badge({ className, children, tone = 'light' }) {
  const tones = {
    light: 'border-line bg-surface text-ink-soft',
    ink: 'border-ink bg-ink text-paper',
    brand: 'border-brand bg-brand text-surface',
    muted: 'border-line bg-paper-deep text-muted',
    forest: 'border-forest/20 bg-forest/10 text-forest',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]',
        tones[tone] || tones.light,
        className
      )}
    >
      {children}
    </span>
  );
}
