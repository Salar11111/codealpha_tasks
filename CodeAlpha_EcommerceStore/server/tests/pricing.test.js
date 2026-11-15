import { summarize, FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING } from '../utils/pricing.js';

const original = process.env.TAX_RATE;

afterEach(() => {
  if (original === undefined) delete process.env.TAX_RATE;
  else process.env.TAX_RATE = original;
});

test('charges flat shipping below the free threshold', () => {
  delete process.env.TAX_RATE;
  const summary = summarize([
    { price: 4200, qty: 1 },
    { price: 1200, qty: 2 },
  ]);
  expect(summary.subtotal).toBe(6600);
  expect(summary.shipping).toBe(FLAT_SHIPPING);
  expect(summary.tax).toBe(528);
  expect(summary.total).toBe(6600 + FLAT_SHIPPING + 528);
  expect(summary.freeShippingRemaining).toBe(FREE_SHIPPING_THRESHOLD - 6600);
});

test('free shipping starts exactly at the threshold and totals are integer cents', () => {
  delete process.env.TAX_RATE;
  const summary = summarize([{ price: 7500, qty: 1 }]);
  expect(summary.subtotal).toBe(7500);
  expect(summary.shipping).toBe(0);
  expect(summary.tax).toBe(600);
  expect(summary.total).toBe(8100);
  expect(summary.freeShippingRemaining).toBe(0);
  expect(Number.isInteger(summary.total)).toBe(true);
});

test('tax rate is configurable and empty carts cost nothing', () => {
  process.env.TAX_RATE = '0.05';
  const summary = summarize([{ price: 10000, qty: 1 }]);
  expect(summary.tax).toBe(500);
  expect(summary.total).toBe(10500);
  const empty = summarize([]);
  expect(empty).toMatchObject({ subtotal: 0, shipping: 0, tax: 0, total: 0 });
});
