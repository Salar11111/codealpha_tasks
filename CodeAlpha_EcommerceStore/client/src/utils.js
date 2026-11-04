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
