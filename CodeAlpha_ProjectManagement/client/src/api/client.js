const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const OFFLINE_MESSAGE = 'Cannot reach the server. Check your connection and try again.';

// Show one clear banner when the API is unreachable, instead of failing silently.
let statusBanner;
function setApiReachable(reachable) {
  if (typeof document === 'undefined') return;
  if (!statusBanner && reachable) return;
  if (!statusBanner) {
    statusBanner = document.createElement('div');
    statusBanner.setAttribute('role', 'status');
    statusBanner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:10000;padding:10px 16px;text-align:center;' +
      'background:#7c1d1d;color:#fff;font:500 14px/1.4 system-ui,sans-serif';
    document.body.appendChild(statusBanner);
  }
  statusBanner.textContent = reachable ? '' : OFFLINE_MESSAGE;
  statusBanner.style.display = reachable ? 'none' : 'block';
}

export async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, { ...options, headers, credentials: 'include' });
  } catch (error) {
    setApiReachable(false);
    throw new Error(OFFLINE_MESSAGE);
  }
  setApiReachable(true);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data;
}
