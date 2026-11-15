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

export function hexForColor(name) {
  return COLOR_HEX[name] || '#1c1c1c';
}
