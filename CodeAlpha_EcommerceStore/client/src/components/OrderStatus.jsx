import { cn, statusMeta } from '../lib/utils';

export default function OrderStatus({ status, className }) {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]',
        meta.tone,
        className
      )}
    >
      {meta.label}
    </span>
  );
}
