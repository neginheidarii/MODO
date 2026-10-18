import { Empty, Hero } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';
import { dayTaskDone, taskDateForAction, todayTasks } from '../lib/domain.js';
import { fmtDate, fmtTime, today } from '../lib/dates.js';

export function NotificationsPage() {
  const app = useApp();
  const d = today();
  const tasks = todayTasks(app.db).filter(task => !dayTaskDone(task, taskDateForAction(task, d)));
  const meetups = app.db.meetups.filter(item => item.status === 'scheduled' && item.date >= d);
  return (
    <>
      <Hero kicker="Gentle reminders" title="Your notifications." text="Upcoming tasks and meetings from the plans you have saved." />
      <div className="card">
        {tasks.length + meetups.length ? (
          <>
            {tasks.map(task => <div className="event-item" key={task.id}><div className="leading-icon"><Icon name="tasks" size={18} /></div><div><strong>{task.title}</strong><div className="event-meta">Task · {task.dueTime ? fmtTime(task.dueTime) : 'Today'}</div></div></div>)}
            {meetups.map(item => <div className="event-item" key={item.id}><div className="leading-icon"><Icon name="people" size={18} /></div><div><strong>{item.title}</strong><div className="event-meta">{fmtDate(item.date)} · {fmtTime(item.time)}</div></div></div>)}
          </>
        ) : <Empty title="All quiet for now." text="Nothing pressing needs your attention." />}
      </div>
    </>
  );
}
