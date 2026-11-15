import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Check,
  DollarSign,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, toQuery } from '../api/client';
import OrderStatus from '../components/OrderStatus';
import Badge from '../components/ui/badge';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Select from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { formatDate, fromCents, money, statusMeta, toCents } from '../lib/utils';

const STATUSES = ['paid', 'preparing', 'shipped', 'delivered', 'cancelled'];

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
];

let rowCounter = 0;
function uid() {
  rowCounter += 1;
  return `row-${rowCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

function splitList(value) {
  return String(value || '')
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function StatCard({ icon: Icon, label, value, detail, accent = false }) {
  return (
    <div className="border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">{label}</p>
        <Icon
          className={accent ? 'h-4 w-4 text-brand' : 'h-4 w-4 text-muted'}
          strokeWidth={1.5}
        />
      </div>
      <p className="mt-4 font-serif text-[2.1rem] leading-none">{value}</p>
      {detail && <p className="mt-2 text-[11px] leading-relaxed text-muted">{detail}</p>}
    </div>
  );
}

function TableShell({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto border border-line bg-surface ${className}`}>
      <table className="w-full min-w-[760px] border-collapse text-left">{children}</table>
    </div>
  );
}

function productStock(product) {
  return (product.variants || []).reduce((sum, variant) => sum + (variant.stock || 0), 0);
}

function blankForm() {
  return {
    name: '',
    brand: 'Atelier & Oak',
    department: 'Shoes',
    category: '',
    description: '',
    details: '',
    images: '',
    price: '',
    compareAtPrice: '',
    featured: false,
    active: true,
    variants: [],
  };
}

function toForm(product) {
  if (!product) return blankForm();
  return {
    name: product.name || '',
    brand: product.brand || 'Atelier & Oak',
    department: product.department || 'Shoes',
    category: product.category || '',
    description: product.description || '',
    details: (product.details || []).join('\n'),
    images: (product.images || []).join('\n'),
    price: fromCents(product.price),
    compareAtPrice: product.compareAtPrice ? fromCents(product.compareAtPrice) : '',
    featured: Boolean(product.featured),
    active: product.active !== false,
    variants: (product.variants || []).map((variant) => ({
      key: variant._id,
      _id: variant._id,
      size: variant.size || '',
      color: variant.color || '',
      stock: String(variant.stock ?? 0),
    })),
  };
}

