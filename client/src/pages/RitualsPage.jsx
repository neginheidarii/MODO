import { Button, Empty, Hero } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';
import { ritualDone, ritualOccurs } from '../lib/domain.js';
import { today } from '../lib/dates.js';

export function RitualsPage() {
  const app = useApp();
  const d = today();
  return (
    <>
      <Hero kicker="Rituals" title="Small practices, kept gently." text="A target for the days you choose. Check it off when you have done enough.">
        <Button onClick={() => app.openModal('ritual')}><Icon name="plus" size={16} /> New ritual</Button>
      </Hero>
      <div className="list card">
        {app.db.rituals.length ? app.db.rituals.map(ritual => {
          const due = ritualOccurs(ritual, d);
          const done = ritualDone(ritual, d);
          return (
            <div className="list-item" key={ritual.id}>
              {due ? <button className={`checkmark${done ? ' checked' : ''}`} aria-label={`${done ? 'Uncomplete' : 'Complete'} ${ritual.name}`} onClick={() => app.toggleRitual(ritual.id, d)}><Icon name="check" size={13} /></button> : <span className="checkmark" style={{ opacity: .35 }}>–</span>}
              <div className={`list-item-main${done ? ' done' : ''}`}>
                <div className="list-item-title">{ritual.name}</div>
                <p className="list-item-sub">{ritual.group} · {ritual.target} {ritual.unit} · {ritual.schedule === 'weekdays' ? 'Weekdays' : 'Every day'}</p>
              </div>
              <button className="icon-button" aria-label="Edit ritual" onClick={() => app.openModal('ritual', ritual.id)}><Icon name="edit" size={16} /></button>
            </div>
          );
        }) : <Empty title="No rituals yet." text="Start with one thing you want to return to." action="Add a ritual" onAction={() => app.openModal('ritual')} />}
      </div>
    </>
  );
}
