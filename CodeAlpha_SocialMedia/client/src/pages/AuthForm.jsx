import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthForm({ mode }) {
  const isLogin = mode === 'login';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth">
      <div className="auth-intro">
        <p className="brand">Lumen</p>
        <h1>{isLogin ? 'Come back to the feed.' : 'Claim a username.'}</h1>
        <p className="muted">Posts, comments, likes, and follows stay with your account.</p>
        {isLogin && <p className="hint">Demo: demo@codealpha.dev / password123</p>}
      </div>
      <form className="card auth-form" onSubmit={onSubmit}>
        {!isLogin && (
          <>
            <label>
              Name
              <input name="name" value={form.name} onChange={update} required />
            </label>
            <label>
              Username
              <input name="username" value={form.username} onChange={update} required pattern="[A-Za-z0-9_]{3,20}" />
            </label>
          </>
        )}
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={update} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={update}
            minLength={6}
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>
        <p>
          {isLogin ? (
            <>
              New here? <Link to="/register">Join Lumen</Link>
            </>
          ) : (
            <>
              Already joined? <Link to="/login">Log in</Link>
            </>
          )}
        </p>
      </form>
    </section>
  );
}
