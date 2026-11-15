import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Logo({ className, onClick, compact = false }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={cn('inline-flex items-center gap-2.5 leading-none', className)}
      aria-label="Atelier & Oak home"
    >
      <span className="flex h-8 w-8 items-center justify-center bg-ink text-[13px] font-medium text-paper">
        A
      </span>
      <span className={cn('font-serif tracking-[-0.01em]', compact ? 'text-lg' : 'text-[22px] sm:text-[25px]')}>
        Atelier <span className="text-brand">&amp;</span> Oak
      </span>
    </Link>
  );
}
