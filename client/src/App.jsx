import { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppState.jsx';
import { applyProviderEvents } from './lib/calendarSync.js';
import { checkReminders } from './lib/reminders.js';
import { AuthScreen } from './components/AuthScreen.jsx';
import { Shell } from './components/Shell.jsx';
import { ModalHost } from './components/Forms.jsx';
import { ConfirmDialog } from './components/ui.jsx';
import { TodayPage } from './pages/TodayPage.jsx';
import { TasksPage } from './pages/TasksPage.jsx';
import { CalendarPage } from './pages/CalendarPage.jsx';
import { PeoplePage } from './pages/PeoplePage.jsx';
import { ModesPage } from './pages/ModesPage.jsx';
import { RitualsPage } from './pages/RitualsPage.jsx';
import { MealsPage } from './pages/MealsPage.jsx';
import { InsightsPage } from './pages/InsightsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { MorePage } from './pages/MorePage.jsx';
import { SearchPage } from './pages/SearchPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';

function Boot({ message, onRetry }) {
  return (
    <div className="boot-screen">
      <div className="boot-logo">modo.</div>
      <p>{message || 'Opening your space...'}</p>
      {onRetry && <button className="button button-primary" onClick={onRetry}>Retry connection</button>}
    </div>
  );
}

function Pages() {
  const app = useApp();
  const page = {
    today: TodayPage, tasks: TasksPage, calendar: CalendarPage, people: PeoplePage, modes: ModesPage,
    rituals: RitualsPage, meals: MealsPage, insights: InsightsPage, settings: SettingsPage,
    more: MorePage, search: SearchPage, notifications: NotificationsPage
  }[app.page] || TodayPage;
  const Page = page;
  return <Page />;
}

function MicrosoftReturn() {
  const app = useApp();
  const started = useRef(false);
  useEffect(() => {
    if (app.status !== 'ready' || started.current) return;
    const params = new URLSearchParams(location.search);
    if (!params.has('code') && !params.has('state') && !params.has('error')) return;
    started.current = true;
    const connectors = window.ModoConnectors;
    if (!connectors?.microsoftFinish) return;
    (async () => {
      try {
        const done = await connectors.microsoftFinish();
        if (!done) return;
        if (done.clientId !== app.db.connections.outlook.clientId) {
          app.notify('Microsoft client ID changed since sign-in began. Please reconnect.');
          return;
        }
        const result = await connectors.outlookLoad();
        app.update(next => applyProviderEvents(next, 'outlook', result), 'Microsoft authorization complete.');
        app.go('calendar');
      } catch (err) {
        app.notify(`Microsoft sign-in failed: ${err.message}`);
      }
    })();
  }, [app.status]);
  return null;
}

function Reminders() {
  const app = useApp();
  useEffect(() => {
    if (app.status !== 'ready') return undefined;
    const tick = () => checkReminders(app.db, app.user?.id);
    const first = window.setTimeout(tick, 1000);
    const later = window.setInterval(tick, 30_000);
    return () => { window.clearTimeout(first); window.clearInterval(later); };
  }, [app.status, app.db, app.user?.id]);
  return null;
}

function Root() {
  const app = useApp();
  if (app.status === 'loading') return <Boot />;
  if (app.status === 'error') return <Boot message={app.error} onRetry={app.bootstrap} />;
  if (app.status === 'auth') return <AuthScreen onAuthed={app.bootstrap} />;
  return (
    <>
      <MicrosoftReturn />
      <Reminders />
      <Shell><Pages /></Shell>
      <ModalHost />
      {app.confirm && <ConfirmDialog title={app.confirm.title} text={app.confirm.text} confirmLabel={app.confirm.confirmLabel} onCancel={app.dismissConfirm} onConfirm={app.acceptConfirm} />}
      <div id="toast-region" aria-live="polite">{app.toast && <div className="toast">{app.toast}</div>}</div>
      {app.syncError && <div className="sync-alert" role="status">{app.syncError}</div>}
    </>
  );
}

export default function App() {
  return <AppProvider><Root /></AppProvider>;
}
