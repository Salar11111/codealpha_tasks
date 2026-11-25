const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const OFFLINE_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
const SERVER_MESSAGE = 'The server is not responding correctly. Please try again shortly.';
const SESSION_KEY = 'codealpha.session.v1';
const QUEUE_KEY = 'codealpha.offlineQueue.v1';
const REPLAY_LOCK_KEY = 'codealpha.replayLock.v1';
const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_QUEUED = 50;

let statusBanner;
let signInBanner;
let retryTimer;
let replaying = false;
let serverReachable = true;
let statusReason = 'network';

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function hasSession() {
  const store = storage();
  try {
    return !!store && store.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSession() {
  const store = storage();
  try {
    store?.setItem(SESSION_KEY, '1');
  } catch {
    /* storage may be disabled */
  }
}

export function clearSession() {
  const store = storage();
  try {
    store?.removeItem(SESSION_KEY);
  } catch {
    /* storage may be disabled */
  }
}

function readQueue() {
  const store = storage();
  try {
    const parsed = store ? JSON.parse(store.getItem(QUEUE_KEY) || '[]') : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && typeof item.path === 'string') : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  const store = storage();
  try {
    store?.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* storage may be disabled; the in-memory copy still drives this page */
  }
  renderBanner();
}

function ensureBanner() {
  if (typeof document === 'undefined' || !document.body) return null;
  statusBanner = statusBanner || document.querySelector('[data-codealpha-api-status]');
  if (statusBanner) return statusBanner;
  statusBanner = document.createElement('div');
  statusBanner.setAttribute('data-codealpha-api-status', '');
  statusBanner.setAttribute('role', 'status');
  statusBanner.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:10000;padding:10px 16px;text-align:center;' +
    'background:#7c1d1d;color:#fff;font:500 14px/1.4 system-ui,sans-serif';
  document.body.appendChild(statusBanner);
  return statusBanner;
}

function renderBanner() {
  const count = readQueue().length;
  if (serverReachable && !count) {
    if (statusBanner) statusBanner.style.display = 'none';
    stopRetryLoop();
    return;
  }
  const banner = ensureBanner();
  if (!banner) return;
  const base = serverReachable ? '' : statusReason === 'server' ? SERVER_MESSAGE : OFFLINE_MESSAGE;
  const queued = count ? `${count} change${count === 1 ? '' : 's'} queued for retry (not saved yet).` : '';
  banner.textContent = [base, queued].filter(Boolean).join(' ');
  banner.style.display = 'block';
  startRetryLoop();
}

function setApiReachable(reachable, reason = 'network') {
  serverReachable = reachable;
  statusReason = reason;
  renderBanner();
  if (reachable) void replayQueue();
}

function showSignInPrompt() {
  if (typeof document === 'undefined' || !document.body) return;
  signInBanner = signInBanner || document.querySelector('[data-codealpha-signin-prompt]');
  if (signInBanner) return;
  signInBanner = document.createElement('div');
  signInBanner.setAttribute('data-codealpha-signin-prompt', '');
  signInBanner.setAttribute('role', 'alert');
  signInBanner.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;z-index:10001;display:flex;gap:12px;align-items:center;' +
    'justify-content:center;padding:12px 16px;background:#16181d;color:#fff;font:500 14px/1.4 system-ui,sans-serif';
  const text = document.createElement('span');
  text.textContent = 'Your session ended. Sign in again to continue.';
  const link = document.createElement('a');
  link.href = '/login';
  link.textContent = 'Sign in';
  link.style.cssText = 'color:#fff;font-weight:700;text-underline-offset:3px';
  signInBanner.append(text, link);
  document.body.appendChild(signInBanner);
}

function hideSignInPrompt() {
  if (signInBanner) {
    signInBanner.remove();
    signInBanner = null;
  }
}

function handleUnauthorized() {
  clearSession();
  writeQueue([]);
  showSignInPrompt();
}

function serializeBody(body) {
  if (body === undefined || body === null) return null;
  if (typeof body === 'string') return { kind: 'text', value: body };
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const pairs = [];
    for (const [key, value] of body.entries()) {
      // Files cannot be persisted in localStorage; do not claim to queue them.
      if (typeof value !== 'string') return null;
      pairs.push([key, value]);
    }
    return { kind: 'form', value: pairs };
  }
  try {
    return { kind: 'text', value: JSON.stringify(body) };
  } catch {
    return null;
  }
}

function requestBody(entry) {
  if (!entry.body) return undefined;
  if (entry.body.kind === 'form' && typeof FormData !== 'undefined') {
    const form = new FormData();
    for (const [key, value] of entry.body.value || []) form.append(key, value);
    return form;
  }
  return entry.body.value;
}

function enqueue(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  if (!MUTATIONS.has(method)) return;
  const body = serializeBody(options.body);
  if (options.body !== undefined && options.body !== null && !body) return;
  const entry = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    path,
    method,
    headers: { ...(options.headers || {}) },
    body,
    createdAt: Date.now(),
  };
  if (body?.kind === 'form') {
    delete entry.headers['Content-Type'];
    delete entry.headers['content-type'];
  }
  const queue = readQueue();
  if (queue.length >= MAX_QUEUED) queue.shift();
  queue.push(entry);
  writeQueue(queue);
}

