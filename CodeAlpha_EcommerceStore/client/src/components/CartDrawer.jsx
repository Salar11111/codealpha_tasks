import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import QtyStepper from './QtyStepper';
import { useCart } from '../context/CartContext';
import { money } from '../utils';

export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, setQty, removeItem } = useCart();
  const closeRef = useRef(null);
  const items = (cart.items || []).filter((item) => item.product);
  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event) {
      if (event.key === 'Escape') closeDrawer();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Cart">
      <button type="button" className="drawer-backdrop" aria-label="Close cart" onClick={closeDrawer} />
      <aside className="drawer-panel">
        <header className="drawer-head">
          <h2>Your cart</h2>
          <button type="button" className="text-btn" ref={closeRef} onClick={closeDrawer}>
            Close
          </button>
        </header>
        {items.length === 0 && <p className="muted">Nothing here yet. Add a piece from the shop.</p>}
        <ul className="drawer-list">
          {items.map((item) => (
            <li key={item.product._id}>
              <img src={item.product.image} alt="" />
              <div>
                <Link to={`/products/${item.product._id}`} onClick={closeDrawer}>
                  <strong>{item.product.name}</strong>
                </Link>
                <p>{money(item.product.price)}</p>
                <QtyStepper
                  value={item.qty}
                  max={item.product.stock}
                  onChange={(next) => setQty(item.product._id, next)}
                />
              </div>
              <button type="button" className="text-btn" onClick={() => removeItem(item.product._id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        {items.length > 0 && (
          <footer className="drawer-foot">
            <p className="total-line">
              <span>Subtotal</span>
              <strong>{money(total)}</strong>
            </p>
            <Link to="/checkout" className="btn" onClick={closeDrawer}>
              Checkout
            </Link>
            <Link to="/cart" className="text-link" onClick={closeDrawer}>
              View full cart
            </Link>
          </footer>
        )}
      </aside>
    </div>
  );
}
