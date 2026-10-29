import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { money } from '../utils';

export default function Orders() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/orders')
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="narrow">
      <p className="eyebrow tone-cobalt">History</p>
      <h1>Orders</h1>
      {location.state?.placed && <p className="notice">Order placed. Status: pending.</p>}
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && !error && (
        <div className="empty-panel">
          <h1>No orders yet.</h1>
          <Link to="/" className="btn btn-citrus">
            Start with the shop
          </Link>
        </div>
      )}
      <ul className="order-list">
        {orders.map((order) => (
          <li
            key={order._id}
            className={location.state?.placed === order._id ? 'panel just-placed' : 'panel'}
          >
            <header>
              <strong>{money(order.total)}</strong>
              <span className={`status status-${order.status}`}>{order.status}</span>
            </header>
            <p className="muted">
              {new Date(order.createdAt).toLocaleString()} · {order.shippingAddress.fullName},{' '}
              {order.shippingAddress.city}
            </p>
            <ul>
              {order.items.map((item, index) => (
                <li key={`${order._id}-${index}`}>
                  {item.name} × {item.qty} · {money(item.price * item.qty)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
