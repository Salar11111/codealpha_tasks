import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Money is stored in integer cents everywhere. */
export function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    (Number(cents) || 0) / 100
  );
}

export function toCents(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100);
}

export function fromCents(cents) {
  if (cents === null || cents === undefined) return '';
  return (Number(cents) / 100).toFixed(2);
}

export function formatDate(value, options) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export const ORDER_STATUS = {
  paid: { label: 'Paid', tone: 'border-brand/25 bg-brand/10 text-brand-dark' },
  preparing: { label: 'Preparing', tone: 'border-amber-700/25 bg-amber-700/10 text-amber-800' },
  shipped: { label: 'Shipped', tone: 'border-forest/25 bg-forest/10 text-forest' },
  delivered: { label: 'Delivered', tone: 'border-emerald-800/25 bg-emerald-800/10 text-emerald-800' },
  cancelled: { label: 'Cancelled', tone: 'border-line bg-paper-deep text-muted' },
};

export function statusMeta(status) {
  return ORDER_STATUS[status] || ORDER_STATUS.paid;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const DEPARTMENTS = ['Shoes', 'Clothing'];

export const COLOR_HEX = {
  Black: '#1c1c1c',
  White: '#f5f5f0',
  Cream: '#e8e0d0',
  Brown: '#6b4226',
  Chestnut: '#7a4a2b',
  Tan: '#c19a6b',
  Olive: '#5a6240',
  Navy: '#1f2a44',
  Grey: '#8a8a84',
  Charcoal: '#3a3833',
  Rust: '#a9563a',
  Sand: '#d8c3a5',
};

export function colorHex(name) {
  return COLOR_HEX[name] || '#1c1c1c';
}
