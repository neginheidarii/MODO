import { useState } from 'react';
import { Button, Hero } from '../components/ui.jsx';
import { useApp } from '../context/AppState.jsx';
import { eventsToICS, expandICS, parseICS } from '../lib/ics.js';
import { today, uid } from '../lib/dates.js';

export function SettingsPage() {
  const app = useApp();
  const settings = app.db.settings;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  function patch(partial, message) {
    app.update(next => { Object.assign(next.settings, partial); }, message);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(app.db, null, 2)], { type: 'application/json' });
    download(blob, `modo-backup-${today()}.json`);
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const keys = ['tasks', 'events', 'people', 'meetups', 'rituals', 'modes', 'recipes', 'mealPlans'];
      if (data.version !== 1 || !keys.every(key => Array.isArray(data[key])) || !data.settings) { app.notify('This is not a supported MODO backup.'); return; }
      app.askConfirm({ title: 'Replace your workspace?', text: 'This backup will take the place of everything currently saved. Continue only if you meant to replace it.', confirmLabel: 'Replace workspace', run: () => app.replaceWorkspace(data) });
    } catch { app.notify('Could not read that backup file.'); }
  }

  function exportICS() {
    download(new Blob([eventsToICS(app.db.events)], { type: 'text/calendar' }), `modo-${today()}.ics`);
  }

  async function importICS(file) {
    if (!file) return;
    if (file.size > 3_000_000) { app.notify('Please choose an ICS file under 3 MB.'); return; }
    try {
      const items = expandICS(parseICS(await file.text())).slice(0, 500);
      if (!items.length) { app.notify('No readable events found.'); return; }
      app.update(next => {
        for (const raw of items) {
          if (next.events.some(event => event.source === 'ics' && event.externalId === raw.externalId)) continue;
          next.events.push({ id: uid('event'), ...raw, source: 'ics', readonly: true });
        }
      }, `Imported ${items.length} calendar items.`);
    } catch { app.notify('Could not read the calendar file.'); }
  }

  async function askNotifications() {
    if (!('Notification' in window)) { app.notify('This browser does not support notifications.'); return; }
    const permission = await Notification.requestPermission();
    patch({ notifications: permission === 'granted' }, permission === 'granted' ? 'Notifications on while MODO is open.' : 'Notifications stay off.');
  }

  return (
    <>
      <Hero kicker="Make MODO yours" title="Settings and preferences." text="Appearance, reminders, your data, and the account that keeps this space private." />
      <div className="grid-two">
        <div className="stack">
          <section className="card">
            <h2>Appearance</h2>
            <div className="setting-row"><div><strong>Color mode</strong><p>Olive and linen, in light, dark, or system appearance.</p></div>
              <select aria-label="Color mode" value={settings.theme} onChange={event => patch({ theme: event.target.value }, 'Appearance saved.')} style={{ width: 124 }}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select>
            </div>
            <div className="setting-row"><div><strong>Start of the week</strong><p>For your calendar.</p></div>
              <select aria-label="First day of week" value={settings.weekStart} onChange={event => patch({ weekStart: event.target.value }, 'Calendar preference updated.')} style={{ width: 120 }}><option value="monday">Monday</option><option value="sunday">Sunday</option></select>
            </div>
          </section>
          <section className="card">
            <h2>Reminders</h2>
            <div className="setting-row"><div><strong>Browser notifications</strong><p>Alerts while MODO is open, outside quiet hours.</p></div>
              <button className={`switch${settings.notifications ? ' on' : ''}`} aria-pressed={settings.notifications} onClick={() => settings.notifications ? patch({ notifications: false }, 'Notifications off.') : askNotifications()}><span /></button>
            </div>
            <div className="setting-row"><div><strong>Quiet hours</strong></div>
              <div style={{ display: 'flex', gap: 8 }}><input type="time" aria-label="Quiet hours start" value={settings.quietStart} onChange={event => patch({ quietStart: event.target.value }, 'Quiet hours saved.')} /><input type="time" aria-label="Quiet hours end" value={settings.quietEnd} onChange={event => patch({ quietEnd: event.target.value }, 'Quiet hours saved.')} /></div>
            </div>
          </section>
          <section className="card">
            <h2>Your data</h2>
            <div className="spread" style={{ flexWrap: 'wrap', gap: 8 }}>
              <Button variant="outline" small onClick={exportJSON}>Export JSON</Button>
              <Button variant="outline" small onClick={exportICS}>Export calendar</Button>
              <label className="button button-soft small">Import JSON<input type="file" accept="application/json" hidden onChange={event => importJSON(event.target.files?.[0])} /></label>
              <label className="button button-soft small">Import ICS<input type="file" accept=".ics,text/calendar" hidden onChange={event => importICS(event.target.files?.[0])} /></label>
            </div>
          </section>
        </div>
        <div className="stack">
          <section className="card">
            <h2>Account</h2>
            <p className="account-summary"><strong>{app.user?.name}</strong><span>{app.user?.email}</span></p>
            <form className="account-security-form" onSubmit={async event => { event.preventDefault(); try { await app.changePassword(currentPassword, newPassword); setCurrentPassword(''); setNewPassword(''); } catch (err) { app.notify(err.message); } }}>
              <label>Current password<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required minLength={12} /></label>
              <label>New password<input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} required minLength={12} /></label>
              <Button type="submit">Change password</Button>
            </form>
            <form className="account-security-form" onSubmit={event => { event.preventDefault(); app.askConfirm({ title: 'Delete your account?', text: 'Your account and everything saved in it will be permanently deleted. Continue only if you meant to delete it.', confirmLabel: 'Delete account', run: () => app.deleteAccount(deletePassword) }); }}>
              <label>Password to delete account<input type="password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} required /></label>
              <Button type="submit" variant="danger">Delete account</Button>
            </form>
            <Button variant="outline" onClick={app.logout}>Sign out</Button>
          </section>
        </div>
      </div>
    </>
  );
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
