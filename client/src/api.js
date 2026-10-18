async function parse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed. Please try again.');
  return data;
}

export async function authRequest(path, body) {
  const response = await fetch(`./api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-MODO-Request': '1' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store'
  });
  return parse(response);
}

export async function getSession() {
  const response = await fetch('./api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
  if (response.status === 401) return null;
  return parse(response);
}

export async function getWorkspace() {
  const response = await fetch('./api/workspace', { credentials: 'same-origin', cache: 'no-store' });
  if (response.status === 401) return { status: 401 };
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to open your workspace.');
  return { status: response.status, ...data };
}

export async function putWorkspace(revision, data, csrf) {
  const response = await fetch('./api/workspace', {
    method: 'PUT',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-MODO-Request': '1', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ revision, data })
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

export async function accountRequest(path, body, csrf, method = 'POST') {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-MODO-Request': '1', 'X-CSRF-Token': csrf },
    body: JSON.stringify(body)
  });
  return parse(response);
}

export async function fetchCalendarFeed(url, csrf) {
  const response = await fetch('./api/calendar-feed', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-MODO-Request': '1', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ url })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Unable to retrieve this iCloud feed.');
  }
  return response.text();
}
