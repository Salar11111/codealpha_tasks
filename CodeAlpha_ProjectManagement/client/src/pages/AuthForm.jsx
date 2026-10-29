import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthForm({ mode }) {
  const isLogin = mode === 'login';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      else await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
      <form className="panel" onSubmit={onSubmit}>
        {!isLogin && (
          <label>
            Name
            <input name="name" value={form.name} onChange={update} required />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={update} required />
        </label>
        <label>
          Password
          <input name="password" type="password" minLength={6} value={form.password} onChange={update} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
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
