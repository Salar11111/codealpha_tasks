import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1, 'Name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function AuthForm({ mode }) {
  const isLogin = mode === 'login';
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const schema = isLogin ? loginSchema : registerSchema;
  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', password: '' } });

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(values) {
    try {
      if (isLogin) await login(values.email, values.password);
      else await register(values.name, values.email, values.password);
      navigate('/');
    } catch (err) {
      setError('root', { message: err.message || 'Something went wrong. Try again.' });
    }
  }

  return (
    <section className="auth-layout">
      <div className="auth-poster">
        <p className="eyebrow">Northline account</p>
        <h1>{isLogin ? 'Welcome back.' : 'Open a shopper account.'}</h1>
        <p>Save a cart, place an order, and keep a record of what you bought.</p>
        {isLogin && <p className="demo-chip">demo@codealpha.dev · password123</p>}
      </div>
      <form className="panel" onSubmit={handleSubmit(onSubmit)}>
        {!isLogin && (
          <label>
            Name
            <input {...field('name')} />
            {errors.name && <span className="error">{errors.name.message}</span>}
          </label>
        )}
        <label>
          Email
          <Mail size={16} aria-hidden="true" /> <input type="email" autoComplete="email" {...field('email')} />
          {errors.email && <span className="error">{errors.email.message}</span>}
        </label>
        <label>
          Password
          <Eye size={16} aria-hidden="true" />
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            {...field('password')}
          />
          <EyeOff size={16} aria-hidden="true" onClick={() => setShowPassword(!showPassword)} />
          {errors.password && <span className="error">{errors.password.message}</span>}
        </label>
        {errors.root && <p className="error" aria-live="polite">{errors.root.message}</p>}
        <button className="btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>
        <p className="switch">
          {isLogin ? (
            <>
              New here? <Link to="/register">Create an account</Link>
            </>
          ) : (
            <>
              Already registered? <Link to="/login">Log in</Link>
            </>
          )}
        </p>
      </form>
    </section>
  );
}