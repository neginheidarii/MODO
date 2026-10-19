const PRIVATE_LINK = 'This Vercel link is private. Open the project in Vercel, go to Settings, then Deployment Protection, and turn Vercel Authentication off. Reload after saving.';

function blocked(response) {
  return response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
}

async function parse(response) {
  if (blocked(response)) throw new Error(PRIVATE_LINK);
  const data = await response.json().catch(() => ({}));
  if (data.protection) throw new Error(PRIVATE_LINK);
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status}). Please try again.`);
  return data;
}

function apiFetch(path, options = {}) {
  return fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'manual',
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) }
  });
}

export async function authRequest(path, body) {
  const response = await apiFetch(`./api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-MODO-Request': '1' },
    body: JSON.stringify(body)
  });
  return parse(response);
}

export async function getSession() {
  const response = await apiFetch('./api/auth/session');
  if (response.status === 401) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.protection) throw new Error(PRIVATE_LINK);
    return null;
  }
  return parse(response);
}

export async function getWorkspace() {
  const response = await apiFetch('./api/workspace');
  if (response.status === 401) return { status: 401 };
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to open your workspace.');
  return { status: response.status, ...data };
}

export async function putWorkspace(revision, data, csrf) {
  const response = await apiFetch('./api/workspace', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-MODO-Request': '1', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ revision, data })
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

export async function accountRequest(path, body, csrf, method = 'POST') {
  const response = await apiFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-MODO-Request': '1', 'X-CSRF-Token': csrf },
    body: JSON.stringify(body)
  });
  return parse(response);
}

export async function fetchCalendarFeed(url, csrf) {
  const response = await apiFetch('./api/calendar-feed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-MODO-Request': '1', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ url })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Unable to retrieve this iCloud feed.');
  }
  return response.text();
}
