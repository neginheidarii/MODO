import { addDays, dateKey, diffDays, parseDate, today } from './dates.js';

export const TASK_CATEGORIES = ['Personal', 'Work', 'Health', 'Errands', 'Groceries', 'Other'];
export const PAGES = ['today', 'tasks', 'calendar', 'people', 'modes', 'rituals', 'meals', 'insights', 'settings', 'more', 'notifications', 'search'];

export function emptyWorkspace() {
  return {
    version: 1,
    meta: { demo: false, createdAt: new Date().toISOString() },
    settings: { theme: 'light', notifications: false, quietStart: '22:00', quietEnd: '07:00', weekStart: 'monday' },
    tasks: [], rituals: [], modes: [], people: [], meetups: [], events: [], recipes: [], mealPlans: [],
    connections: blankConnections()
  };
}

function blankConnections() {
  return {
    google: { clientId: '', calendars: [], lastSync: '', error: '' },
    outlook: { clientId: '', calendars: [], lastSync: '', error: '' },
    icloud: { feeds: [] }
  };
}

export function ensureConnections(db) {
  db.connections ??= blankConnections();
  for (const provider of ['google', 'outlook']) {
    db.connections[provider] ??= { clientId: '', calendars: [], lastSync: '', error: '' };
    db.connections[provider].calendars ??= [];
  }
  db.connections.icloud ??= { feeds: [] };
  db.connections.icloud.feeds ??= [];
  for (const key of ['tasks', 'rituals', 'modes', 'people', 'meetups', 'events', 'recipes', 'mealPlans']) db[key] ??= [];
  db.settings ??= emptyWorkspace().settings;
  return db;
}

export function taskCategory(task) {
  const c = String(task?.category || 'Personal');
  return TASK_CATEGORIES.includes(c) ? c : 'Other';
}

export function dayTaskDone(task, d) {
  return Array.isArray(task.completedDates) && task.completedDates.includes(d);
}

export function taskOccurs(task, d) {
  if (!task.dueDate || d < task.dueDate) return false;
  if (task.repeat === 'none') return d === task.dueDate;
  if (task.repeat === 'daily') return true;
  const weekday = parseDate(d).getDay();
  const anchor = parseDate(task.dueDate).getDay();
  if (task.repeat === 'weekdays') return weekday > 0 && weekday < 6;
  if (task.repeat === 'weekly') return weekday === anchor;
  if (task.repeat === 'monthly') return parseDate(d).getDate() === parseDate(task.dueDate).getDate();
  return false;
}

export function taskDateForAction(task, d) {
  return task.repeat === 'none' ? (task.dueDate || d) : d;
}

export function todayTasks(db) {
  const d = today();
  return db.tasks.filter(t => taskOccurs(t, d) || (t.repeat === 'none' && t.dueDate && t.dueDate < d && !dayTaskDone(t, t.dueDate)))
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] ?? 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] ?? 1));
}

export function tasksOn(db, d) {
  return db.tasks.filter(t => taskOccurs(t, d));
}

export function ruleIsCheck(rule) { return rule?.kind === 'check'; }
export function ruleIsWeekly(rule) { return rule?.cadence === 'weekly'; }
export function modeStartEnd(mode) { return { start: mode.startDate, end: addDays(mode.startDate, mode.duration - 1) }; }
export function modeElapsed(mode) { return Math.max(0, Math.min(mode.duration, diffDays(today(), mode.startDate) + 1)); }
export function effectiveModeStatus(mode) { return mode.status === 'active' && today() > modeStartEnd(mode).end ? 'completed' : mode.status; }
export function ritualOccurs(ritual, d) { const wd = parseDate(d).getDay(); return ritual.schedule !== 'weekdays' || (wd !== 0 && wd !== 6); }
export function ritualDone(ritual, d) { return Number(ritual.logs?.[d] || 0) >= Number(ritual.target || 1); }

export function modeValue(db, mode, rule, d) {
  if (rule.ritualId) return Number(db.rituals.find(r => r.id === rule.ritualId)?.logs?.[d] || 0);
  return Number(mode.logs?.[`${d}|${rule.id}`] || 0);
}

export function weekBounds(d, weekStart = 'monday') {
  const weekday = parseDate(d).getDay();
  const offset = weekStart === 'sunday' ? weekday : (weekday + 6) % 7;
  const start = addDays(d, -offset);
  return { start, end: addDays(start, 6) };
}

export function weeklyChecks(db, mode, rule, d, weekStart = 'monday') {
  const { start, end } = weekBounds(d, weekStart);
  const last = modeStartEnd(mode).end;
  let count = 0;
  for (let day = start; day <= end; day = addDays(day, 1)) {
    if (day < mode.startDate || day > last) continue;
    if (modeValue(db, mode, rule, day) >= 1) count++;
  }
  return count;
}

export function modeRuleDone(db, mode, rule, d) {
  if (ruleIsWeekly(rule)) return modeValue(db, mode, rule, d) >= 1;
  return modeValue(db, mode, rule, d) >= (ruleIsCheck(rule) ? 1 : Number(rule.target || 1));
}

