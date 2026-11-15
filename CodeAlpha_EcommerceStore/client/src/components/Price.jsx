import { money } from '../lib/utils';

export default function Price({ value, compareAt, className = '', size = 'base' }) {
  const onSale = Number(compareAt) > Number(value);
  const sizes = {
    sm: 'text-[13px]',
    base: 'text-sm',
    lg: 'text-lg',
    xl: 'text-2xl',
  };
  return (
    <span className={`inline-flex items-baseline gap-2 ${sizes[size] || sizes.base} ${className}`}>
      <span className={onSale ? 'text-brand' : ''}>{money(value)}</span>
      {onSale && <s className="text-xs text-muted">{money(compareAt)}</s>}
    </span>
  );
}
