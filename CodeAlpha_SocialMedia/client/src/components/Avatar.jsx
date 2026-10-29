import { initials } from '../utils';

const PALETTE = ['#c2410c', '#0f766e', '#1d4ed8', '#7c3aed', '#be185d', '#b45309', '#0369a1', '#15803d'];

export function avatarColor(name = '') {
  const value = name.trim() || '?';
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({ name, size = 'md' }) {
  return (
    <span className={`avatar avatar-${size}`} style={{ background: avatarColor(name) }} aria-hidden="true">
      {initials(name) || '?'}
    </span>
  );
}
