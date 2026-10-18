import { Button, Empty, Filters, Hero } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';
import { dayTaskDone, TASK_CATEGORIES, taskCategory, taskDateForAction, taskOccurs, todayTasks } from '../lib/domain.js';
import { fmtDate, fmtTime, today } from '../lib/dates.js';

export function TasksPage() {
  const app = useApp();
  const d = today();
  let entries = [];
  if (app.taskFilter === 'Today') entries = todayTasks(app.db).map(task => ({ task, date: task.repeat === 'none' ? task.dueDate : d }));
  else if (app.taskFilter === 'Inbox') entries = app.db.tasks.filter(task => !task.dueDate).map(task => ({ task, date: d }));
  else if (app.taskFilter === 'Recurring') entries = app.db.tasks.filter(task => task.repeat !== 'none').map(task => ({ task, date: d }));
  else if (app.taskFilter === 'Completed') entries = app.db.tasks.filter(task => task.completedDates?.length).map(task => ({ task, date: task.completedDates.at(-1) }));
  else if (app.taskFilter === 'Upcoming') entries = app.db.tasks.filter(task => task.dueDate && task.dueDate > d).map(task => ({ task, date: task.dueDate }));
  else entries = app.db.tasks.map(task => ({ task, date: task.dueDate || d }));
  if (app.taskCategory !== 'All') entries = entries.filter(({ task }) => taskCategory(task) === app.taskCategory);
  const groups = TASK_CATEGORIES.map(cat => ({ cat, list: entries.filter(({ task }) => taskCategory(task) === cat) })).filter(group => group.list.length);
  const doneToday = app.db.tasks.filter(task => dayTaskDone(task, taskDateForAction(task, d))).length;

  return (
    <>
      <Hero kicker="Things to do" title="A little room to breathe." text="Organize tasks, reminders and recurring responsibilities in one place.">
        <Button onClick={() => app.openModal('task')}><Icon name="plus" size={16} /> New task</Button>
      </Hero>
      <div className="stat-row" style={{ marginBottom: 22 }}>
        <div className="stat-tile"><strong>{app.db.tasks.length}</strong><span>All tasks</span></div>
        <div className="stat-tile"><strong>{doneToday}</strong><span>Completed today</span></div>
        <div className="stat-tile"><strong>{app.db.tasks.filter(task => task.repeat !== 'none').length}</strong><span>Recurring</span></div>
      </div>
      <div className="card" style={{ marginBottom: 19 }}>
        <form className="inline-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get('title') || '').trim(); if (!title) return; app.saveTask({ title, notes: '', category: data.get('category') || 'Personal', priority: 'medium', dueDate: d, dueTime: '', repeat: 'none', reminder: 'none' }); event.currentTarget.reset(); }}>
          <input name="title" aria-label="Task name" placeholder="Add something to your list..." required maxLength={140} />
          <select name="category" aria-label="Category">{TASK_CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}</select>
          <Button type="submit"><Icon name="plus" size={15} /> Add</Button>
        </form>
      </div>
      <div className="spread" style={{ marginBottom: 8 }}>
        <Filters label="Task filters" values={['Today', 'Inbox', 'Upcoming', 'Recurring', 'Completed', 'All']} current={app.taskFilter} onChange={app.setTaskFilter} />
        <span className="tiny subtle">{entries.length} items</span>
      </div>
      <Filters label="Task categories" values={['All', ...TASK_CATEGORIES]} current={app.taskCategory} onChange={app.setTaskCategory} />
      <div style={{ height: 16 }} />
      {groups.length ? <div className="task-groups">{groups.map(group => (
        <section className="task-group" key={group.cat}>
          <h3 className="task-group-title">{group.cat} <span>{group.list.length}</span></h3>
          <div className="list">{group.list.map(({ task, date }) => {
            const key = taskDateForAction(task, date || d);
            const complete = dayTaskDone(task, key);
            return (
              <div className="list-item" key={task.id}>
                <button className={`checkmark${complete ? ' checked' : ''}`} aria-label={`${complete ? 'Uncomplete' : 'Complete'} ${task.title}`} onClick={() => app.toggleTask(task.id, date || d)}><Icon name="check" size={13} /></button>
                <div className={`list-item-main${complete ? ' done' : ''}`}>
                  <div className="list-item-title">{task.title}</div>
                  <p className="list-item-sub">{taskCategory(task)} · {task.dueDate ? fmtDate(task.dueDate) : 'Inbox'} {task.dueTime ? `· ${fmtTime(task.dueTime)}` : ''} {task.repeat !== 'none' ? `· Repeats ${task.repeat}` : ''}</p>
                </div>
                <span className={`priority-dot ${task.priority}`} title={`${task.priority} priority`} />
                <button className="icon-button" aria-label="Edit task" onClick={() => app.openModal('task', task.id)}><Icon name="edit" size={16} /></button>
              </div>
            );
          })}</div>
        </section>
      ))}</div> : <Empty title="Nothing in this view." text="Add a task whenever something comes to mind." action="Add a task" onAction={() => app.openModal('task')} />}
    </>
  );
}
