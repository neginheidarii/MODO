import { Button, Empty, Hero } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';
import { allEventsForDate, monthMatrix } from '../lib/domain.js';
import { addDays, fmtDate, fmtTime, today, weekdayName } from '../lib/dates.js';

export function CalendarPage() {
  const app = useApp();
  const days = monthMatrix(app.calMonth, app.db.settings.weekStart);
  const names = app.db.settings.weekStart === 'monday' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selected = allEventsForDate(app.db, app.calDay);
  const shift = (dir) => {
    const [y, m] = app.calMonth.split('-').map(Number);
    const next = new Date(y, m - 1 + dir, 1);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
    app.setCalMonth(key);
  };

  return (
    <>
      <Hero kicker="Your time" title="A calmer calendar." text="MODO events, tasks and meals, with room for the calendars you connect.">
        <Button onClick={() => app.openModal('event')}><Icon name="plus" size={16} /> Add event</Button>
        <Button variant="outline" onClick={() => app.openModal('connections')}>Connections</Button>
      </Hero>
      <div className="calendar-layout">
        <section className="card">
          <div className="calendar-toolbar">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="icon-button tinted" aria-label="Previous month" onClick={() => shift(-1)}><Icon name="chevronLeft" size={16} /></button>
              <button className="icon-button tinted" aria-label="Next month" onClick={() => shift(1)}><Icon name="chevronRight" size={16} /></button>
              <strong className="calendar-title">{fmtDate(app.calMonth, { month: 'long', year: 'numeric' })}</strong>
            </div>
            <Button variant="soft" small onClick={() => { app.setCalDay(today()); app.setCalMonth(`${today().slice(0, 7)}-01`); }}>Today</Button>
          </div>
          <div className="calendar-month" style={{ marginTop: 12 }}>
            {names.map(name => <div className="calendar-week-label" key={name}>{name}</div>)}
            {days.map(day => {
              const items = allEventsForDate(app.db, day);
              return (
                <button key={day} className={`calendar-cell${day.slice(0, 7) !== app.calMonth.slice(0, 7) ? ' other' : ''}${day === app.calDay ? ' selected' : ''}${day === today() ? ' today' : ''}`} onClick={() => app.setCalDay(day)}>
                  <span className="day-number">{Number(day.slice(-2))}</span>
                  {items.slice(0, 3).map(item => <span className={`mini-event ${item.source || ''}`} key={item.id}>{item.title}</span>)}
                  {items.length > 3 && <span className="calendar-count">+{items.length - 3}</span>}
                </button>
              );
            })}
          </div>
        </section>
        <aside className="card">
          <div className="eyebrow">{weekdayName(app.calDay).toUpperCase()}</div>
          <h2 style={{ marginTop: 6 }}>{fmtDate(app.calDay, { month: 'long', day: 'numeric' })}</h2>
          <div className="stack" style={{ marginTop: 14 }}>
            {selected.length ? selected.map(item => (
              <button key={`${item.source}-${item.id}`} className="event-item" style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0 }} onClick={() => app.openModal(item.type === 'task' ? 'task' : item.type === 'meal' ? 'mealplan' : item.source === 'meetup' ? 'meetup' : 'event', item.linkedId || item.id)}>
                <div className="leading-icon"><Icon name="calendar" size={18} /></div>
                <div><strong style={{ fontSize: 13 }}>{item.title}</strong><div className="event-meta">{item.time ? fmtTime(item.time) : 'Anytime'} · {item.source || 'modo'}</div></div>
              </button>
            )) : <Empty title="Nothing on this day." text="Add an event, or leave the space open." action="Add event" onAction={() => app.openModal('event')} />}
          </div>
          <div className="note" style={{ marginTop: 16 }}>The next two weeks include {Array.from({ length: 14 }, (_, i) => addDays(app.calDay, i)).reduce((sum, day) => sum + allEventsForDate(app.db, day).length, 0)} items.</div>
        </aside>
      </div>
    </>
  );
}
