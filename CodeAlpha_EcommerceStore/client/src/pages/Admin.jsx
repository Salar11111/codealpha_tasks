import { useState } from 'react';
import { Eye, EyeOff, Truck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { getStockStatusLabel } from '../utils';

const empty = { name: '', description: '', price: '', stock: '', category: 'Home', image: '' };

export default function Admin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const { data: products = [], error: productsError } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => api('/admin/products').then((result) => result.products),
  });
  const { data: orderPage, error: ordersError, isLoading } = useQuery({
    queryKey: ['admin', 'orders', page, perPage],
    queryFn: () => api(`/orders/all?page=${page}&limit=${perPage}`),
    placeholderData: (previous) => previous,
  });
  const orders = orderPage?.orders ?? [];
  const pages = orderPage?.pages ?? 1;

  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const createMutation = useMutation({
    mutationFn: (payload) => api('/admin/products', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      setForm(empty);
      setNotice('Product added.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: (err) => setError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (product) =>
      api(`/admin/products/${product._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: product.active === false }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });

  const shipMutation = useMutation({
    mutationFn: (order) => api(`/orders/${order._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'shipped' }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  });

  async function createProduct(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    createMutation.mutate(form);
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
        {error && <p className="error" aria-live="polite">{error}</p>}
        {notice && <p className="notice">{notice}</p>}
        {productsError && <p className="error" aria-live="polite">{productsError.message}</p>}
        <button className="btn" type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Adding…' : 'Add product'}
        </button>
      </form>
      <h2>Catalog</h2>
      <ul className="order-list">
        {products.map((product) => (
          <li key={product._id} className="panel">
            <strong>{product.name}</strong>
            <span className="muted">
              {' '}
              {product.active === false ? 'Hidden' : 'Visible'} · {getStockStatusLabel(product.stock)} in stock
            </span>
            <button type="button" className="text-btn" onClick={() => toggleMutation.mutate(product)} aria-label={product.active === false ? 'Show product' : 'Hide product'}>
              {product.active === false ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </li>
        ))}
      </ul>
      <h2>Recent orders</h2>
      {isLoading && <p>Loading orders…</p>}
      {orders.length === 0 && !ordersError && !isLoading && (
        <p className="muted">No orders found.</p>
      )}
      {orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order._id} className="panel">
              <strong>{order.status}</strong> · {order.user?.name} · ${order.total}
              {order.status !== 'shipped' && (
                <button type="button" className="btn btn-small" onClick={() => shipMutation.mutate(order)} disabled={shipMutation.isPending}>
                  <Truck size={16} /> Mark shipped
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {orders.length > 0 && (
        <div className="admin-pagination">
          <button
            type="button"
            className="text-btn"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            className="text-btn"
            onClick={() => setPage((current) => Math.min(pages, current + 1))}
            disabled={page >= pages}
            aria-label="Next page"
          >
            ›
          </button>
          <select
            className="text-btn"
            aria-label="Orders per page"
            value={perPage}
            onChange={(event) => {
              setPerPage(Number(event.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}