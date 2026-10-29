import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { money } from '../utils';

export default function Wishlist() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/wishlist')
      .then((data) => setProducts(data.products))
      .catch((err) => setError(err.message));
  }, []);

  async function remove(id) {
    await api(`/wishlist/${id}`, { method: 'POST' });
    setProducts((current) => current.filter((product) => product._id !== id));
  }

  return (
    <section className="narrow">
      <h1>Wishlist</h1>
      {error && <p className="error">{error}</p>}
      {products.length === 0 && !error && (
        <p className="muted">
          Nothing saved yet. <Link to="/">Browse the shop</Link>.
        </p>
      )}
      <div className="grid">
        {products.map((product) => (
          <article className="card" key={product._id}>
            <Link to={`/products/${product._id}`}>
              <div className="card-media">
                <img src={product.image} alt="" />
              </div>
              <div className="card-body">
                <h2>{product.name}</h2>
                <strong>{money(product.price)}</strong>
              </div>
            </Link>
            <button type="button" className="text-btn" onClick={() => remove(product._id)}>
              Remove
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
