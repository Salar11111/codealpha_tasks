import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Package } from 'lucide-react';
import { api } from '../api/client';
import OrderStatus from '../components/OrderStatus';
import Button, { buttonVariants } from '../components/ui/button';
import { formatDate, money } from '../lib/utils';

export default function Orders() {
  const location = useLocation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api('/orders?limit=50'),
  });
  const orders = data?.orders || [];

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Order history</p>
          <h1 className="mt-2 text-[2.4rem] leading-none sm:text-[3rem]">Everything you have ordered.</h1>
          <p className="mt-3 text-sm text-muted">
            {isLoading ? 'Looking up your orders…' : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
          </p>
        </div>
        <Link to="/shop" className={buttonVariants({ variant: 'outline' })}>
          Keep shopping
        </Link>
      </div>

      {location.state?.placed && (
        <p className="mt-6 border border-forest/25 bg-forest/5 px-4 py-3 text-sm text-forest">
          Order placed. You can follow it from paid to delivered below.
        </p>
      )}

      {error && (
        <p className="mt-8 border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand" role="alert">
          {error.message}
        </p>
      )}

      {!isLoading && orders.length === 0 && !error && (
        <div className="mt-10 border border-line bg-surface px-6 py-16 text-center">
          <Package className="mx-auto h-8 w-8 text-muted" strokeWidth={1.3} />
          <h2 className="mt-5 text-3xl">No orders yet.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            When you place an order it will appear here with its status and full history.
          </p>
          <Link to="/shop" className="mt-6 inline-block">
            <Button>Start with the collection</Button>
          </Link>
        </div>
      )}

      {isLoading && (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse border border-line bg-surface" />
          ))}
        </div>
      )}

      <ul className="mt-8 space-y-4">
        {orders.map((order) => (
          <li key={order._id} className="border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <p className="font-serif text-lg">{order.orderNumber}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                  {formatDate(order.createdAt)}
                </p>
                <OrderStatus status={order.status} />
              </div>
              <p className="text-[11px] text-muted">
                {order.itemCount || order.items.length} {order.items.length === 1 ? 'piece' : 'pieces'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-5 px-5 py-4">
              <div className="flex items-center gap-2.5">
                {order.items.slice(0, 4).map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="h-[72px] w-[58px] overflow-hidden bg-paper-deep"
                  >
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                ))}
                {order.items.length > 4 && (
                  <span className="text-[11px] text-muted">+{order.items.length - 4}</span>
                )}
                <div className="ml-1 hidden sm:block">
                  <p className="max-w-[260px] truncate text-[12.5px]">
                    {order.items.map((item) => item.name).join(', ')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {order.items[0]?.size ? `${order.items[0].size} · ${order.items[0].color}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Total</p>
                  <p className="mt-0.5 font-serif text-xl">{money(order.total)}</p>
                </div>
                <Link
                  to={`/orders/${order._id}`}
                  className="inline-flex items-center gap-2 border-b border-ink/25 pb-1 text-[11px] uppercase tracking-[0.14em] transition-colors hover:border-brand hover:text-brand"
                >
                  View order
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
