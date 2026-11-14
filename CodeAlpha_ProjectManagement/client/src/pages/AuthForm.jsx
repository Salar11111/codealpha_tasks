import { Link, Navigate, useNavigate } from 'react-router-dom';
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
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const schema = isLogin ? loginSchema : registerSchema;
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', password: '' } });

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(values) {
    if (isLogin) await login(values.email, values.password);
    else await register(values.name, values.email, values.password);
    navigate('/');
  }

  return (
    <section className="auth">
      <div>
        <p className="eyebrow">Keel</p>
        <h1>{isLogin ? 'Open your boards.' : 'Start a shared board.'}</h1>
        <p className="muted">Projects, assigned cards, comments, and live updates.</p>
        {isLogin && (
          <p className="hint">
            Demo: demo@codealpha.dev / password123
            <br />
            Teammate: avery@codealpha.dev / password123
          </p>
        )}
      </div>
      <form className="panel" onSubmit={handleSubmit(onSubmit)}>
        {!isLogin && (
          <label>
            Name
            <input {...field('name')} required />
            {errors.name && <span className="error">{errors.name.message}</span>}
          </label>
        )}
        <label>
          Email
          <input type="email" autoComplete="email" {...field('email')} required />
          {errors.email && <span className="error">{errors.email.message}</span>}
        </label>
        <label>
          Password
          <input
            type="password"
            minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            {...field('password')}
            required
          />
          {errors.password && <span className="error">{errors.password.message}</span>}
        </label>
        {errors.root && <p className="error" aria-live="polite">{errors.root.message}</p>}
        <button className="btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>
        <p>
          {isLogin ? (
            <>
              New here? <Link to="/register">Create an account</Link>
            </>
          ) : (
            <>
              Already have a board? <Link to="/login">Log in</Link>
            </>
          )}
        </p>
      </form>
    </section>
  );
}