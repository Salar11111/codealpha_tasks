import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowRight, Minus, ShoppingBag, Truck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useCart } from '../context/CartContext';
import { money } from '../lib/utils';
import { buttonVariants } from './ui/button';
import QuantityStepper from './QuantityStepper';

export default function CartDrawer() {
  const { items, summary, count, drawerOpen, closeDrawer, setQty, removeItem } = useCart();
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');

  async function change(line, qty) {
    setError('');
    setBusyKey(line.key);
    try {
      await setQty(line, qty);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  }

  async function remove(line) {
    setError('');
    setBusyKey(line.key);
    try {
      await removeItem(line);
      toast.success('Removed from your bag.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  }

  const progress = Math.min(100, Math.round((summary.subtotal / summary.freeShippingThreshold) * 100));

  return (
    <DialogPrimitive.Root open={drawerOpen} onOpenChange={(open) => (open ? null : closeDrawer())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="drawer-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-surface shadow-soft">
          <DialogPrimitive.Title className="sr-only">Your bag</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Review the items in your shopping bag before checkout.
          </DialogPrimitive.Description>

          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="eyebrow">Your bag</p>
              <p className="mt-1 text-sm text-muted">
                {count === 0 ? 'Nothing here yet' : `${count} ${count === 1 ? 'piece' : 'pieces'}`}
              </p>
            </div>
            <DialogPrimitive.Close
              className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-ink"
              aria-label="Close bag"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {items.length > 0 && (
            <div className="border-b border-line px-5 py-4">
              <p className="flex items-center gap-2 text-xs text-muted">
                <Truck className="h-3.5 w-3.5 text-ink" />
                {summary.freeShippingRemaining > 0
                  ? `${money(summary.freeShippingRemaining)} away from complimentary shipping.`
                  : 'Complimentary shipping unlocked.'}
              </p>
              <div className="mt-2.5 h-[3px] w-full bg-line">
                <div
                  className="h-full bg-brand transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-line">
                  <ShoppingBag className="h-6 w-6 text-muted" strokeWidth={1.4} />
                </span>
                <h3 className="mt-5 text-2xl">Your bag is empty.</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Start with the pieces we make most often, or browse the full collection.
                </p>
                <Link
                  to="/shop"
                  onClick={closeDrawer}
                  className={buttonVariants({ variant: 'primary', size: 'md' }) + ' mt-6'}
                >
                  Browse the collection
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((line) => (
                  <li key={line.key} className="flex gap-4 px-5 py-5">
                    <Link
                      to={`/products/${line.slug}`}
                      onClick={closeDrawer}
                      className="block h-[104px] w-20 shrink-0 overflow-hidden bg-paper-deep"
                    >
                      <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{line.brand}</p>
                          <Link
                            to={`/products/${line.slug}`}
                            onClick={closeDrawer}
                            className="mt-0.5 block truncate text-[13.5px] font-medium hover:text-brand"
                          >
                            {line.name}
                          </Link>
                          <p className="mt-1 text-xs text-muted">
                            {line.color} · {line.size}
                          </p>
                        </div>
                        <span className="shrink-0 text-[13px]">{money(line.price * line.qty)}</span>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-3">
                        <QuantityStepper
                          value={line.qty}
                          max={Math.max(1, line.stock)}
                          onChange={(qty) => change(line, qty)}
                          disabled={busyKey === line.key}
                          className="h-9"
                        />
                        <button
                          type="button"
                          onClick={() => remove(line)}
                          disabled={busyKey === line.key}
                          className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-brand disabled:opacity-40"
                        >
                          <Minus className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p className="border-t border-brand/20 bg-brand/5 px-5 py-2 text-xs text-brand" role="alert">
              {error}
            </p>
          )}

          {items.length > 0 && (
            <div className="border-t border-line bg-paper/50 px-5 py-5">
              <div className="flex items-baseline justify-between text-sm">
                <span>Subtotal</span>
                <span className="text-base">{money(summary.subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Shipping and tax calculated at checkout.</p>
              <Link
                to="/checkout"
                onClick={closeDrawer}
                className={buttonVariants({ variant: 'primary', size: 'lg' }) + ' mt-4 w-full'}
              >
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/cart"
                onClick={closeDrawer}
                className="mt-3 block text-center text-[12px] underline decoration-line underline-offset-4 transition-colors hover:text-brand"
              >
                View bag
              </Link>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
