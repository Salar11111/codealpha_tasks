import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,color,border-color,box-shadow] duration-200 ease-out disabled:pointer-events-none disabled:opacity-45 active:scale-95 active:bg-surface/50',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper',
        brand: 'bg-brand text-surface',
        outline: 'border border-ink/25 text-ink',
        light: 'border border-line bg-surface text-ink',
        ghost: 'text-ink',
        link: 'h-auto px-0 text-ink underline decoration-line underline-offset-4',
        danger: 'border border-brand/30 text-brand',
        branded: 'bg-brand/10 text-brand border border-brand',
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
