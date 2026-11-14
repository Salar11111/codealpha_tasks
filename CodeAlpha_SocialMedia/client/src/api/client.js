export async function api(path, options = {}) {
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(options.body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  const res = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data;
}
