import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [] });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart({ items: [] });
      return;
    }
    const data = await api('/cart');
    setCart(data.cart);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => setCart({ items: [] }));
  }, [refresh]);

  useEffect(() => {
    if (!user) setDrawerOpen(false);
  }, [user]);

  const count = cart.items?.reduce((sum, item) => sum + item.qty, 0) || 0;
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo(
    () => ({
      cart,
      count,
      async addItem(productId, qty = 1) {
        const data = await api('/cart', {
          method: 'POST',
          body: JSON.stringify({ productId, qty, mode: 'add' }),
        });
        setCart(data.cart);
      },
      async setQty(productId, qty) {
        const data = await api('/cart', {
          method: 'POST',
          body: JSON.stringify({ productId, qty, mode: 'set' }),
        });
        setCart(data.cart);
      },
      async removeItem(productId) {
        const data = await api(`/cart/${productId}`, { method: 'DELETE' });
        setCart(data.cart);
      },
      clearLocal() {
        setCart({ items: [] });
      },
      drawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [cart, count, drawerOpen, openDrawer, closeDrawer]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
