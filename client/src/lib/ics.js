import { addDays, dateKey, pad, parseDate, today } from './dates.js';

export function decodeICS(value) {
  return String(value || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

export function decodeICSDate(value) {
  if (!value) return { date: '', time: '' };
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return { date: '', time: '' };
  if (m[7]) {
    const vdate = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}Z`);
    return { date: dateKey(vdate), time: `${pad(vdate.getHours())}:${pad(vdate.getMinutes())}` };
  }
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? `${m[4]}:${m[5]}` : '' };
}

export function parseICS(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const items = [];
  let evt = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { evt = {}; continue; }
    if (line === 'END:VEVENT') { if (evt?.title && evt.date) items.push(evt); evt = null; continue; }
    if (!evt) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).split(';')[0].toUpperCase();
    const val = line.slice(idx + 1).trim();
    if (key === 'SUMMARY') evt.title = decodeICS(val);
    else if (key === 'LOCATION') evt.location = decodeICS(val);
    else if (key === 'DESCRIPTION') evt.notes = decodeICS(val);
    else if (key === 'UID') evt.externalUid = val;
    else if (key === 'RRULE') evt.rrule = val;
    else if (key === 'EXDATE') evt.exdates = [...(evt.exdates || []), ...val.split(',').map(x => decodeICSDate(x).date)];
    else if (key === 'DTSTART') { const x = decodeICSDate(val); evt.date = x.date; evt.time = x.time; }
    else if (key === 'DTEND') evt.endTime = decodeICSDate(val).time;
  }
  return items;
}

export function expandICS(raw) {
  const expanded = [];
  const start = addDays(today(), -120);
  const end = addDays(today(), 370);
  const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  for (const event of raw) {
    if (!event.rrule) {
      if (event.date >= start && event.date <= end) expanded.push({ ...event, externalId: `${event.externalUid || event.title + '|' + event.date}|${event.date}` });
      continue;
    }
    const rules = Object.fromEntries(event.rrule.split(';').map(x => x.split('=')));
    const interval = Math.max(1, Math.min(365, Number(rules.INTERVAL) || 1));
    const count = Math.min(2000, Number(rules.COUNT) || 2000);
    const until = rules.UNTIL ? decodeICSDate(rules.UNTIL).date : end;
    const days = (rules.BYDAY || '').split(',').filter(Boolean);
    let issued = 0;
    for (let j = 0; j < 2200; j++) {
      const d = addDays(event.date, j);
      if (d > until || d > end) break;
      let valid = false;
      if (rules.FREQ === 'DAILY') valid = j % interval === 0;
      else if (rules.FREQ === 'WEEKLY') {
        const week = Math.floor(j / 7);
        const dow = weekdays[parseDate(d).getDay()];
        valid = week % interval === 0 && (days.length ? days.includes(dow) : parseDate(d).getDay() === parseDate(event.date).getDay());
      } else if (rules.FREQ === 'MONTHLY') {
        const a = parseDate(event.date), b = parseDate(d);
        valid = ((b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())) % interval === 0 && b.getDate() === a.getDate();
      } else valid = j === 0;
      if (!valid) continue;
      issued++;
      if (issued > count) break;
      if (d < start || event.exdates?.includes(d)) continue;
      expanded.push({ ...event, date: d, externalId: `${event.externalUid || event.title}|${d}` });
      if (expanded.length >= 2500) break;
    }
    if (expanded.length >= 2500) break;
  }
  return expanded.slice(0, 2500);
}

function icsSafe(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function stamp(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = (time || '09:00').split(':').map(Number);
  return new Date(y, m - 1, d, h, min).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
}

export function eventsToICS(events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MODO//Calendar//EN', 'CALSCALE:GREGORIAN'];
  for (const event of events.filter(e => e.source === 'modo' || e.source === 'meetup' || !e.source)) {
    if (!event.date || !event.title) continue;
    lines.push('BEGIN:VEVENT', `UID:${event.id}@modo`, `DTSTAMP:${stamp(event.date, event.time || '09:00')}`, `DTSTART:${stamp(event.date, event.time || '09:00')}`, `SUMMARY:${icsSafe(event.title)}`);
    if (event.location) lines.push(`LOCATION:${icsSafe(event.location)}`);
    if (event.notes) lines.push(`DESCRIPTION:${icsSafe(event.notes)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