function removeQueued(id) {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

// A short-lived lock in localStorage keeps two tabs (or two HMR module
// instances) from replaying the same queued write at once.
function acquireReplayLock() {
  const store = storage();
  if (!store) return true;
  try {
    const heldAt = Number(store.getItem(REPLAY_LOCK_KEY) || 0);
    if (heldAt && Date.now() - heldAt < 30000) return false;
    store.setItem(REPLAY_LOCK_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

function releaseReplayLock() {
  const store = storage();
  try {
    store?.removeItem(REPLAY_LOCK_KEY);
  } catch {
    /* storage may be disabled */
  }
}

async function replayOne(entry) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api${entry.path}`, {
      method: entry.method,
      headers: { ...entry.headers },
      body: requestBody(entry),
      credentials: 'include',
    });
  } catch {
    serverReachable = false;
    statusReason = 'network';
    renderBanner();
    return false;
  }
  if (res.status === 401) {
    removeQueued(entry.id);
    handleUnauthorized();
    return true;
  }
  if (res.status >= 400 && res.status < 500) {
    removeQueued(entry.id);
    return true;
  }
  if (!res.ok) {
    serverReachable = false;
    statusReason = 'server';
    renderBanner();
    return false;
  }
  removeQueued(entry.id);
  if (!readQueue().length) setApiReachable(true);
  return true;
}

async function replayQueue() {
  if (replaying || typeof window === 'undefined') return;
  if (!readQueue().length) return;
  if (!acquireReplayLock()) return;
  replaying = true;
  try {
    for (const entry of readQueue()) {
      if (!readQueue().some((item) => item.id === entry.id)) continue;
      // Sequential replay; stop on an unreachable server and retry on the next ping.
      if (!(await replayOne(entry))) break;
    }
  } finally {
    replaying = false;
    releaseReplayLock();
    renderBanner();
  }
}

async function pingHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store', credentials: 'include' });
    if (!res.ok) return false;
    setApiReachable(true);
    return true;
  } catch {
    serverReachable = false;
    statusReason = 'network';
    renderBanner();
    return false;
  }
}

function startRetryLoop() {
  if (typeof window === 'undefined' || retryTimer) return;
  retryTimer = window.setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    void pingHealth();
  }, 5000);
}

function stopRetryLoop() {
  if (retryTimer !== undefined) {
    window.clearInterval(retryTimer);
    retryTimer = undefined;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void pingHealth());
  if (readQueue().length) void pingHealth();
}

export async function api(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    enqueue(path, { ...options, headers });
    setApiReachable(false);
    const offlineError = new Error(OFFLINE_MESSAGE);
    offlineError.offline = true;
    offlineError.cause = error;
    throw offlineError;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500) {
      enqueue(path, { ...options, headers });
      serverReachable = false;
      statusReason = 'server';
      renderBanner();
    } else {
      setApiReachable(true);
    }
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/register') handleUnauthorized();
    const error = new Error(data.message || 'Something went wrong. Please try again.');
    error.status = res.status;
    throw error;
  }
  setApiReachable(true);
  if (path === '/auth/login' || path === '/auth/register') {
    setSession();
    hideSignInPrompt();
  }
  return data;
}

export function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
