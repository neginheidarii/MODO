import { Button, Empty, Hero } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';
import { activeMode, allEventsForDate, modeDailyProgress, modeElapsed, ritualDone, ritualOccurs, todayTasks } from '../lib/domain.js';
import { fmtDate, fmtTime, greeting, pct, today } from '../lib/dates.js';

export function TodayPage() {
  const app = useApp();
  const d = today();
  const tasks = todayTasks(app.db);
  const rituals = app.db.rituals.filter(item => ritualOccurs(item, d));
  const mode = activeMode(app.db);
  const modeProgress = mode ? modeDailyProgress(app.db, mode, d) : null;
  const modeSoon = mode && d < mode.startDate;
  const events = allEventsForDate(app.db, d).slice(0, 4);
  const meal = app.db.mealPlans.find(item => item.date === d) || app.db.mealPlans.find(item => item.date > d);
  const done = tasks.filter(task => task.completedDates?.includes(task.repeat === 'none' ? task.dueDate || d : d)).length;

  return (
    <>
      <Hero kicker={greeting()} title="Today can be gentle." text="A short list, a little movement, and room for the people you care about.">
        <Button onClick={() => app.openModal('task')}><Icon name="plus" size={16} /> Add a task</Button>
      </Hero>
      <div className="stat-row" style={{ marginBottom: 22 }}>
        <div className="stat-tile"><strong>{tasks.length ? `${done}/${tasks.length}` : '0'}</strong><span>Tasks today</span></div>
        <div className="stat-tile"><strong>{rituals.filter(item => ritualDone(item, d)).length}/{rituals.length}</strong><span>Rituals</span></div>
        <div className="stat-tile"><strong>{!mode ? '—' : modeSoon ? 'Soon' : `${modeProgress.done}/${modeProgress.total}`}</strong><span>Mode</span></div>
      </div>
      <div className="grid-two">
        <div className="stack">
          <section className="card">
            <div className="section-heading"><h2>On your list</h2><button className="inline-link" onClick={() => app.go('tasks')}>All tasks <Icon name="arrowRight" size={14} /></button></div>
            {tasks.length ? tasks.slice(0, 6).map(task => {
              const key = task.repeat === 'none' ? task.dueDate || d : d;
              const complete = task.completedDates?.includes(key);
              return (
                <div className="check-row" key={task.id}>
                  <button className={`checkmark${complete ? ' checked' : ''}`} aria-label={`${complete ? 'Uncomplete' : 'Complete'} ${task.title}`} onClick={() => app.toggleTask(task.id, d)}><Icon name="check" size={13} /></button>
                  <div className={`check-row-main${complete ? ' done' : ''}`}><strong>{task.title}</strong><small>{task.category || 'Personal'}{task.dueTime ? ` · ${fmtTime(task.dueTime)}` : ''}</small></div>
                </div>
              );
            }) : <Empty title="Nothing pressing." text="Add a task when something needs a place." action="Add a task" onAction={() => app.openModal('task')} />}
          </section>
          <section className="card">
            <div className="section-heading"><h2>Rituals</h2><button className="inline-link" onClick={() => app.go('rituals')}>Open rituals <Icon name="arrowRight" size={14} /></button></div>
            {rituals.length ? rituals.map(ritual => {
              const complete = ritualDone(ritual, d);
              return (
                <div className="check-row" key={ritual.id}>
                  <button className={`checkmark${complete ? ' checked' : ''}`} aria-label={`${complete ? 'Uncomplete' : 'Complete'} ${ritual.name}`} onClick={() => app.toggleRitual(ritual.id, d)}><Icon name="check" size={13} /></button>
                  <div className={`check-row-main${complete ? ' done' : ''}`}><strong>{ritual.name}</strong><small>{ritual.target} {ritual.unit}</small></div>
                </div>
              );
            }) : <Empty title="No rituals yet." text="A small daily practice is enough." action="Add a ritual" onAction={() => app.openModal('ritual')} />}
          </section>
        </div>
        <div className="stack">
          <section className="card">
            <div className="section-heading"><h2>Coming up</h2><button className="inline-link" onClick={() => app.go('calendar')}>Calendar <Icon name="arrowRight" size={14} /></button></div>
            {events.length ? events.map(event => (
              <button className="event-item" key={`${event.source}-${event.id}`} onClick={() => app.openModal(event.type === 'task' ? 'task' : event.type === 'meal' ? 'mealplan' : event.source === 'meetup' ? 'meetup' : 'event', event.linkedId || event.id)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0 }}>
                <div className="leading-icon"><Icon name={event.type === 'task' ? 'tasks' : event.type === 'meal' ? 'meals' : 'calendar'} size={18} /></div>
                <div><strong style={{ fontSize: 13 }}>{event.title}</strong><div className="event-meta">{event.time ? fmtTime(event.time) : 'Anytime'}</div></div>
              </button>
            )) : <Empty title="The day is open." text="Nothing else is scheduled." />}
          </section>
          <section className={mode ? 'card-olive' : 'card'}>
            <div className="section-heading"><h2>{mode ? mode.title : 'Your mode'}</h2></div>
            {mode ? (
              <>
                <p>{mode.description || 'Your goals. Your rules.'}</p>
                <div className="spread" style={{ marginTop: 12 }}><span>{modeSoon ? `Starts ${fmtDate(mode.startDate, { month: 'long', day: 'numeric' })}` : `Day ${modeElapsed(mode)} of ${mode.duration}`}</span><span>{pct(modeElapsed(mode), mode.duration)}%</span></div>
                <div className="progress"><span style={{ width: `${pct(modeElapsed(mode), mode.duration)}%` }} /></div>
                <Button variant="soft" small onClick={() => app.go('modes')} style={{ marginTop: 14 }}>Open mode</Button>
              </>
            ) : <Empty title="No active mode." text="A challenge can hold the commitments you choose." action="Create a mode" onAction={() => app.openModal('mode')} />}
          </section>
          <section className="card">
            <div className="section-heading"><h2>On the menu</h2><button className="inline-link" onClick={() => app.go('meals')}>Kitchen <Icon name="arrowRight" size={14} /></button></div>
            {meal ? <h3 style={{ fontSize: 15 }}>{app.db.recipes.find(item => item.id === meal.recipeId)?.name || 'Planned meal'}</h3> : <Empty title="What are we cooking?" text="Plan something for later." action="Plan a meal" onAction={() => app.openModal('mealplan')} />}
          </section>
        </div>
      </div>
    </>
  );
}
