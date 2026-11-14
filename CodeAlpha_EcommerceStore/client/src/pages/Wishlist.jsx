import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { money } from '../utils';

export default function Wishlist() {
  const queryClient = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api('/wishlist').then((result) => result.products),
  });
  const products = data || [];

  const removeMutation = useMutation({
    mutationFn: (id) => api(`/wishlist/${id}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  return (
    <section className="narrow">
      <h1>Wishlist</h1>
      {error && <p className="error" aria-live="polite">{error.message}</p>}
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
                <img loading="lazy" decoding="async" src={product.image} alt="" />
              </div>
              <div className="card-body">
                <h2>{product.name}</h2>
                <strong>{money(product.price)}</strong>
              </div>
            </Link>
            <button type="button" className="text-btn" onClick={() => removeMutation.mutate(product._id)} aria-label="Remove from wishlist">
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}