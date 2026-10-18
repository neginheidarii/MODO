import { Empty, Hero } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';

export function SearchPage() {
  const app = useApp();
  const q = app.search.trim().toLowerCase();
  const records = [
    ...app.db.tasks.map(item => ({ type: 'Task', name: item.title, page: 'tasks' })),
    ...app.db.people.map(item => ({ type: 'Person', name: item.name, page: 'people' })),
    ...app.db.modes.map(item => ({ type: 'Mode', name: item.title, page: 'modes' })),
    ...app.db.rituals.map(item => ({ type: 'Ritual', name: item.name, page: 'rituals' })),
    ...app.db.recipes.map(item => ({ type: 'Recipe', name: item.name, page: 'meals' })),
    ...app.db.events.map(item => ({ type: 'Event', name: item.title, page: 'calendar' }))
  ].filter(item => q && `${item.name} ${item.type}`.toLowerCase().includes(q));

  return (
    <>
      <Hero kicker="Find what matters" title="Search MODO." text="Tasks, people, challenges, rituals, recipes and events." />
      <div className="card">
        <form className="inline-form" onSubmit={event => event.preventDefault()}>
          <input aria-label="Search all MODO" value={app.search} onChange={event => app.setSearch(event.target.value)} placeholder="Search your workspace..." autoFocus />
        </form>
      </div>
      <div className="list" style={{ marginTop: 18 }}>
        {q ? records.map(record => (
          <button className="list-item" key={`${record.type}-${record.name}`} style={{ width: '100%', textAlign: 'left' }} onClick={() => app.go(record.page)}>
            <span className="leading-icon"><Icon name="search" size={17} /></span>
            <span className="list-item-main"><strong className="list-item-title">{record.name}</strong><span className="list-item-sub">{record.type}</span></span>
          </button>
        )) : null}
        {q && !records.length && <Empty title="No matches." text="Try another word." />}
        {!q && <Empty title="Something on your mind?" text="Search anything you have saved." />}
      </div>
    </>
  );
}
