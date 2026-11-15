import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('field', className)} {...props} />;
});

export default Input;
