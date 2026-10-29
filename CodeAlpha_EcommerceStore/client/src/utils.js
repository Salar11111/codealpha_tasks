export function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}

const TONES = {
  Kitchen: 'magenta',
  Home: 'cobalt',
  Stationery: 'citrus',
};

export function tone(category) {
  return TONES[category] || 'violet';
}
