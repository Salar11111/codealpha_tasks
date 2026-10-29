export async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(options.body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data;
}
