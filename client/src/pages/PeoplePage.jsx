import { Button, Empty, Filters, Hero } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';
import { fmtDate, initials } from '../lib/dates.js';

function statusFor(db, person) {
  const meetings = db.meetups.filter(item => item.personId === person.id);
  if (meetings.some(item => item.status === 'scheduled')) return 'Scheduled';
  if (meetings.some(item => item.status === 'planning')) return 'Planning';
  if (meetings.some(item => item.status === 'completed')) return 'Met before';
  return 'Want to meet';
}

export function PeoplePage() {
  const app = useApp();
  const people = app.db.people.filter(person => app.peopleFilter === 'All' || statusFor(app.db, person) === app.peopleFilter);
  return (
    <>
      <Hero kicker="People" title="The ones you want to see." text="Keep a private list of people, and the plans you make with them.">
        <Button onClick={() => app.openModal('person')}><Icon name="plus" size={16} /> Add someone</Button>
      </Hero>
      <Filters label="People" values={['All', 'Want to meet', 'Planning', 'Scheduled', 'Met before']} current={app.peopleFilter} onChange={app.setPeopleFilter} />
      <div style={{ height: 16 }} />
      {people.length ? <div className="person-grid">{people.map(person => {
        const next = app.db.meetups.find(item => item.personId === person.id && item.status === 'scheduled');
        return (
          <article className="card person-card" key={person.id}>
            <div className="spread"><div className="person-avatar">{initials(person.name)}</div><span className={`pill${next ? ' success' : ''}`}>{statusFor(app.db, person)}</span></div>
            <h3>{person.name}</h3>
            <p>{person.category}</p>
            <p>{person.notes || 'A connection worth making time for.'}</p>
            {next && <p className="small-text subtle">{next.title} · {fmtDate(next.date)}</p>}
            <div className="spread" style={{ marginTop: 12 }}>
              <Button variant="soft" small onClick={() => app.openModal('meetup', null, { personId: person.id })}>Plan a meetup</Button>
              <button className="icon-button" aria-label="Edit person" onClick={() => app.openModal('person', person.id)}><Icon name="edit" size={16} /></button>
            </div>
          </article>
        );
      })}</div> : <Empty title="Your people list is quiet." text="Add someone you want to stay close to." action="Add someone" onAction={() => app.openModal('person')} />}
    </>
  );
}
