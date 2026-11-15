import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Loader2, Lock, ShieldCheck, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api/client';
import AuthPanel from '../components/auth/AuthPanel';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Select from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { money } from '../lib/utils';

const EMPTY = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'United States',
};

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France'];

export default function Checkout() {
  const { user, setUser } = useAuth();
  const { items, summary, refreshCart } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = user?.savedAddress;
    if (!saved) return;
    setForm((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(saved)) {
        if (value) next[key] = value;
      }
      if (!next.fullName && user?.name) next.fullName = user.name;
      return next;
    });
  }, [user?.id]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function placeOrder(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/orders', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      await refreshCart();
      toast.success(`Order ${data.order.orderNumber} placed.`);
      navigate(`/orders/${data.order._id}`, { state: { justPlaced: true }, replace: true });
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="container-page py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1 className="mt-3 text-[2.6rem] leading-[1.02] sm:text-[3.4rem]">
              One step before the workshop.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              Sign in to keep your bag, save the address for next time, and follow the order from
              paid to delivered. Everything in your bag comes with you.
            </p>
            <ul className="mt-6 space-y-2.5 text-[12.5px] text-muted">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-ink" strokeWidth={1.5} />
                Demo checkout — no card is charged.
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-ink" strokeWidth={1.5} />
                Address saved to your account, never shared.
              </li>
            </ul>
            {items.length > 0 && (
              <div className="mt-8 border-t border-line pt-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  {summary.itemCount} {summary.itemCount === 1 ? 'piece' : 'pieces'} waiting
                </p>
                <p className="mt-1 font-serif text-2xl">{money(summary.total)}</p>
                <Link
                  to="/cart"
                  className="mt-2 inline-block text-[11px] underline decoration-line underline-offset-4 hover:text-brand"
                >
                  Review your bag
                </Link>
              </div>
            )}
          </div>
          <div className="border border-line bg-surface p-6 sm:p-8">
            <AuthPanel compact />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-20">
        <div className="mx-auto max-w-lg border border-line bg-surface px-6 py-14 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-muted" strokeWidth={1.3} />
          <h1 className="mt-5 text-3xl">Your bag is empty.</h1>
          <p className="mt-2 text-sm text-muted">Add a piece before checking out.</p>
          <Link to="/shop" className="mt-6 inline-block">
            <Button>Back to the collection</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1 className="mt-2 text-[2.4rem] leading-none sm:text-[3rem]">Almost there.</h1>
        </div>
        <Link
          to="/cart"
          className="border-b border-ink/25 pb-1 text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-brand hover:text-brand"
        >
          Edit bag
        </Link>
      </div>

      {error && (
        <p className="mt-6 border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={placeOrder} className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
        <div>
          <section>
            <div className="flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="text-xl">Shipping address</h2>
              <span className="text-[11px] text-muted">Signed in as {user.email}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="fullName">
                  Full name
                </label>
                <Input
                  id="fullName"
                  required
                  value={form.fullName}
                  onChange={(event) => update('fullName', event.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  Phone <span className="normal-case tracking-normal text-muted/60">(optional)</span>
                </label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="label" htmlFor="country">
                  Country
                </label>
                <Select
                  id="country"
                  value={form.country}
                  onChange={(event) => update('country', event.target.value)}
                >
                  {COUNTRIES.map((country) => (
                    <option key={country}>{country}</option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="line1">
                  Street address
                </label>
                <Input
                  id="line1"
                  required
                  value={form.line1}
                  onChange={(event) => update('line1', event.target.value)}
                  autoComplete="address-line1"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="line2">
                  Apartment, suite, etc. <span className="normal-case tracking-normal text-muted/60">(optional)</span>
                </label>
                <Input
                  id="line2"
                  value={form.line2}
                  onChange={(event) => update('line2', event.target.value)}
                  autoComplete="address-line2"
                />
              </div>
              <div>
                <label className="label" htmlFor="city">
                  City
                </label>
                <Input
                  id="city"
                  required
                  value={form.city}
                  onChange={(event) => update('city', event.target.value)}
                  autoComplete="address-level2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="state">
                    State
                  </label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(event) => update('state', event.target.value)}
                    autoComplete="address-level1"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="postalCode">
                    Postal code
                  </label>
                  <Input
                    id="postalCode"
                    required
                    value={form.postalCode}
                    onChange={(event) => update('postalCode', event.target.value)}
                    autoComplete="postal-code"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <div className="border-b border-line pb-3">
              <h2 className="text-xl">Payment</h2>
            </div>
            <div className="mt-5 border border-ink/20 bg-paper/50 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-ink">
                  <span className="h-2 w-2 rounded-full bg-ink" />
                </span>
                <div>
                  <p className="text-[13px] font-medium">Demo payment</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">
                    This is a portfolio build. No card details are collected and no money moves —
                    the order is recorded as paid so the full flow can be followed.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
              <Lock className="h-3.5 w-3.5" />
              Prices, shipping and tax are calculated and verified on the server.
            </p>
          </section>
        </div>

        <aside>
          <div className="border border-line bg-surface p-6 lg:sticky lg:top-[118px]">
            <h2 className="text-xl">Your order</h2>
            <ul className="mt-4 divide-y divide-line">
              {items.map((line) => (
                <li key={line.key} className="flex gap-3 py-3.5">
                  <div className="relative h-[76px] w-[60px] shrink-0 overflow-hidden bg-paper-deep">
                    <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                    <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center bg-ink px-1 text-[9px] text-paper">
                      {line.qty}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{line.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {line.color} · {line.size}
                    </p>
                  </div>
                  <span className="text-[12.5px]">{money(line.price * line.qty)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{money(summary.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd>{summary.shipping === 0 ? 'Free' : money(summary.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Tax</dt>
                <dd>{money(summary.tax)}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm font-medium">Total</span>
              <span className="font-serif text-2xl">{money(summary.total)}</span>
            </div>

            <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Place order · {money(summary.total)}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
              By placing the order you agree to the demo terms. Stock is decremented atomically.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