export function ruleSummary(db, mode, rule, day) {
  if (ruleIsWeekly(rule)) {
    const count = weeklyChecks(db, mode, rule, day, db.settings?.weekStart || 'monday');
    return `${count} of ${Number(rule.weeklyTarget) || 1} this week`;
  }
  const allowance = Number(rule?.allowance) || 0;
  if (allowance > 0) return allowance === 1 ? 'One day is allowed' : `${allowance} days are allowed`;
  if (ruleIsCheck(rule)) return 'Check off for the day';
  return `${rule.target} ${rule.unit || 'times'}`;
}

export function modeDailyProgress(db, mode, d) {
  if (!mode || d < mode.startDate || d > modeStartEnd(mode).end) return { done: 0, total: 0 };
  const rules = mode.rules.filter(rule => !ruleIsWeekly(rule));
  return { done: rules.filter(rule => modeRuleDone(db, mode, rule, d)).length, total: rules.length };
}

export function modeAdherence(db, mode) {
  const elapsed = modeElapsed(mode);
  if (!elapsed || !mode.rules.length) return 0;
  const weekStart = db.settings?.weekStart || 'monday';
  const endDay = addDays(mode.startDate, elapsed - 1);
  let complete = 0, total = 0;
  for (const rule of mode.rules) {
    if (ruleIsWeekly(rule)) {
      const target = Number(rule.weeklyTarget) || 1;
      const lastWeek = weekBounds(endDay, weekStart).start;
      for (let week = weekBounds(mode.startDate, weekStart).start; week <= lastWeek; week = addDays(week, 7)) {
        const count = weeklyChecks(db, mode, rule, week, weekStart);
        const finished = today() > addDays(week, 6) || today() > modeStartEnd(mode).end;
        if (!finished && count < target) continue;
        total++;
        if (count >= target) complete++;
      }
      continue;
    }
    let days = 0, misses = 0;
    for (let i = 0; i < elapsed; i++) {
      const day = addDays(mode.startDate, i);
      const linked = db.rituals.find(item => item.id === rule.ritualId);
      if (linked && !ritualOccurs(linked, day)) continue;
      days++;
      if (!modeRuleDone(db, mode, rule, day)) misses++;
    }
    const counted = Math.max(0, misses - (Number(rule.allowance) || 0));
    total += days;
    complete += days - counted;
  }
  return total ? Math.round(100 * complete / total) : 0;
}

export function activeMode(db) {
  return db.modes.find(m => effectiveModeStatus(m) === 'active') || null;
}

export function isRemoteEvent(event) {
  return ['google', 'outlook', 'icloud', 'ics'].includes(event.source);
}

export function connectionVisible(db, provider, id) {
  if (provider === 'ics') return true;
  const entries = provider === 'icloud' ? db.connections.icloud.feeds : db.connections[provider]?.calendars;
  return entries?.find(c => c.id === id)?.visible !== false;
}

export function allEventsForDate(db, d) {
  const items = db.events
    .filter(e => e.date === d && (!isRemoteEvent(e) || connectionVisible(db, e.source, e.calendarId)))
    .map(e => ({ ...e, type: 'event' }));
  items.push(...tasksOn(db, d).map(t => ({
    id: t.id, title: t.title, date: d, time: t.dueTime || '', source: 'task', type: 'task', linkedId: t.id, done: dayTaskDone(t, taskDateForAction(t, d))
  })));
  items.push(...db.mealPlans.filter(m => m.date === d).map(m => ({
    id: m.id, title: `${m.mealType}: ${db.recipes.find(r => r.id === m.recipeId)?.name || 'Meal'}`, date: d, time: m.time || '', source: 'meal', type: 'meal', linkedId: m.id
  })));
  return items.sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
}

export function monthMatrix(monthStart, weekStart) {
  let first = parseDate(monthStart).getDay();
  if (weekStart === 'monday') first = (first + 6) % 7;
  const start = addDays(monthStart, -first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function activityCount(db, d) {
  let n = db.tasks.filter(t => (t.completedDates || []).includes(d)).length;
  n += db.rituals.filter(r => Number(r.logs?.[d] || 0) > 0).length;
  n += db.recipes.filter(r => (r.cookedDates || []).includes(d)).length;
  n += db.meetups.filter(m => m.status === 'completed' && m.date === d).length;
  for (const mode of db.modes) n += mode.rules.filter(r => modeRuleDone(db, mode, r, d)).length ? 1 : 0;
  return n;
}

export function syncMeetupEvent(db, meet) {
  if (!(meet.status === 'scheduled' && meet.date && meet.time)) return;
  const data = { title: meet.title, date: meet.date, time: meet.time, endTime: meet.endTime || '', location: meet.location || '', notes: meet.notes || '', source: 'meetup', linkedId: meet.id, readonly: false };
  const existing = db.events.find(e => e.id === meet.eventId);
  if (existing) Object.assign(existing, data);
  else {
    const id = `event_${crypto.randomUUID()}`;
    meet.eventId = id;
    db.events.push({ id, ...data });
  }
}
