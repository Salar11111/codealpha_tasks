import { useState } from 'react';
import { Heart, Plus, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAuthDialog } from '../context/AuthDialogContext';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import Price from './Price';

export default function ProductCard({ product, className, imageClassName }) {
  const { user, refresh } = useAuth();
  const { openAuth } = useAuthDialog();
  const { addItem, openDrawer } = useCart();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const images = product.images?.length ? product.images : [product.image].filter(Boolean);
  const secondary = images[1];
  const variants = product.variants || [];
  const inStock = variants.filter((variant) => variant.stock > 0);
  const firstAvailable = inStock[0];
  const soldOut = product.totalStock === 0 || inStock.length === 0;
  const saved = (user?.wishlist || []).includes(product._id);
  const onSale = Number(product.compareAtPrice) > Number(product.price);
  const rating = product.rating || { average: 0, count: 0 };

  async function toggleSave() {
    if (!user) {
      openAuth('login');
      return;
    }
    setSaving(true);
    try {
      const data = await api(`/wishlist/${product._id}`, { method: 'POST' });
      await refresh();
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success(data.saved ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function quickAdd(event) {
    event.preventDefault();
    if (!firstAvailable) return;
    setAdding(true);
    try {
      await addItem({ product, variant: firstAvailable, qty: 1 });
      toast.success(`Added ${product.name} to your bag.`);
      openDrawer();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative overflow-hidden bg-paper-deep">
        <Link
          to={`/products/${product.slug}`}
          className={cn('block aspect-[4/5] overflow-hidden', imageClassName)}
          aria-label={`View ${product.name}`}
        >
          <img
            src={images[0]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045]"
          />
          {secondary && (
            <img
              src={secondary}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {onSale && (
            <span className="bg-brand px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-surface">
              Sale
            </span>
          )}
          {product.featured && !onSale && (
            <span className="bg-surface/95 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink backdrop-blur">
              Atelier pick
            </span>
          )}
          {soldOut && (
            <span className="bg-ink px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-paper">
              Sold out
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSave}
          disabled={saving}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/85 text-ink backdrop-blur transition-colors hover:bg-surface disabled:opacity-50"
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
          aria-pressed={saved}
        >
          <Heart className={cn('h-4 w-4', saved && 'fill-brand text-brand')} />
        </button>

        <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100">
          <button
            type="button"
            onClick={quickAdd}
            disabled={soldOut || adding}
            className="flex h-10 w-full items-center justify-center gap-2 bg-surface/95 text-[11px] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:bg-surface/70 disabled:text-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            {soldOut ? 'Sold out' : firstAvailable ? 'Quick add' : 'Unavailable'}
          </button>
        </div>
      </div>

      <div className="mt-3.5 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{product.brand}</p>
            <h3 className="mt-1 truncate font-sans text-[14px] font-medium leading-snug">
              <Link to={`/products/${product.slug}`} className="hover:text-brand">
                {product.name}
              </Link>
            </h3>
          </div>
          <Price value={product.price} compareAt={product.compareAtPrice} className="shrink-0 pt-4" />
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {(product.colors || []).slice(0, 4).map((color) => (
                <span
                  key={color.name}
                  className="h-3 w-3 rounded-full border border-ink/15"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
            {rating.count > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                <Star className="h-3 w-3 fill-ink text-ink" />
                {rating.average.toFixed(1)}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted">{product.sizes?.length || 0} sizes</span>
        </div>
      </div>
    </article>
  );
}
