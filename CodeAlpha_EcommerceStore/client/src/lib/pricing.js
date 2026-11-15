/**
 * Guest cart totals mirror `server/utils/pricing.js` so the drawer shows the
 * same numbers the API will charge at checkout.
 */
export const FREE_SHIPPING_THRESHOLD = 7500;
export const FLAT_SHIPPING = 795;
export const TAX_RATE = 0.08;

export function summarize(lines = []) {
  const subtotal = lines.reduce(
    (sum, line) => sum + Math.round(Number(line.price) || 0) * Math.max(0, Number(line.qty) || 0),
    0
  );
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const tax = Math.round(subtotal * TAX_RATE);
  return {
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax,
    itemCount: lines.reduce((sum, line) => sum + Math.max(0, Number(line.qty) || 0), 0),
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
  };
}
