import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Spinner({ className, label = 'Loading' }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-muted', className)} role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}
