import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronRight,
  Heart,
  Loader2,
  RotateCcw,
  Star,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Price from '../components/Price';
import QuantityStepper from '../components/QuantityStepper';
import Button from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useAuthDialog } from '../context/AuthDialogContext';
import { useCart } from '../context/CartContext';
import { cn, formatDate, money } from '../lib/utils';

function Stars({ value = 0, className = 'h-3.5 w-3.5' }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(className, index < Math.round(value) ? 'fill-ink text-ink' : 'text-line')}
        />
      ))}
    </span>
  );
}

function Accordion({ title, children, defaultOpen = false, id }) {
  return (
    <details id={id} className="group scroll-mt-24 border-b border-line" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[12px] font-medium uppercase tracking-[0.14em] marker:hidden">
        {title}
        <span className="text-lg leading-none text-muted transition-transform duration-300 group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="pb-4 text-[13px] leading-relaxed text-muted">{children}</div>
    </details>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const { user, refresh } = useAuth();
  const { openAuth } = useAuthDialog();
  const { addItem, openDrawer } = useCart();

  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notified, setNotified] = useState(false);

  const productQuery = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api(`/products/${slug}`),
  });

  const product = productQuery.data?.product;
  const related = productQuery.data?.related || [];
  const productId = product?._id;

  const reviewsQuery = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => api(`/reviews/product/${productId}`),
    enabled: Boolean(productId),
  });

  useEffect(() => {
    if (!product) return;
    const first = product.variants?.find((variant) => variant.stock > 0) || product.variants?.[0];
    setColor(first?.color || '');
    setSize(first?.size || '');
    setQty(1);
    setImageIndex(0);
    setNotified(false);
    setNotifyEmail('');
  }, [product?._id]);

  useEffect(() => {
    if (!product) return undefined;
    const previous = document.title;
    document.title = `${product.name} — Atelier & Oak`;
    return () => {
      document.title = previous;
    };
  }, [product?.name]);

  if (productQuery.isLoading) {
    return (
      <div className="container-page py-12">
        <div className="grid animate-pulse gap-10 lg:grid-cols-2">
          <div className="aspect-[4/5] bg-paper-deep" />
          <div className="space-y-4">
            <div className="h-3 w-24 bg-paper-deep" />
            <div className="h-10 w-2/3 bg-paper-deep" />
            <div className="h-4 w-1/3 bg-paper-deep" />
            <div className="h-24 w-full bg-paper-deep" />
          </div>
        </div>
      </div>
    );
  }

  if (productQuery.error || !product) {
    return (
      <div className="container-page py-20 text-center">
        <p className="eyebrow">Not found</p>
        <h1 className="mt-3 text-4xl">This piece has moved on.</h1>
        <p className="mt-3 text-sm text-muted">It may have sold out or been retired from the collection.</p>
        <Link to="/shop" className="mt-6 inline-block">
          <Button>Back to the collection</Button>
        </Link>
      </div>
    );
  }

  const variants = product.variants || [];
  const colors = product.colors || [];
  const variantsForColor = variants.filter((variant) => variant.color === color);
  const selected = variantsForColor.find((variant) => variant.size === size) || null;
  const sizes = product.sizes || [];
  const availableSizes = new Set(
    variantsForColor.filter((variant) => variant.stock > 0).map((variant) => variant.size)
  );
  const saved = (user?.wishlist || []).includes(product._id);
  const reviews = reviewsQuery.data?.reviews || [];
  const images = product.images?.length ? product.images : [product.image].filter(Boolean);

  function chooseColor(nextColor) {
    setColor(nextColor);
    const matching = variants.filter((variant) => variant.color === nextColor);
    const firstAvailable = matching.find((variant) => variant.stock > 0) || matching[0];
    setSize(firstAvailable?.size || '');
    setQty(1);
  }

  async function addToBag() {
    if (!selected) {
      toast.error('Select a size first.');
      return;
    }
    if (selected.stock < 1) return;
    setAdding(true);
    try {
      await addItem({ product, variant: selected, qty });
      toast.success(`Added ${product.name} to your bag.`);
      openDrawer();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAdding(false);
    }
  }

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

  async function notify(event) {
    event.preventDefault();
    try {
      await api('/auth/restock-notifications', {
        method: 'POST',
        body: JSON.stringify({
          productId: product._id,
          email: notifyEmail || user?.email,
          variantId: selected?._id,
        }),
      });
      setNotified(true);
      toast.success('We will email you when it is back.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div>
      <div className="container-page py-5">
        <nav className="flex flex-wrap items-center gap-2 text-[11px] text-muted" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-ink">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/shop" className="hover:text-ink">
            Shop
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-ink">
            {product.category}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink">{product.name}</span>
        </nav>
      </div>

      <section className="container-page pb-16">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <div className="flex gap-2 overflow-x-auto sm:w-[78px] sm:flex-col sm:overflow-visible no-scrollbar">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  className={cn(
                    'h-[86px] w-[68px] shrink-0 overflow-hidden border bg-paper-deep transition-colors sm:h-[98px] sm:w-full',
                    index === imageIndex ? 'border-ink' : 'border-transparent hover:border-line'
                  )}
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={index === imageIndex}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="relative flex-1 overflow-hidden bg-paper-deep">
              <img
                src={images[imageIndex] || images[0]}
                alt={product.name}
                className="aspect-[4/5] h-full w-full object-cover"
              />
              {Number(product.compareAtPrice) > Number(product.price) && (
                <span className="absolute left-4 top-4 bg-brand px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-surface">
                  Sale
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="lg:sticky lg:top-[118px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">{product.brand}</p>
              <h1 className="mt-2 text-[2.2rem] leading-[1.02] sm:text-[2.9rem]">{product.name}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <a href="#reviews" className="inline-flex items-center gap-2 text-[12px] text-muted hover:text-ink">
                  <Stars value={product.rating?.average || 0} />
                  <span>
                    {product.rating?.average?.toFixed(1) || '0.0'} · {product.rating?.count || 0} reviews
                  </span>
                </a>
                <span className="text-[11px] text-muted">
                  {product.totalStock > 0 ? `${product.totalStock} in stock` : 'Sold out'}
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-3">
                <Price value={product.price} compareAt={product.compareAtPrice} size="xl" />
                {Number(product.compareAtPrice) > Number(product.price) && (
                  <span className="text-[11px] uppercase tracking-[0.12em] text-brand">
                    Save {money(product.compareAtPrice - product.price)}
                  </span>
                )}
              </div>

              <p className="mt-5 max-w-lg text-[13.5px] leading-relaxed text-muted">{product.description}</p>

              {colors.length > 0 && (
                <div className="mt-7">
                  <div className="flex items-baseline justify-between">
                    <p className="label mb-0">Colour</p>
                    <p className="text-[12px] text-ink">{color}</p>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    {colors.map((entry) => (
                      <button
                        key={entry.name}
                        type="button"
                        onClick={() => chooseColor(entry.name)}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border transition-all',
                          color === entry.name
                            ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-paper'
                            : 'border-ink/15 hover:border-ink/50'
                        )}
                        style={{ backgroundColor: entry.hex }}
                        aria-label={entry.name}
                        aria-pressed={color === entry.name}
                        title={entry.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <div className="flex items-baseline justify-between">
                  <p className="label mb-0">Size</p>
                  <a href="#sizing" className="text-[11px] text-muted underline decoration-line underline-offset-4 hover:text-ink">
                    Size guide
                  </a>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {sizes.map((entry) => {
                    const isAvailable = availableSizes.has(entry);
                    return (
                      <button
                        key={entry}
                        type="button"
                        onClick={() => setSize(entry)}
                        disabled={!isAvailable}
                        className={cn(
                          'relative flex h-10 items-center justify-center border text-[12px] transition-colors',
                          size === entry
                            ? 'border-ink bg-ink text-paper'
                            : 'border-line bg-surface text-ink hover:border-ink',
                          !isAvailable &&
                            'cursor-not-allowed border-line/60 bg-paper-deep/40 text-muted/50 line-through hover:border-line/60'
                        )}
                        aria-pressed={size === entry}
                      >
                        {entry}
                      </button>
                    );
                  })}
                </div>
                {selected && selected.stock > 0 && selected.stock <= 3 && (
                  <p className="mt-2 text-[11px] text-brand">Only {selected.stock} left in this size.</p>
                )}
                {!selected && (
                  <p className="mt-2 text-[11px] text-muted">Select a size to add this piece.</p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <QuantityStepper
                  value={qty}
                  onChange={setQty}
                  max={Math.max(1, selected?.stock || 1)}
                  className="h-[52px] w-full justify-between sm:w-[128px]"
                />
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={addToBag}
                  disabled={!selected || selected.stock < 1 || adding}
                >
                  {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                  {selected && selected.stock < 1 ? 'Sold out in this size' : 'Add to bag'}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-[52px] w-[52px] shrink-0"
                  onClick={toggleSave}
                  disabled={saving}
                  aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                  aria-pressed={saved}
                >
                  <Heart className={cn('h-4 w-4', saved && 'fill-brand text-brand')} />
                </Button>
              </div>

              {selected && selected.stock < 1 && (
                <div className="mt-4 border border-line bg-surface p-4">
                  {notified ? (
                    <p className="flex items-center gap-2 text-[12.5px] text-ink">
                      <Check className="h-4 w-4 text-brand" />
                      You are on the list for this size.
                    </p>
                  ) : (
                    <form onSubmit={notify} className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        required
                        value={notifyEmail}
                        onChange={(event) => setNotifyEmail(event.target.value)}
                        placeholder={user?.email || 'Email address'}
                        aria-label="Email for restock notice"
                        className="h-10 w-full border border-line bg-surface px-3 text-xs outline-none focus:border-ink"
                      />
                      <Button type="submit" variant="light" size="sm" className="shrink-0">
                        Notify me
                      </Button>
                    </form>
                  )}
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3 border-y border-line py-4">
                <p className="flex items-center gap-2 text-[11.5px] text-muted">
                  <Truck className="h-4 w-4 text-ink" strokeWidth={1.4} />
                  Free shipping over $75
                </p>
                <p className="flex items-center gap-2 text-[11.5px] text-muted">
                  <RotateCcw className="h-4 w-4 text-ink" strokeWidth={1.4} />
                  30-day returns
                </p>
              </div>

              <div className="mt-2">
                <Accordion title="Details" defaultOpen>
                  <ul className="space-y-1.5">
                    {(product.details || []).map((detail) => (
                      <li key={detail} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 bg-brand" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </Accordion>
                <Accordion title="Shipping & returns">
                  Orders ship within one business day from Portland. Complimentary shipping over $75,
                  otherwise $7.95 flat. Returns accepted within 30 days, unworn and in the original box.
                </Accordion>
                <Accordion title="Care & repair">
                  Brush leather clean and keep it away from direct heat. Welted soles and stitched
                  sneakers can be returned to the workshop for a resole; email us to start a repair.
                </Accordion>
                <Accordion title="Sizing" id="sizing">
                  Shoes run true to EU size. Clothing is cut straight through the body. If you are
                  between sizes, take the smaller one for a closer fit.
                </Accordion>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" className="scroll-mt-24 border-y border-line bg-surface">
        <div className="container-page py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="eyebrow">Reviews</p>
              <h2 className="mt-2 text-[2rem] leading-[1.06] sm:text-[2.5rem]">Worn and reviewed.</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="font-serif text-4xl">
                  {reviewsQuery.data?.average ? reviewsQuery.data.average.toFixed(1) : '—'}
                </span>
                <div>
                  <Stars value={reviewsQuery.data?.average || 0} />
                  <p className="mt-1 text-[11px] text-muted">
                    {reviewsQuery.data?.count || 0} {reviewsQuery.data?.count === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              </div>

              <div className="mt-7 border-t border-line pt-6">
                {user ? (
                  <ReviewForm
                    productId={product._id}
                    onDone={() => {
                      queryClient.invalidateQueries({ queryKey: ['reviews', product._id] });
                      queryClient.invalidateQueries({ queryKey: ['product', slug] });
                    }}
                  />
                ) : (
                  <>
                    <p className="text-[13px] leading-relaxed text-muted">
                      Bought this piece? Sign in to leave a review.
                    </p>
                    <Button className="mt-3" variant="outline" size="sm" onClick={() => openAuth('login')}>
                      Sign in to review
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div>
              {reviews.length === 0 ? (
                <div className="border border-line bg-paper/50 px-6 py-10 text-center">
                  <p className="text-sm text-muted">
                    No reviews yet. Be the first once your order arrives.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {reviews.map((review) => (
                    <li key={review._id} className="py-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-deep text-[11px] font-medium uppercase">
                            {(review.user?.name || 'A').slice(0, 1)}
                          </span>
                          <div>
                            <p className="text-[12.5px] font-medium">{review.user?.name || 'Anonymous'}</p>
                            <p className="text-[11px] text-muted">{formatDate(review.createdAt)}</p>
                          </div>
                        </div>
                        <Stars value={review.rating} />
                      </div>
                      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{review.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="container-page py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Pair it with</p>
              <h2 className="mt-2 text-[2rem] leading-[1.06] sm:text-[2.4rem]">From the same shelf.</h2>
            </div>
            <Link
              to={`/shop?category=${encodeURIComponent(product.category)}`}
              className="hidden border-b border-ink/25 pb-1 text-[11px] uppercase tracking-[0.16em] hover:border-brand hover:text-brand sm:inline-block"
            >
              More {product.category}
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-7">
            {related.slice(0, 4).map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewForm({ productId, onDone }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(`/reviews/product/${productId}`, {
        method: 'POST',
        body: JSON.stringify({ rating, text }),
      });
      setText('');
      setRating(5);
      toast.success('Thank you — your review is live.');
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p className="text-[12px] font-medium">Write a review</p>
      <p className="mt-1 text-[11.5px] text-muted">
        Reviews are open to customers who have ordered this piece.
      </p>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} star${value === 1 ? '' : 's'}`}
            aria-pressed={rating === value}
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                value <= rating ? 'fill-ink text-ink' : 'text-line hover:text-muted'
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        maxLength={400}
        required
        placeholder="How does it wear? How does it fit?"
        className="field-area mt-3 resize-none"
      />
      {error && <p className="mt-2 text-xs text-brand">{error}</p>}
      <Button type="submit" size="sm" className="mt-3" disabled={busy || !text.trim()}>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Submit review
      </Button>
    </form>
  );
}
