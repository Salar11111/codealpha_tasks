import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Check, PackageCheck } from 'lucide-react';
import { api } from '../api/client';
import OrderStatus from '../components/OrderStatus';
import Spinner from '../components/ui/spinner';
import { buttonVariants } from '../components/ui/button';
import { cn, formatDate, money } from '../lib/utils';

const STEPS = [
  { key: 'paid', label: 'Paid' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const justPlaced = Boolean(location.state?.justPlaced);

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api(`/orders/${id}`),
  });

  const order = data?.order;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading order…" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-page py-20 text-center">
        <p className="eyebrow">Order</p>
        <h1 className="mt-3 text-4xl">Order not found.</h1>
        <p className="mt-3 text-sm text-muted">{error?.message || 'It may belong to another account.'}</p>
        <Link to="/orders" className="mt-6 inline-block">
          <span className={buttonVariants({ variant: 'outline' })}>Back to orders</span>
        </Link>
      </div>
    );
  }

  const stepIndex = order.status === 'cancelled' ? -1 : STEPS.findIndex((step) => step.key === order.status);

  return (
    <div className="container-page py-10 sm:py-14">
      <Link
        to="/orders"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All orders
      </Link>

      {justPlaced && (
        <div className="mt-6 flex items-start gap-4 border border-forest/25 bg-forest/5 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-paper">
            <Check className="h-5 w-5" />
          </span>
          <div>
            <p className="font-serif text-xl">Thank you — the order is in the workshop.</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              A confirmation would normally land in your inbox. This demo records the order as paid
              so you can follow the rest of the flow.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow">Order {order.orderNumber}</p>
          <h1 className="mt-2 text-[2.2rem] leading-none sm:text-[2.8rem]">
            {order.status === 'delivered' ? 'Delivered.' : 'In good hands.'}
          </h1>
          <p className="mt-2 text-sm text-muted">Placed {formatDate(order.createdAt, { hour: 'numeric', minute: '2-digit' })}</p>
        </div>
        <div className="text-right">
          <OrderStatus status={order.status} />
          <p className="mt-2 text-[11px] text-muted">Total {money(order.total)}</p>
        </div>
      </div>

      {order.status !== 'cancelled' ? (
        <div className="mt-8 grid grid-cols-2 gap-4 border border-line bg-surface p-5 sm:grid-cols-4 sm:p-6">
          {STEPS.map((step, index) => {
            const complete = index <= stepIndex;
            const current = index === stepIndex;
            return (
              <div key={step.key} className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px]',
                    complete ? 'border-ink bg-ink text-paper' : 'border-line text-muted'
                  )}
                >
                  {index < stepIndex ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <div>
                  <p className={cn('text-[11px] uppercase tracking-[0.14em]', current ? 'text-ink' : 'text-muted')}>
                    {step.label}
                  </p>
                  {current && <p className="mt-0.5 text-[10px] text-brand">Current status</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-8 border border-line bg-paper-deep px-4 py-3 text-sm text-muted">
          This order was cancelled and the stock was returned to the shelf.
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
        <section>
          <h2 className="border-b border-line pb-3 text-xl">Pieces</h2>
          <ul className="divide-y divide-line">
            {order.items.map((item, index) => (
              <li key={`${item.product}-${index}`} className="flex gap-4 py-5">
                <Link
                  to={item.slug ? `/products/${item.slug}` : '/shop'}
                  className="block h-[110px] w-[86px] shrink-0 overflow-hidden bg-paper-deep"
                >
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{item.brand}</p>
                      <Link to={item.slug ? `/products/${item.slug}` : '/shop'} className="mt-0.5 block text-[14px] font-medium hover:text-brand">
                        {item.name}
                      </Link>
                      <p className="mt-1 text-[12px] text-muted">
                        {item.color} · Size {item.size}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm">{money(item.price * item.qty)}</p>
                  </div>
                  <p className="mt-auto pt-3 text-[11px] text-muted">
                    {item.qty} × {money(item.price)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted">Shipping to</h2>
              <address className="mt-2.5 text-[13px] not-italic leading-relaxed">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && (
                  <>
                    <br />
                    {order.shippingAddress.line2}
                  </>
                )}
                <br />
                {order.shippingAddress.city}
                {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}{' '}
                {order.shippingAddress.postalCode}
                <br />
                {order.shippingAddress.country}
                {order.shippingAddress.phone && (
                  <>
                    <br />
                    {order.shippingAddress.phone}
                  </>
                )}
              </address>
            </div>
            <div>
              <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted">Payment</h2>
              <p className="mt-2.5 flex items-center gap-2 text-[13px]">
                <PackageCheck className="h-4 w-4 text-ink" strokeWidth={1.4} />
                Demo payment · {order.paymentRef || 'recorded as paid'}
              </p>
              <p className="mt-1 text-[11px] text-muted">No card was charged.</p>
            </div>
          </div>
        </section>

        <aside>
          <div className="border border-line bg-surface p-6 lg:sticky lg:top-[118px]">
            <h2 className="text-xl">Summary</h2>
            <dl className="mt-4 space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd>{order.shipping === 0 ? 'Free' : money(order.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Tax</dt>
                <dd>{money(order.tax)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm font-medium">Total</span>
              <span className="font-serif text-2xl">{money(order.total)}</span>
            </div>
            <Link
              to="/shop"
              className={buttonVariants({ variant: 'outline' }) + ' mt-5 w-full'}
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
