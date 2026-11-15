import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-medium transition-[background-color,color,border-color,opacity] duration-200 disabled:pointer-events-none disabled:opacity-45 active:translate-y-px',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper hover:bg-brand',
        brand: 'bg-brand text-surface hover:bg-brand-dark',
        outline: 'border border-ink/25 text-ink hover:border-ink hover:bg-ink/[0.04]',
        light: 'border border-line bg-surface text-ink hover:border-ink',
        ghost: 'text-ink hover:bg-ink/[0.05]',
        link: 'h-auto px-0 text-ink underline decoration-line underline-offset-4 hover:text-brand hover:decoration-brand',
        danger: 'border border-brand/30 text-brand hover:bg-brand hover:text-surface',
      },
      size: {
        sm: 'h-9 px-4 text-[12.5px]',
        md: 'h-11 px-6',
        lg: 'h-[52px] px-8 text-[15px]',
        icon: 'h-10 w-10',
        none: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

const Button = forwardRef(function Button(
  { className, variant, size, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export default Button;
