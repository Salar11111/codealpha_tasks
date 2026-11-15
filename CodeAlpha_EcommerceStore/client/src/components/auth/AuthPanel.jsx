import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/button';
import Input from '../ui/input';

const base = {
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
};

const loginSchema = z.object(base);
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name'),
  email: base.email,
  password: z.string().min(6, 'Use at least 6 characters'),
});

export default function AuthPanel({ mode = 'login', onModeChange, onSuccess, compact = false }) {
  const isLogin = mode === 'login';
  const { login, register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register: field,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const switchMode = onModeChange || (() => {});

  async function submit(values) {
    setFormError('');
    try {
      const user = isLogin
        ? await login(values.email, values.password)
        : await registerUser(values.name, values.email, values.password);
      toast.success(isLogin ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Your account is ready.');
      onSuccess?.(user);
    } catch (error) {
      setFormError(error.message || 'Something went wrong.');
    }
  }

  function useDemo() {
    setValue('email', 'demo@codealpha.dev', { shouldValidate: true });
    setValue('password', 'password123', { shouldValidate: true });
  }

  return (
    <div className={compact ? '' : 'w-full'}>
      <p className="eyebrow">Atelier &amp; Oak</p>
      <h2 className={`mt-3 font-serif leading-[1.05] ${compact ? 'text-3xl' : 'text-4xl sm:text-[2.9rem]'}`}>
        {isLogin ? 'Welcome back.' : 'Join the atelier.'}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
        {isLogin
          ? 'Sign in to keep your cart, saved pieces and order history in one place.'
          : 'Create an account to keep your cart across devices, save pieces and follow your orders.'}
      </p>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        {!isLogin && (
          <div>
            <label className="label" htmlFor="auth-name">
              Full name
            </label>
            <Input
              id="auth-name"
              autoComplete="name"
              placeholder="Alex Morgan"
              {...field('name')}
            />
            {errors.name && <p className="mt-1.5 text-xs text-brand">{errors.name.message}</p>}
          </div>
        )}

        <div>
          <label className="label" htmlFor="auth-email">
            Email
          </label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...field('email')}
          />
          {errors.email && <p className="mt-1.5 text-xs text-brand">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="auth-password">
            Password
          </label>
          <div className="relative">
            <Input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              className="pr-11"
              {...field('password')}
            />
            <button
              type="button"
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-ink"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-brand">{errors.password.message}</p>
          )}
        </div>

        {formError && (
          <p className="border border-brand/25 bg-brand/5 px-3 py-2 text-xs text-brand-dark" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLogin ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <div className="mt-6 border border-line bg-paper/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Demo accounts</p>
          <button
            type="button"
            onClick={useDemo}
            className="text-[11px] font-medium underline decoration-line underline-offset-4 transition-colors hover:text-brand hover:decoration-brand"
          >
            Fill details
          </button>
        </div>
        <dl className="mt-2 space-y-1 text-xs text-muted">
          <div className="flex justify-between gap-4">
            <dt>Customer</dt>
            <dd className="text-ink">demo@codealpha.dev</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Admin</dt>
            <dd className="text-ink">admin@codealpha.dev</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Password</dt>
            <dd className="text-ink">password123</dd>
          </div>
        </dl>
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        {isLogin ? 'New to Atelier & Oak?' : 'Already have an account?'}{' '}
        {onModeChange ? (
          <button
            type="button"
            className="font-medium text-ink underline decoration-line underline-offset-4 hover:text-brand"
            onClick={() => {
              setFormError('');
              switchMode(isLogin ? 'register' : 'login');
            }}
          >
            {isLogin ? 'Create an account' : 'Sign in'}
          </button>
        ) : (
          <Link
            to={isLogin ? '/register' : '/login'}
            className="font-medium text-ink underline decoration-line underline-offset-4 hover:text-brand"
          >
            {isLogin ? 'Create an account' : 'Sign in'}
          </Link>
        )}
      </p>
    </div>
  );
}
