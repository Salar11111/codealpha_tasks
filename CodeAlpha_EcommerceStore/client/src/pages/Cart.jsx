import { useState } from 'react';
import { Link } from 'react-router-dom';
import QtyStepper from '../components/QtyStepper';
import { useCart } from '../context/CartContext';
import { money } from '../utils';

export default function Cart() {
  const { cart, setQty, removeItem } = useCart();
  const [error, setError] = useState('');
  const items = (cart.items || []).filter((item) => item.product);
  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  async function change(productId, qty) {
    setError('');
    try {
      await setQty(productId, qty);
    } catch (err) {
      setError(err.message);
    }
  }

  if (items.length === 0) {
    return (
      <section className="narrow">
        <div className="empty-panel">
          <p className="eyebrow">Cart</p>
          <h1>Your cart is empty.</h1>
          <p>Pick something from the shop and it will land here.</p>
          <Link to="/" className="btn btn-citrus">
            Browse the shop
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-layout">
      <div>
        <h1>Cart</h1>
        {error && <p className="error">{error}</p>}
        <ul className="line-list">
          {items.map((item) => (
            <li key={item.product._id}>
              <img src={item.product.image} alt="" />
              <div>
                <Link to={`/products/${item.product._id}`}>
                  <strong>{item.product.name}</strong>
                </Link>
                <p>{money(item.product.price)}</p>
              </div>
              <div className="line-actions">
                <QtyStepper
                  value={item.qty}
                  max={item.product.stock}
                  onChange={(next) => change(item.product._id, next)}
                />
                <strong>{money(item.product.price * item.qty)}</strong>
                <button type="button" className="text-btn" onClick={() => removeItem(item.product._id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="panel summary">
        <h2>Summary</h2>
        <p className="total-line">
          <span>Subtotal</span>
          <strong>{money(total)}</strong>
        </p>
        <Link to="/checkout" className="btn">
          Checkout
        </Link>
      </aside>
    </section>
  );
}
