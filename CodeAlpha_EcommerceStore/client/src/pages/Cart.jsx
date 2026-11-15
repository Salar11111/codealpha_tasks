import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { toast } from 'sonner';
import QuantityStepper from '../components/QuantityStepper';
import Button, { buttonVariants } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useAuthDialog } from '../context/AuthDialogContext';
import { useCart } from '../context/CartContext';
import { money } from '../lib/utils';

export default function Cart() {
  const { user } = useAuth();
  const { openAuth } = useAuthDialog();
  const { items, summary, setQty, removeItem, count } = useCart();
  const [busyKey, setBusyKey] = useState('');

  async function change(line, qty) {
    setBusyKey(line.key);
    try {
      await setQty(line, qty);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyKey('');
    }
  }

  async function remove(line) {
    setBusyKey(line.key);
    try {
      await removeItem(line);
      toast.success('Removed from your bag.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyKey('');
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-20">
        <div className="mx-auto max-w-xl border border-line bg-surface px-6 py-16 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-line">
            <ShoppingBag className="h-6 w-6 text-muted" strokeWidth={1.4} />
          </span>
          <p className="eyebrow mt-6">Your bag</p>
          <h1 className="mt-3 text-4xl">Nothing in the bag yet.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Start with a signature pair or browse the full collection. Everything is made in small
            batches.
          </p>
          <Link to="/shop" className={buttonVariants({ size: 'lg' }) + ' mt-7'}>
            Browse the collection
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your bag</p>
          <h1 className="mt-2 text-[2.4rem] leading-none sm:text-[3rem]">Ready when you are.</h1>
          <p className="mt-3 text-sm text-muted">
            {count} {count === 1 ? 'piece' : 'pieces'} · stock is held at checkout only
          </p>
        </div>
        <Link
          to="/shop"
          className="border-b border-ink/25 pb-1 text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-brand hover:text-brand"
        >
          Continue shopping
        </Link>
      </div>

      <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
        <div>
          <div className="hidden border-b border-line pb-3 text-[10px] uppercase tracking-[0.2em] text-muted sm:grid sm:grid-cols-[1fr_140px_110px]">
            <span>Piece</span>
            <span className="text-center">Quantity</span>
            <span className="text-right">Total</span>
          </div>

          <ul className="divide-y divide-line">
            {items.map((line) => (
              <li key={line.key} className="py-5">
                <div className="grid gap-4 sm:grid-cols-[1fr_140px_110px] sm:items-center">
                  <div className="flex gap-4">
                    <Link
                      to={`/products/${line.slug}`}
                      className="block h-[124px] w-[96px] shrink-0 overflow-hidden bg-paper-deep"
                    >
                      <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-col">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{line.brand}</p>
                      <Link
                        to={`/products/${line.slug}`}
                        className="mt-1 font-serif text-lg leading-tight hover:text-brand"
                      >
                        {line.name}
                      </Link>
                      <p className="mt-1.5 text-[12px] text-muted">
                        {line.color} · Size {line.size}
                      </p>
                      <p className="mt-1 text-[12px] text-muted">{money(line.price)} each</p>
                      <div className="mt-auto flex items-center gap-4 pt-3">
                        <button
                          type="button"
                          onClick={() => remove(line)}
                          disabled={busyKey === line.key}
                          className="text-[11px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-brand disabled:opacity-40"
                        >
                          Remove
                        </button>
                        {line.stock > 0 && line.stock <= 3 && (
                          <span className="text-[11px] text-brand">Only {line.stock} left</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sm:flex sm:justify-center">
                    <QuantityStepper
                      value={line.qty}
                      max={Math.max(1, line.stock)}
                      onChange={(qty) => change(line, qty)}
                      disabled={busyKey === line.key}
                    />
                  </div>

                  <div className="flex items-baseline justify-between sm:block sm:text-right">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted sm:hidden">
                      Line total
                    </span>
                    <span className="text-sm">{money(line.price * line.qty)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink" strokeWidth={1.4} />
              Free shipping over $75, otherwise $7.95 flat.
            </p>
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-ink" strokeWidth={1.4} />
              30-day returns on unworn pieces.
            </p>
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink" strokeWidth={1.4} />
              Demo checkout — no card is charged.
            </p>
          </div>
        </div>

        <aside>
          <div className="border border-line bg-surface p-6 lg:sticky lg:top-[118px]">
            <h2 className="text-xl">Order summary</h2>

            <div className="mt-4">
              <div className="flex items-baseline justify-between text-[11px] text-muted">
                <span>
                  {summary.freeShippingRemaining > 0
                    ? `${money(summary.freeShippingRemaining)} from free shipping`
                    : 'Free shipping unlocked'}
                </span>
                <span>{Math.min(100, Math.round((summary.subtotal / summary.freeShippingThreshold) * 100))}%</span>
              </div>
              <div className="mt-2 h-[3px] w-full bg-line">
                <div
                  className="h-full bg-brand transition-[width] duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((summary.subtotal / summary.freeShippingThreshold) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <dl className="mt-5 space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{money(summary.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd>{summary.shipping === 0 ? 'Free' : money(summary.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Estimated tax</dt>
                <dd>{money(summary.tax)}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm font-medium">Total</span>
              <span className="font-serif text-2xl">{money(summary.total)}</span>
            </div>

            {user ? (
              <Link to="/checkout" className={buttonVariants({ size: 'lg' }) + ' mt-5 w-full'}>
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Button
                size="lg"
                className="mt-5 w-full"
                onClick={() => openAuth('login', '/checkout')}
              >
                Sign in to check out
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
              {user
                ? 'Shipping and tax are calculated on the server at checkout.'
                : 'Your bag is saved on this device and merged when you sign in.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
