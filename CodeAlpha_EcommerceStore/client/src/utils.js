export function onImgLoad(event) {
  event.currentTarget.classList.add('loaded');
}

export function bindImgFade(node) {
  if (node?.complete) node.classList.add('loaded');
}

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

// Stock status helpers
export function getStockStatus(stock) {
  if (stock <= 0) return { status: 'out-of-stock', label: 'Sold out', class: 'out-of-stock' };
  if (stock <= 2) return { status: 'low', label: `Only ${stock} left`, class: 'low-stock' };
  if (stock <= 5) return { status: 'low', label: `Only ${stock} left`, class: 'low-stock' };
  if (stock <= 10) return { status: 'medium', label: `${stock} available`, class: 'medium-stock' };
  return { status: 'in-stock', label: `${stock} available`, class: 'in-stock' };
}

export function getStockStatusClass(stock) {
  return getStockStatus(stock).class;
}

export function getStockStatusLabel(stock) {
  return getStockStatus(stock).label;
}

export function getStockDetails(stock) {
  if (stock <= 0) return 'Sold out';
  if (stock <= 2) return `Only ${stock} left`;
  if (stock <= 5) return `Only ${stock} left`;
  return `${stock} in stock`;
}
