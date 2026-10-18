import { addDays, fmtTime, pad, today } from './dates.js';
import { dayTaskDone, taskDateForAction, taskOccurs } from './domain.js';

function quietNow(settings) {
  const now = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
  const start = settings.quietStart;
  const end = settings.quietEnd;
  if (!start || !end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end;
}

export function checkReminders(db, userId) {
  if (!db?.settings?.notifications || !('Notification' in window) || Notification.permission !== 'granted' || quietNow(db.settings)) return;
  const now = Date.now();
  const storageKey = `modo-notified-v1-${userId || 'local'}`;
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { seen = []; }
  const notes = [];
  for (const task of db.tasks) {
    if (!task.dueTime || !task.reminder || task.reminder === 'none') continue;
    for (const day of [today(), addDays(today(), 1)]) {
      if (!taskOccurs(task, day) || dayTaskDone(task, taskDateForAction(task, day))) continue;
      const lead = Number(task.reminder) || 0;
      const at = new Date(`${day}T${task.dueTime}:00`).getTime() - lead * 60_000;
      if (at <= now && now - at < 75_000) notes.push({ key: `task:${task.id}:${day}:${lead}`, title: `A little reminder: ${task.title}`, body: `Scheduled for ${fmtTime(task.dueTime)}` });
    }
  }
  for (const meetup of db.meetups.filter(item => item.status === 'scheduled' && item.time && item.date)) {
    const at = new Date(`${meetup.date}T${meetup.time}:00`).getTime() - 15 * 60_000;
    if (at <= now && now - at < 75_000) notes.push({ key: `meetup:${meetup.id}:${meetup.date}`, title: `Coming up: ${meetup.title}`, body: meetup.location || 'Your meetup starts in 15 minutes.' });
  }
  for (const note of notes) {
    if (seen.includes(note.key)) continue;
    try {
      new Notification(`modo. · ${note.title}`, { body: note.body, icon: '/assets/icon.svg', tag: note.key });
      seen.push(note.key);
    } catch { /* the browser can refuse a notification without breaking the app */ }
  }
  if (seen.length > 200) seen = seen.slice(-200);
  try { localStorage.setItem(storageKey, JSON.stringify(seen)); } catch { /* storage can be full */ }
}
