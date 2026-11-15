import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../api/client';
import { summarize } from '../lib/pricing';
import { useAuth } from './AuthContext';

const GUEST_KEY = 'ao.guest-cart.v1';
const CartContext = createContext(null);

function readGuest() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuest(items) {
  try {
    if (items.length) localStorage.setItem(GUEST_KEY, JSON.stringify(items));
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* storage may be unavailable in private mode */
  }
}

function keyOf(productId, variantId) {
  return `${productId}:${variantId}`;
}

function normalizeServerCart(cart) {
  return (cart?.items || [])
    .filter((item) => item.product)
    .map((item) => {
      const product = item.product;
      const variant =
        product.variants?.find((entry) => String(entry._id) === String(item.variantId)) || {};
      return {
        key: keyOf(product._id, item.variantId),
        productId: product._id,
        variantId: item.variantId,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        image: product.images?.[0] || product.image || '',
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        size: variant.size || '',
        color: variant.color || '',
        colorHex: variant.colorHex || '',
        stock: variant.stock ?? 0,
        qty: item.qty,
      };
    });
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [guestItems, setGuestItems] = useState(readGuest);
  const [serverCart, setServerCart] = useState({ items: [] });
  const [serverSummary, setServerSummary] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastUser = useRef(undefined);

  const loadServerCart = useCallback(async () => {
    const data = await api('/cart');
    setServerCart(data.cart);
    setServerSummary(data.summary);
    return data;
  }, []);

  // On sign-in: merge anything kept locally, otherwise load the saved cart.
  useEffect(() => {
    const userId = user?.id || null;
    if (lastUser.current === userId) return;
    lastUser.current = userId;

    if (!userId) {
      setServerCart({ items: [] });
      setServerSummary(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const pending = readGuest();
    const request = pending.length
      ? api('/cart/merge', {
          method: 'POST',
          body: JSON.stringify({
            items: pending.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              qty: item.qty,
            })),
          }),
        })
      : api('/cart');

    request
      .then((data) => {
        if (cancelled) return;
        setServerCart(data.cart);
        setServerSummary(data.summary);
        if (pending.length) {
          writeGuest([]);
          setGuestItems([]);
        }
      })
      .catch(() => {
        if (!cancelled) setServerCart({ items: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) setDrawerOpen(false);
  }, [user]);

  const items = useMemo(
    () => (user ? normalizeServerCart(serverCart) : guestItems),
    [user, serverCart, guestItems]
  );

  const summary = useMemo(() => {
    if (user && serverSummary) return serverSummary;
    return summarize(items.map((item) => ({ price: item.price, qty: item.qty })));
  }, [user, serverSummary, items]);

  const count = items.reduce((sum, item) => sum + item.qty, 0);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const applyServer = useCallback((data) => {
    if (data?.cart) setServerCart(data.cart);
    if (data?.summary) setServerSummary(data.summary);
  }, []);

  async function addItem({ product, variant, qty = 1 }) {
    if (!product || !variant) throw new Error('Select a size and colour first.');
    if (user) {
      const data = await api('/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: product._id || product.id,
          variantId: variant._id || variant.id,
          qty,
          mode: 'add',
        }),
      });
      applyServer(data);
      return data;
    }

    const productId = product._id || product.id;
    const variantId = variant._id || variant.id;
    const key = keyOf(productId, variantId);
    const existing = guestItems.find((item) => item.key === key);
    const nextQty = Math.min((existing?.qty || 0) + qty, variant.stock ?? 99);
    const next = existing
      ? guestItems.map((item) => (item.key === key ? { ...item, qty: nextQty } : item))
      : [
          ...guestItems,
          {
            key,
            productId,
            variantId,
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            image: product.images?.[0] || product.image || '',
            price: product.price,
            size: variant.size,
            color: variant.color,
            colorHex: variant.colorHex || '',
            stock: variant.stock ?? 0,
            qty: Math.min(qty, variant.stock ?? 99),
          },
        ];
    setGuestItems(next);
    writeGuest(next);
    return next;
  }

  async function setQty(line, qty) {
    if (user) {
      const data = await api('/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: line.productId,
          variantId: line.variantId,
          qty,
          mode: 'set',
        }),
      });
      applyServer(data);
      return data;
    }
    const next =
      qty <= 0
        ? guestItems.filter((item) => item.key !== line.key)
        : guestItems.map((item) =>
            item.key === line.key ? { ...item, qty: Math.min(qty, item.stock || 99) } : item
          );
    setGuestItems(next);
    writeGuest(next);
    return next;
  }

  async function removeItem(line) {
    if (user) {
      const data = await api(`/cart/${line.productId}/${line.variantId}`, { method: 'DELETE' });
      applyServer(data);
      return data;
    }
    const next = guestItems.filter((item) => item.key !== line.key);
    setGuestItems(next);
    writeGuest(next);
    return next;
  }

  async function clearCart() {
    if (user) {
      const data = await api('/cart', { method: 'DELETE' });
      applyServer(data);
      return data;
    }
    setGuestItems([]);
    writeGuest([]);
    return [];
  }

  async function refreshCart() {
    if (!user) return;
    await loadServerCart();
  }

  const value = useMemo(
    () => ({
      items,
      summary,
      count,
      loading,
      isGuest: !user,
      drawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      setQty,
      removeItem,
      clearCart,
      refreshCart,
      applyServer,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, summary, count, loading, user, drawerOpen, openDrawer, closeDrawer]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
