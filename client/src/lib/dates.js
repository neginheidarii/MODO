export const pad = n => String(n).padStart(2, '0');
export const uid = prefix => `${prefix}_${crypto.randomUUID()}`;
export const parseDate = d => new Date(`${d || today()}T12:00:00`);
export const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => dateKey(new Date());
export const addDays = (d, n) => { const x = parseDate(d); x.setDate(x.getDate() + n); return dateKey(x); };
export const diffDays = (a, b) => Math.round((parseDate(a) - parseDate(b)) / 86400000);
export const fmtDate = (d, options = { month: 'short', day: 'numeric' }) => d ? parseDate(d).toLocaleDateString(undefined, options) : 'No date';
export const fmtFull = d => fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export const fmtTime = s => {
  if (!s) return 'Anytime';
  const [h, m] = s.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};
export const timeNow = () => `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
export const weekdayName = d => parseDate(d).toLocaleDateString(undefined, { weekday: 'short' });
export const initials = s => String(s || 'M').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
export const pct = (n, total) => total > 0 ? Math.max(0, Math.min(100, Math.round(100 * n / total))) : 0;
