import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Button from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

export default function Wishlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api('/wishlist').then((result) => result.products),
  });

  const products = data || [];

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Saved pieces</p>
          <h1 className="mt-2 text-[2.4rem] leading-none sm:text-[3rem]">Your wishlist.</h1>
          <p className="mt-3 text-sm text-muted">
            {isLoading ? 'Opening your list…' : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`}
          </p>
        </div>
        <Link to="/shop" className="text-[11px] uppercase tracking-[0.16em] underline decoration-line underline-offset-4 hover:text-brand">
          Find something else
        </Link>
      </div>

      {error && (
        <p className="mt-8 border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand" role="alert">
          {error.message}
        </p>
      )}

      {!isLoading && products.length === 0 && !error && (
        <div className="mt-10 border border-line bg-surface px-6 py-16 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted" strokeWidth={1.3} />
          <h2 className="mt-5 text-3xl">Nothing saved yet.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Tap the heart on any piece to keep it here while you decide.
          </p>
          <Link to="/shop" className="mt-6 inline-block">
            <Button>Browse the collection</Button>
          </Link>
        </div>
      )}

      {isLoading && (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[4/5] bg-paper-deep" />
              <div className="mt-4 h-3 w-2/3 bg-paper-deep" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-7">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      {user && products.length > 0 && (
        <p className="mt-12 border-t border-line pt-6 text-[11px] text-muted">
          Saved to {user.email}. Removing a piece updates this list immediately.
        </p>
      )}
    </div>
  );
}
