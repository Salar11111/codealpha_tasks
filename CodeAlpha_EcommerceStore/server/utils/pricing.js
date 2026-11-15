export const FREE_SHIPPING_THRESHOLD = 7500; // $75.00 in cents
export const FLAT_SHIPPING = 795; // $7.95 in cents

export function taxRate() {
  const raw = Number(process.env.TAX_RATE);
  return Number.isFinite(raw) && raw >= 0 && raw < 1 ? raw : 0.08;
}

/**
 * Money lives in integer cents everywhere so cart, checkout and orders agree.
 * `lines` is [{ price, qty }] with price already in cents.
 */
export function summarize(lines = []) {
  const subtotal = lines.reduce((sum, line) => {
    const price = Math.round(Number(line.price) || 0);
    const qty = Math.max(0, Math.round(Number(line.qty) || 0));
    return sum + price * qty;
  }, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const tax = Math.round(subtotal * taxRate());
  return {
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax,
    itemCount: lines.reduce((sum, line) => sum + Math.max(0, Math.round(Number(line.qty) || 0)), 0),
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
  };
}
