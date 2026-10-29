import { useEffect, useState } from 'react';
import { api } from '../api/client';

const empty = { name: '', description: '', price: '', stock: '', category: 'Home', image: '' };

export default function Admin() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function load() {
    api('/admin/products').then((data) => setProducts(data.products)).catch((err) => setError(err.message));
    api('/orders/all').then((data) => setOrders(data.orders)).catch(() => setOrders([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function createProduct(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await api('/admin/products', { method: 'POST', body: JSON.stringify(form) });
      setForm(empty);
      setNotice('Product added.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(product) {
    await api(`/admin/products/${product._id}`, { method: 'PATCH', body: JSON.stringify({ active: product.active === false }) });
    load();
  }

  async function ship(order) {
    await api(`/orders/${order._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'shipped' }) });
    load();
  }

  return (
    <section className="narrow">
      <h1>Shop admin</h1>
      <form className="panel" onSubmit={createProduct}>
        <h2>New product</h2>
        {['name', 'description', 'price', 'stock', 'category', 'image'].map((field) => (
          <label key={field}>
            {field}
            <input
              value={form[field]}
              onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
              required
            />
          </label>
        ))}
        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}
        <button className="btn" type="submit">
          Add product
        </button>
      </form>
      <h2>Catalog</h2>
      <ul className="order-list">
        {products.map((product) => (
          <li key={product._id} className="panel">
            <strong>{product.name}</strong>
            <span className="muted">
              {' '}
              {product.active === false ? 'Hidden' : 'Visible'} · {product.stock} in stock
            </span>
            <button type="button" className="text-btn" onClick={() => toggle(product)}>
              {product.active === false ? 'Show' : 'Hide'}
            </button>
          </li>
        ))}
      </ul>
      <h2>Recent orders</h2>
      <ul className="order-list">
        {orders.map((order) => (
          <li key={order._id} className="panel">
            <strong>{order.status}</strong> · {order.user?.name} · ${order.total}
            {order.status !== 'shipped' && (
              <button type="button" className="btn btn-small" onClick={() => ship(order)}>
                Mark shipped
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