function ProductDialog({ open, onOpenChange, product, onSave }) {
  const [form, setForm] = useState(blankForm);
  const [bulk, setBulk] = useState({ sizes: '', colors: '', stock: '8' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(toForm(product));
    setBulk({ sizes: '', colors: '', stock: '8' });
    setError('');
  }, [open, product?._id]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateVariant(index, key, value) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, position) =>
        position === index ? { ...variant, [key]: value } : variant
      ),
    }));
  }

  function addVariant() {
    const last = form.variants[form.variants.length - 1];
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        { key: uid(), size: '', color: last?.color || '', stock: '0' },
      ],
    }));
  }

  function removeVariant(index) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, position) => position !== index),
    }));
  }

  function addGrid() {
    const sizes = splitList(bulk.sizes);
    const colors = splitList(bulk.colors);
    if (!sizes.length || !colors.length) {
      setError('Add at least one size and one colour to build the grid.');
      return;
    }
    setError('');
    const existing = new Set(
      form.variants.map(
        (variant) => `${variant.size.trim().toLowerCase()}|${variant.color.trim().toLowerCase()}`
      )
    );
    const additions = [];
    for (const size of sizes) {
      for (const color of colors) {
        const key = `${size.toLowerCase()}|${color.toLowerCase()}`;
        if (existing.has(key)) continue;
        existing.add(key);
        additions.push({ key: uid(), size, color, stock: bulk.stock || '0' });
      }
    }
    if (!additions.length) {
      setError('Those combinations already exist.');
      return;
    }
    setForm((current) => ({ ...current, variants: [...current.variants, ...additions] }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    const price = toCents(form.price);
    if (price === null || price <= 0) {
      setError('Enter a price in dollars, for example 248.00.');
      return;
    }
    const compareAtPrice = form.compareAtPrice.trim() ? toCents(form.compareAtPrice) : null;
    if (form.compareAtPrice.trim() && (compareAtPrice === null || compareAtPrice <= 0)) {
      setError('The compare-at price needs to be a valid amount.');
      return;
    }

    const variants = form.variants
      .map((variant) => ({
        ...(variant._id ? { _id: variant._id } : {}),
        size: variant.size.trim(),
        color: variant.color.trim(),
        stock: Math.max(0, Math.floor(Number(variant.stock) || 0)),
      }))
      .filter((variant) => variant.size && variant.color);

    if (!variants.length) {
      setError('Add at least one size and colour before saving.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || 'Atelier & Oak',
      department: form.department,
      category: form.category.trim(),
      description: form.description.trim(),
      details: splitList(form.details),
      images: splitList(form.images),
      price,
      compareAtPrice,
      featured: form.featured,
      active: form.active,
      variants,
    };

    setSaving(true);
    try {
      await onSave(payload);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Could not save the product.');
    } finally {
      setSaving(false);
    }
  }

  const preview = splitList(form.images)[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogTitle className="text-2xl">
          {product ? 'Edit piece' : 'New piece'}
        </DialogTitle>
        <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Prices are entered in dollars and saved as integer cents. Variant stock is per size and
          colour.
        </DialogDescription>

        <form onSubmit={submit} className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="admin-name">
                Name
              </label>
              <Input
                id="admin-name"
                required
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder="Ridgeline Chelsea Boot"
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-brand">
                Brand
              </label>
              <Input
                id="admin-brand"
                value={form.brand}
                onChange={(event) => update('brand', event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-category">
                Category
              </label>
              <Input
                id="admin-category"
                required
                value={form.category}
                onChange={(event) => update('category', event.target.value)}
                placeholder="Boots"
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-department">
                Department
              </label>
              <Select
                id="admin-department"
                value={form.department}
                onChange={(event) => update('department', event.target.value)}
              >
                <option>Shoes</option>
                <option>Clothing</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="admin-price">
                  Price (USD)
                </label>
                <Input
                  id="admin-price"
                  required
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => update('price', event.target.value)}
                  placeholder="248.00"
                />
              </div>
              <div>
                <label className="label" htmlFor="admin-compare">
                  Compare at
                </label>
                <Input
                  id="admin-compare"
                  inputMode="decimal"
                  value={form.compareAtPrice}
                  onChange={(event) => update('compareAtPrice', event.target.value)}
                  placeholder="—"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="admin-description">
                Description
              </label>
              <textarea
                id="admin-description"
                required
                rows={3}
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                className="field-area resize-none"
                placeholder="A Goodyear-welted Chelsea boot on a vegetable-tanned leather upper."
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-details">
                Details, one per line
              </label>
              <textarea
                id="admin-details"
                rows={4}
                value={form.details}
                onChange={(event) => update('details', event.target.value)}
                className="field-area resize-none"
                placeholder={'Goodyear-welted\nVegetable-tanned leather\nMade in Portland'}
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-images">
                Images, one URL per line
              </label>
              <textarea
                id="admin-images"
                rows={4}
                value={form.images}
                onChange={(event) => update('images', event.target.value)}
                className="field-area resize-none"
                placeholder={'/products/boots-1.jpg\n/products/boots-2.jpg'}
              />
              {preview && (
                <div className="mt-2 h-[76px] w-[60px] overflow-hidden border border-line bg-paper-deep">
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 border-y border-line py-4">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => update('featured', event.target.checked)}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              Featured on the home page
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => update('active', event.target.checked)}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              Visible in the shop
            </label>
          </div>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em]">Variants</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {form.variants.length} size / colour combinations
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="h-3.5 w-3.5" />
                Add variant
              </Button>
            </div>

            {form.variants.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="hidden gap-2 px-1 text-[10px] uppercase tracking-[0.16em] text-muted sm:grid sm:grid-cols-[1fr_1fr_90px_36px]">
                  <span>Size</span>
                  <span>Colour</span>
                  <span>Stock</span>
                  <span />
                </div>
                {form.variants.map((variant, index) => (
                  <div
                    key={variant.key}
                    className="grid grid-cols-[1fr_1fr_76px_36px] gap-2 sm:grid-cols-[1fr_1fr_90px_36px]"
                  >
                    <Input
                      aria-label="Variant size"
                      value={variant.size}
                      onChange={(event) => updateVariant(index, 'size', event.target.value)}
                      placeholder="42"
                      className="h-9 text-[12.5px]"
                    />
                    <Input
                      aria-label="Variant colour"
                      value={variant.color}
                      onChange={(event) => updateVariant(index, 'color', event.target.value)}
                      placeholder="Black"
                      className="h-9 text-[12.5px]"
                    />
                    <Input
                      aria-label="Variant stock"
                      inputMode="numeric"
                      value={variant.stock}
                      onChange={(event) => updateVariant(index, 'stock', event.target.value)}
                      className="h-9 text-[12.5px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-brand hover:text-brand"
                      aria-label="Remove variant"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border border-line bg-paper/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                Build a size run
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_80px_auto]">
                <Input
                  aria-label="Sizes to add"
                  value={bulk.sizes}
                  onChange={(event) => setBulk((current) => ({ ...current, sizes: event.target.value }))}
                  placeholder="Sizes: 40, 41, 42"
                  className="h-9 text-[12.5px]"
                />
                <Input
                  aria-label="Colours to add"
                  value={bulk.colors}
                  onChange={(event) => setBulk((current) => ({ ...current, colors: event.target.value }))}
                  placeholder="Colours: Black, Tan"
                  className="h-9 text-[12.5px]"
                />
                <Input
                  aria-label="Stock for new variants"
                  inputMode="numeric"
                  value={bulk.stock}
                  onChange={(event) => setBulk((current) => ({ ...current, stock: event.target.value }))}
                  className="h-9 text-[12.5px]"
                />
                <Button type="button" variant="light" size="sm" onClick={addGrid}>
                  Add grid
                </Button>
              </div>
            </div>
          </section>

          {error && (
            <p className="border border-brand/25 bg-brand/5 px-3 py-2 text-xs text-brand" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {product ? 'Save changes' : 'Create piece'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RestockDialog({ product, onOpenChange, onSave }) {
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState('10');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVariantId(product?.variants?.[0]?._id || '');
    setQty('10');
    setNotes('');
    setError('');
  }, [product?._id]);

  if (!product) return null;

  const variant = product.variants?.find((entry) => String(entry._id) === String(variantId));

  async function submit(event) {
    event.preventDefault();
    setError('');
    const quantity = Math.floor(Number(qty));
    if (!Number.isFinite(quantity) || quantity < 1) {
      setError('Enter a whole number of one or more.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ variantId, qty: quantity, notes });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Could not restock this variant.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-2xl">Restock</DialogTitle>
        <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-muted">
          {product.name}
        </DialogDescription>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="restock-variant">
              Variant
            </label>
            <Select
              id="restock-variant"
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
            >
              {(product.variants || []).map((entry) => (
                <option key={entry._id} value={entry._id}>
                  {entry.size} / {entry.color} · {entry.stock} in stock
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label" htmlFor="restock-qty">
              Units to add
            </label>
            <Input
              id="restock-qty"
              inputMode="numeric"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
            />
            {variant && (
              <p className="mt-1.5 text-[11px] text-muted">
                {variant.stock} now → {variant.stock + (Math.floor(Number(qty)) || 0)} after this
                restock.
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="restock-notes">
              Note
            </label>
            <Input
              id="restock-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Delivery from the workshop"
            />
          </div>

          {error && <p className="text-xs text-brand">{error}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !variantId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productDialog, setProductDialog] = useState({ open: false, product: null });
  const [restockTarget, setRestockTarget] = useState(null);

  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api('/admin/stats'),
  });
  const productsQuery = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => api('/admin/products'),
  });
  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders', statusFilter],
    queryFn: () => api(`/orders/all${toQuery({ status: statusFilter, limit: 50 })}`),
    enabled: tab === 'orders',
  });

  const stats = statsQuery.data?.stats;
  const recentOrders = statsQuery.data?.recentOrders || [];
  const products = productsQuery.data?.products || [];
  const orders = ordersQuery.data?.orders || [];

  const lowStock = useMemo(
    () =>
      products
        .filter((product) => product.active !== false && productStock(product) <= 5)
        .sort((a, b) => productStock(a) - productStock(b))
        .slice(0, 6),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.category, product.department, product.brand]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [products, productSearch]);

  function invalidateStore() {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
    queryClient.invalidateQueries({ queryKey: ['shop'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
    queryClient.invalidateQueries({ queryKey: ['home'] });
    queryClient.invalidateQueries({ queryKey: ['wishlist'] });
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      api(id ? `/admin/products/${id}` : '/admin/products', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidateStore,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api(`/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateStore,
  });

  const restockMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      api(`/admin/products/${id}/restock`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidateStore,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      toast.success('Order status updated.');
    },
    onError: (error) => toast.error(error.message),
  });

  async function saveProduct(payload) {
    const id = productDialog.product?._id;
    await saveMutation.mutateAsync({ id, payload });
    toast.success(id ? 'Piece updated.' : 'Piece created.');
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete “${product.name}”? This removes it from carts and wishlists.`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(product._id);
      toast.success('Piece deleted.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function toggleActive(product) {
    try {
      await saveMutation.mutateAsync({
        id: product._id,
        payload: { active: product.active === false },
      });
      toast.success(product.active === false ? 'Piece is live again.' : 'Piece hidden from the shop.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function restock({ variantId, qty, notes }) {
    await restockMutation.mutateAsync({
      id: restockTarget._id,
      payload: { variantId, qty, notes },
    });
    toast.success('Stock added.');
  }

  const maxStatusCount = Math.max(1, ...Object.values(stats?.ordersByStatus || {}));

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Atelier &amp; Oak</p>
          <h1 className="mt-2 text-[2.4rem] leading-none sm:text-[3rem]">The studio.</h1>
          <p className="mt-3 text-sm text-muted">
            Signed in as {user.name} · {user.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/shop">
            <Button variant="outline" size="sm">
              View shop
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setProductDialog({ open: true, product: null })}
          >
            <Plus className="h-3.5 w-3.5" />
            New piece
          </Button>
        </div>
      </div>

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((entry) => {
          const count =
            entry.key === 'orders'
              ? stats?.orders
              : entry.key === 'products'
                ? products.length
                : null;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className={`relative shrink-0 px-4 py-3 text-[12px] font-medium uppercase tracking-[0.14em] transition-colors ${
                tab === entry.key ? 'text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {entry.label}
              {typeof count === 'number' && (
                <span className="ml-1.5 text-[10px] text-muted">{count}</span>
              )}
              {tab === entry.key && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-ink" />
              )}
            </button>
          );
        })}
      </div>

      {statsQuery.error && (
        <p className="mt-6 border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand">
          {statsQuery.error.message}
        </p>
      )}

      {statsQuery.isLoading && (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse border border-line bg-surface" />
          ))}
        </div>
      )}

      {tab === 'overview' && stats && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={DollarSign}
              label="Revenue"
              value={money(stats.revenue)}
              detail={`${stats.paidOrders} paid ${stats.paidOrders === 1 ? 'order' : 'orders'}, cancellations excluded`}
              accent
            />
            <StatCard
              icon={ShoppingBag}
              label="Orders"
              value={stats.orders}
              detail="All time, every status"
            />
            <StatCard
              icon={Package}
              label="Pieces"
              value={stats.products}
              detail="In the catalogue"
            />
            <StatCard
              icon={AlertTriangle}
              label="Low stock"
              value={stats.lowStock}
              detail="Five units or fewer on the shelf"
              accent={stats.lowStock > 0}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <section className="border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <h2 className="text-lg">Recent orders</h2>
                <button
                  type="button"
                  onClick={() => setTab('orders')}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
                >
                  All orders
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
              {recentOrders.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted">
                  No orders yet. Place one from the storefront to see it here.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {recentOrders.map((order) => (
                    <li
                      key={order._id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            to={`/orders/${order._id}`}
                            className="font-serif text-[17px] hover:text-brand"
                          >
                            {order.orderNumber}
                          </Link>
                          <OrderStatus status={order.status} />
                        </div>
                        <p className="mt-1 truncate text-[11.5px] text-muted">
                          {order.user?.name || 'Customer'} · {formatDate(order.createdAt)} ·{' '}
                          {order.itemCount ?? order.items?.length ?? 0} pieces
                        </p>
                      </div>
                      <p className="font-serif text-lg">{money(order.total)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="space-y-6">
              <section className="border border-line bg-surface p-5">
                <h2 className="text-lg">By status</h2>
                <ul className="mt-4 space-y-3">
                  {STATUSES.map((status) => {
                    const count = stats.ordersByStatus?.[status] || 0;
                    return (
                      <li key={status}>
                        <div className="flex items-center justify-between text-[11.5px]">
                          <span className="text-muted">{statusMeta(status).label}</span>
                          <span>{count}</span>
                        </div>
                        <div className="mt-1.5 h-[3px] w-full bg-line">
                          <div
                            className="h-full bg-ink"
                            style={{ width: `${(count / maxStatusCount) * 100}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="border border-line bg-surface p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg">Low stock</h2>
                  <Boxes className="h-4 w-4 text-muted" strokeWidth={1.5} />
                </div>
                {lowStock.length === 0 ? (
                  <p className="mt-3 text-[12px] text-muted">Everything is comfortably stocked.</p>
                ) : (
                  <ul className="mt-3 space-y-2.5">
                    {lowStock.map((product) => (
                      <li key={product._id} className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setRestockTarget(product)}
                          className="min-w-0 truncate text-left text-[12px] hover:text-brand"
                        >
                          {product.name}
                        </button>
                        <Badge tone={productStock(product) === 0 ? 'brand' : 'muted'}>
                          {productStock(product)} left
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {tab === 'orders' && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] text-muted">
              {ordersQuery.isLoading
                ? 'Loading orders…'
                : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}${
                    statusFilter ? ` · ${statusMeta(statusFilter).label}` : ''
                  }`}
            </p>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-9 w-44 text-[12px]"
              aria-label="Filter orders by status"
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusMeta(status).label}
                </option>
              ))}
            </Select>
          </div>

          {ordersQuery.error && (
            <p className="mt-4 border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand">
              {ordersQuery.error.message}
            </p>
          )}

          {ordersQuery.isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse border border-line bg-surface" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-4 border border-line bg-surface px-6 py-14 text-center">
              <p className="text-sm text-muted">No orders with that status.</p>
            </div>
          ) : (
            <TableShell className="mt-4">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.16em] text-muted">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Placed</th>
                  <th className="px-4 py-3 font-medium">Pieces</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const pending =
                    statusMutation.isPending && statusMutation.variables?.id === order._id;
                  return (
                    <tr key={order._id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/orders/${order._id}`}
                          className="font-serif text-[16px] hover:text-brand"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[12.5px]">{order.user?.name || 'Customer'}</p>
                        <p className="text-[11px] text-muted">{order.user?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3.5 text-[11.5px] text-muted">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-[12px]">
                        {order.itemCount ?? order.items?.length ?? 0}
                      </td>
                      <td className="px-4 py-3.5 text-[12.5px]">{money(order.total)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <select
                            value={order.status}
                            onChange={(event) =>
                              statusMutation.mutate({ id: order._id, status: event.target.value })
                            }
                            disabled={pending}
                            aria-label={`Status for ${order.orderNumber}`}
                            className="h-8 border border-line bg-surface px-2 text-[10px] uppercase tracking-[0.1em] outline-none transition-colors focus:border-ink disabled:opacity-50"
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {statusMeta(status).label}
                              </option>
                            ))}
                          </select>
                          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/orders/${order._id}`}
                          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
                        >
                          View
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <Input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search pieces…"
                className="h-9 pl-9 text-[12.5px]"
                aria-label="Search products"
              />
            </div>
            <Button size="sm" onClick={() => setProductDialog({ open: true, product: null })}>
              <Plus className="h-3.5 w-3.5" />
              New piece
            </Button>
          </div>

          {productsQuery.error && (
            <p className="mt-4 border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand">
              {productsQuery.error.message}
            </p>
          )}

          {productsQuery.isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse border border-line bg-surface" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-4 border border-line bg-surface px-6 py-14 text-center">
              <p className="text-sm text-muted">No pieces match that search.</p>
            </div>
          ) : (
            <TableShell className="mt-4">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.16em] text-muted">
                  <th className="px-4 py-3 font-medium">Piece</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">State</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stock = productStock(product);
                  return (
                    <tr key={product._id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-[54px] w-[42px] shrink-0 overflow-hidden bg-paper-deep">
                            <img
                              src={product.images?.[0]}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[230px] truncate text-[12.5px] font-medium">
                              {product.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted">{product.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px]">{product.department}</td>
                      <td className="px-4 py-3 text-[12.5px]">{money(product.price)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[12.5px] ${stock === 0 ? 'text-brand' : stock <= 5 ? 'text-brand-dark' : ''}`}
                        >
                          {stock}
                        </span>
                        <span className="ml-1 text-[11px] text-muted">
                          / {product.variants?.length || 0} variants
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone={product.active === false ? 'muted' : 'forest'}>
                            {product.active === false ? 'Hidden' : 'Live'}
                          </Badge>
                          {product.featured && <Badge tone="brand">Featured</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setProductDialog({ open: true, product })}
                            className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink"
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestockTarget(product)}
                            className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink"
                            aria-label={`Restock ${product.name}`}
                          >
                            <Boxes className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(product)}
                            className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink"
                            aria-label={
                              product.active === false
                                ? `Make ${product.name} visible`
                                : `Hide ${product.name}`
                            }
                            title={product.active === false ? 'Make visible' : 'Hide from shop'}
                          >
                            {product.active === false ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeProduct(product)}
                            disabled={deleteMutation.isPending}
                            className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-brand disabled:opacity-40"
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          )}
        </div>
      )}

      <ProductDialog
        open={productDialog.open}
        product={productDialog.product}
        onOpenChange={(open) =>
          setProductDialog((current) => ({ ...current, open }))
        }
        onSave={saveProduct}
      />

      <RestockDialog
        product={restockTarget}
        onOpenChange={(open) => {
          if (!open) setRestockTarget(null);
        }}
        onSave={restock}
      />
    </div>
  );
}
