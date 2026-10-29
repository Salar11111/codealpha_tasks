import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { money } from '../utils';

export default function Checkout() {
  const { user, setUser } = useAuth();
  const { cart, clearLocal } = useCart();
  const navigate = useNavigate();
  const items = (cart.items || []).filter((item) => item.product);
  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const [form, setForm] = useState({
    fullName: user?.savedAddress?.fullName || '',
    line1: user?.savedAddress?.line1 || '',
    city: user?.savedAddress?.city || '',
    postalCode: user?.savedAddress?.postalCode || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = user?.savedAddress;
    if (!saved?.line1) return;
    setForm((current) => (current.line1 ? current : { ...saved }));
  }, [user]);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/orders', { method: 'POST', body: JSON.stringify(form) });
      if (data.user) setUser(data.user);
      clearLocal();
      navigate('/orders', { state: { placed: data.order._id } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="narrow">
        <div className="empty-panel">
          <p className="eyebrow">Checkout</p>
          <h1>Nothing to ship yet.</h1>
          <Link to="/" className="btn btn-citrus">
            Return to the shop
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="split">
      <form className="panel" onSubmit={onSubmit}>
        <p className="eyebrow tone-magenta">Shipping</p>
        <h1>Where should it go?</h1>
        <label>
          Full name
          <input name="fullName" value={form.fullName} onChange={update} required />
        </label>
        <label>
          Street address
          <input name="line1" value={form.line1} onChange={update} required />
        </label>
        <div className="two">
          <label>
            City
            <input name="city" value={form.city} onChange={update} required />
          </label>
          <label>
            Postal code
            <input name="postalCode" value={form.postalCode} onChange={update} required />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Placing order…' : `Place order · ${money(total)}`}
        </button>
      </form>
      <aside className="panel summary">
        <h2>Order</h2>
        <ul>
          {items.map((item) => (
            <li key={item.product._id}>
              <span>
                {item.product.name} × {item.qty}
              </span>
              <span>{money(item.product.price * item.qty)}</span>
            </li>
          ))}
        </ul>
        <p className="total-line">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </p>
        <p className="hint">This records the order and reduces stock. No card is charged.</p>
      </aside>
    </section>
  );
}
