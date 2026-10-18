import { useState } from 'react';
import { Button, Field, Modal, Select } from './ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';
import { fetchCalendarFeed } from '../api.js';
import { applyProviderEvents } from '../lib/calendarSync.js';
import { TASK_CATEGORIES, ruleIsCheck } from '../lib/domain.js';
import { expandICS, parseICS } from '../lib/ics.js';
import { today, uid } from '../lib/dates.js';

export function ModalHost() {
  const app = useApp();
  if (!app.modal) return null;
  const { kind, id } = app.modal;
  const close = app.closeModal;
  if (kind === 'quick') return <QuickAdd />;
  if (kind === 'task') return <TaskForm id={id} />;
  if (kind === 'event') return <EventForm id={id} />;
  if (kind === 'person') return <PersonForm id={id} />;
  if (kind === 'meetup') return <MeetupForm id={id} personId={app.modal.personId} />;
  if (kind === 'ritual') return <RitualForm id={id} />;
  if (kind === 'mode') return <ModeForm id={id} />;
  if (kind === 'recipe') return <RecipeForm id={id} />;
  if (kind === 'mealplan') return <MealPlanForm id={id} />;
  if (kind === 'connections') return <Connections onClose={close} />;
  return null;
}

function QuickAdd() {
  const app = useApp();
  const items = [['task', 'Task', 'tasks'], ['event', 'Calendar event', 'calendar'], ['person', 'Person', 'people'], ['mode', 'Mode', 'target'], ['ritual', 'Ritual', 'sun'], ['recipe', 'Recipe', 'meals'], ['meetup', 'Meetup', 'coffee'], ['mealplan', 'Meal plan', 'calendarPlus']];
  return (
    <Modal title="A little something to add." subtitle="Choose what you would like to create." onClose={app.closeModal}>
      <div className="more-grid">{items.map(([kind, title, icon]) => <button className="more-tile" key={kind} onClick={() => app.openModal(kind)}><Icon name={icon} size={23} /><strong>{title}</strong></button>)}</div>
    </Modal>
  );
}

function TaskForm({ id }) {
  const app = useApp();
  const existing = app.db.tasks.find(item => item.id === id);
  const [form, setForm] = useState(existing || { title: '', notes: '', category: 'Personal', priority: 'medium', dueDate: today(), dueTime: '', repeat: 'none', reminder: 'none' });
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  return (
    <Modal title={existing ? 'Edit task' : 'Create a task'} subtitle="Keep it simple, or add the details you need." onClose={app.closeModal}>
      <form className="form-grid" onSubmit={event => { event.preventDefault(); if (!form.title.trim()) return; app.saveTask({ ...form, title: form.title.trim(), completedDates: existing?.completedDates || [] }, id); }}>
        <div className="full"><Field label="Task title"><input value={form.title} onChange={set('title')} required maxLength={140} /></Field></div>
        <div className="full"><Field label="Notes"><textarea rows={3} value={form.notes} onChange={set('notes')} /></Field></div>
        <Field label="Category"><Select value={form.category} onChange={set('category')} options={TASK_CATEGORIES} /></Field>
        <Field label="Priority"><Select value={form.priority} onChange={set('priority')} options={['low', 'medium', 'high']} /></Field>
        <Field label="Date"><input type="date" value={form.dueDate} onChange={set('dueDate')} /></Field>
        <Field label="Time"><input type="time" value={form.dueTime} onChange={set('dueTime')} /></Field>
        <Field label="Repeat"><Select value={form.repeat} onChange={set('repeat')} options={[['none', 'Does not repeat'], ['daily', 'Every day'], ['weekdays', 'Weekdays'], ['weekly', 'Weekly'], ['monthly', 'Monthly']]} /></Field>
        <Field label="Reminder"><Select value={form.reminder || 'none'} onChange={set('reminder')} options={[['none', 'No reminder'], ['0', 'At task time'], ['15', '15 minutes before'], ['60', '1 hour before'], ['1440', '1 day before']]} /></Field>
        <div className="form-actions">
          {existing && <Button variant="danger" onClick={() => app.deleteTask(id)}>Delete</Button>}
          <Button type="submit">{existing ? 'Save task' : 'Add task'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function EventForm({ id }) {
  const app = useApp();
  const existing = app.db.events.find(item => item.id === id);
  const [form, setForm] = useState(existing || { title: '', date: app.calDay || today(), time: '09:00', endTime: '10:00', location: '', notes: '' });
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  return (
    <Modal title={existing ? 'Edit event' : 'Add an event'} subtitle="This stays on your MODO calendar." onClose={app.closeModal}>
      <form className="form-grid" onSubmit={event => { event.preventDefault(); if (!form.title.trim() || !form.date) return; if (form.endTime && form.time && form.endTime <= form.time) { app.notify('End time must come after the start.'); return; } app.saveEvent({ ...form, title: form.title.trim(), source: existing?.source || 'modo', readonly: false }, id); }}>
        <div className="full"><Field label="Title"><input value={form.title} onChange={set('title')} required maxLength={140} /></Field></div>
        <Field label="Date"><input type="date" value={form.date} onChange={set('date')} required /></Field>
        <Field label="Start"><input type="time" value={form.time} onChange={set('time')} /></Field>
        <Field label="End"><input type="time" value={form.endTime} onChange={set('endTime')} /></Field>
        <Field label="Location"><input value={form.location || ''} onChange={set('location')} /></Field>
        <div className="full"><Field label="Notes"><textarea rows={3} value={form.notes || ''} onChange={set('notes')} /></Field></div>
        <div className="form-actions">{existing && <Button variant="danger" onClick={() => app.deleteEvent(id)}>Delete</Button>}<Button type="submit">Save event</Button></div>
      </form>
    </Modal>
  );
}

function PersonForm({ id }) {
  const app = useApp();
  const existing = app.db.people.find(item => item.id === id);
  const [form, setForm] = useState(existing || { name: '', category: 'Friends', email: '', notes: '', followUp: '' });
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  return (
    <Modal title={existing ? 'Edit person' : 'Add someone'} subtitle="Your personal connections stay on your account." onClose={app.closeModal}>
      <form className="form-grid" onSubmit={event => { event.preventDefault(); if (!form.name.trim()) return; app.savePerson({ ...form, name: form.name.trim() }, id); }}>
        <div className="full"><Field label="Name"><input value={form.name} onChange={set('name')} required maxLength={100} /></Field></div>
        <Field label="Connection"><Select value={form.category} onChange={set('category')} options={['Friends', 'Family', 'Colleagues', 'Mentors', 'Other']} /></Field>
        <Field label="Email"><input type="email" value={form.email || ''} onChange={set('email')} /></Field>
        <div className="full"><Field label="Notes"><textarea rows={3} value={form.notes || ''} onChange={set('notes')} /></Field></div>
        <Field label="Reconnect on"><input type="date" value={form.followUp || ''} onChange={set('followUp')} /></Field>
        <div className="form-actions">{existing && <Button variant="danger" onClick={() => app.deletePerson(id)}>Delete</Button>}<Button type="submit">Save</Button></div>
      </form>
    </Modal>
  );
}

function MeetupForm({ id, personId }) {
  const app = useApp();
  const existing = app.db.meetups.find(item => item.id === id);
  const [form, setForm] = useState(existing || { personId: personId || app.db.people[0]?.id || '', title: 'Coffee and catch-up', date: today(), time: '11:00', endTime: '12:00', location: '', status: 'scheduled', notes: '' });
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  if (!app.db.people.length) return <Modal title="Plan a meetup" subtitle="Add a person first." onClose={app.closeModal}><Button onClick={() => app.openModal('person')}>Add someone</Button></Modal>;
  return (
    <Modal title={existing ? 'Edit meetup' : 'Plan a meetup'} subtitle="A confirmed meetup is added to your calendar." onClose={app.closeModal}>
      <form className="form-grid" onSubmit={event => { event.preventDefault(); if (!form.title.trim()) return; app.saveMeetup(form, id); }}>
        <div className="full"><Field label="Who"><Select value={form.personId} onChange={set('personId')} options={app.db.people.map(person => [person.id, person.name])} /></Field></div>
        <div className="full"><Field label="Title"><input value={form.title} onChange={set('title')} required /></Field></div>
        <Field label="Date"><input type="date" value={form.date} onChange={set('date')} /></Field>
        <Field label="Start"><input type="time" value={form.time} onChange={set('time')} /></Field>
        <Field label="End"><input type="time" value={form.endTime} onChange={set('endTime')} /></Field>
        <Field label="Status"><Select value={form.status} onChange={set('status')} options={[['planning', 'Still planning'], ['scheduled', 'Confirmed'], ['completed', 'Already met'], ['cancelled', 'Cancelled']]} /></Field>
        <div className="full"><Field label="Location"><input value={form.location || ''} onChange={set('location')} /></Field></div>
        <div className="form-actions">{existing && <Button variant="danger" onClick={() => app.deleteMeetup(id)}>Delete</Button>}<Button type="submit">Save meetup</Button></div>
      </form>
    </Modal>
  );
}

function RitualForm({ id }) {
  const app = useApp();
  const existing = app.db.rituals.find(item => item.id === id);
  const [form, setForm] = useState(existing || { name: '', group: 'Anytime', schedule: 'daily', target: 1, unit: 'times', notes: '' });
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  return (
    <Modal title={existing ? 'Edit ritual' : 'Create a ritual'} subtitle="A small practice you can return to." onClose={app.closeModal}>
      <form className="form-grid" onSubmit={event => { event.preventDefault(); if (!form.name.trim() || !(Number(form.target) > 0)) return; app.saveRitual({ ...form, name: form.name.trim(), target: Number(form.target), logs: existing?.logs || {} }, id); }}>
        <div className="full"><Field label="Name"><input value={form.name} onChange={set('name')} required /></Field></div>
        <Field label="Time of day"><Select value={form.group} onChange={set('group')} options={['Morning', 'Evening', 'Anytime']} /></Field>
        <Field label="Schedule"><Select value={form.schedule} onChange={set('schedule')} options={[['daily', 'Every day'], ['weekdays', 'Weekdays']]} /></Field>
        <Field label="Target"><input type="number" min="0.1" step="0.1" value={form.target} onChange={set('target')} required /></Field>
        <Field label="Unit"><input value={form.unit} onChange={set('unit')} maxLength={30} /></Field>
        <div className="form-actions">{existing && <Button variant="danger" onClick={() => app.deleteRitual(id)}>Delete</Button>}<Button type="submit">Save ritual</Button></div>
      </form>
    </Modal>
  );
}

function ModeForm({ id }) {
  const app = useApp();
  const existing = app.db.modes.find(item => item.id === id);
  const [base, setBase] = useState(existing || { title: '', description: '', duration: 75, startDate: today(), policy: 'flexible' });
  const [rules, setRules] = useState(existing ? existing.rules.map(rule => ({ ...rule, kind: rule.kind === 'check' ? 'check' : 'amount' })) : [
    { id: uid('rule'), title: 'Move your body', kind: 'amount', target: 45, unit: 'minutes', ritualId: '' },
    { id: uid('rule'), title: 'Vitamins', kind: 'check', target: 1, unit: '', ritualId: '' }
  ]);
  const set = key => event => setBase(current => ({ ...current, [key]: event.target.value }));
  function save(event) {
    event.preventDefault();
    const named = rules.filter(rule => rule.title.trim());
    if (named.some(rule => !ruleIsCheck(rule) && !(Number(rule.target) > 0))) { app.notify('Add an amount for commitments that track time or a count.'); return; }
    const duration = Number(base.duration);
    if (!base.title.trim() || !base.startDate || !named.length || !Number.isInteger(duration) || duration < 1) { app.notify('Add a title, start date, duration and at least one commitment.'); return; }
    app.saveMode({
      id: existing?.id || uid('mode'), existing: Boolean(existing), title: base.title.trim(), description: base.description || '', duration, startDate: base.startDate, policy: base.policy || 'flexible', status: existing?.status || 'active', logs: existing?.logs || {},
      rules: named.map(rule => ({ ...rule, title: rule.title.trim(), kind: ruleIsCheck(rule) ? 'check' : 'amount', target: ruleIsCheck(rule) ? 1 : Number(rule.target), unit: ruleIsCheck(rule) ? '' : String(rule.unit || '').trim(), ritualId: rule.ritualId || '' }))
    });
  }
  return (
    <Modal title={existing ? 'Edit your mode' : 'Create your mode'} subtitle="Name the challenge, then add the commitments that belong in it." wide onClose={app.closeModal}>
      <form onSubmit={save}>
        <div className="form-grid">
          <div className="full"><Field label="Challenge name"><input value={base.title} onChange={set('title')} required maxLength={140} /></Field></div>
          <div className="full"><Field label="Description"><textarea rows={2} value={base.description || ''} onChange={set('description')} /></Field></div>
          <Field label="Duration in days"><input type="number" min="1" max="3650" value={base.duration} onChange={set('duration')} required /></Field>
          <Field label="Start date"><input type="date" value={base.startDate} onChange={set('startDate')} required /></Field>
          <Field label="Approach"><Select value={base.policy || 'flexible'} onChange={set('policy')} options={[['flexible', 'Flexible'], ['streak', 'Streak'], ['strict', 'Strict']]} /></Field>
        </div>
        <div className="spread" style={{ margin: '20px 0 10px' }}><strong>Daily commitments</strong><Button variant="soft" small onClick={() => setRules(current => [...current, { id: uid('rule'), title: '', kind: 'check', target: 1, unit: '', ritualId: '' }])}>Add commitment</Button></div>
        <div className="rule-builder">
          {rules.map((rule, index) => (
            <div className="rule-block" key={rule.id}>
              <div className="rule-editor">
                <input aria-label={`Commitment ${index + 1}`} value={rule.title} placeholder="e.g. No smoking" maxLength={140} onChange={event => setRules(current => current.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} />
                <Select label="How to track" value={rule.kind} onChange={event => setRules(current => current.map((item, i) => i === index ? { ...item, kind: event.target.value, target: event.target.value === 'amount' ? (Number(item.target) || 1) : 1, unit: event.target.value === 'amount' ? (item.unit || 'minutes') : '' } : item))} options={[['check', 'Check off'], ['amount', 'Time or count']]} />
                <button className="icon-button" type="button" aria-label="Remove commitment" onClick={() => {
                  const title = rule.title.trim();
                  if (!title) { setRules(current => current.filter(item => item.id !== rule.id)); return; }
                  app.askConfirm({ title: 'Remove this commitment?', text: `“${title}” will leave this mode when you save. Continue only if you meant to remove it.`, confirmLabel: 'Remove commitment', run: () => setRules(current => current.filter(item => item.id !== rule.id)) });
                }}><Icon name="close" size={17} /></button>
              </div>
              {rule.kind !== 'check' && (
                <div className="rule-measure">
                  <input aria-label="Amount" type="number" min="0.1" step="0.1" value={rule.target} onChange={event => setRules(current => current.map((item, i) => i === index ? { ...item, target: event.target.value } : item))} />
                  <input aria-label="Unit" value={rule.unit} placeholder="minutes, litres, pages" maxLength={30} onChange={event => setRules(current => current.map((item, i) => i === index ? { ...item, unit: event.target.value } : item))} />
                </div>
              )}
              <Select label="Link to ritual" value={rule.ritualId || ''} onChange={event => setRules(current => current.map((item, i) => i === index ? { ...item, ritualId: event.target.value } : item))} options={[['', 'Independent commitment'], ...app.db.rituals.map(ritual => [ritual.id, `Link ritual: ${ritual.name}`])]} />
            </div>
          ))}
        </div>
        <p className="note" style={{ marginTop: 14 }}>Check off is a yes or no, such as vitamins, a healthy meal, or no smoking. Time or count is for minutes, litres, or a number.</p>
        <div className="form-actions">{existing && <Button variant="danger" onClick={() => app.deleteMode(existing.id)}>Delete</Button>}<Button type="submit">{existing ? 'Save mode' : 'Create my mode'}</Button></div>
      </form>
    </Modal>
  );
}

function RecipeForm({ id }) {
  const app = useApp();
  const existing = app.db.recipes.find(item => item.id === id);
  const [form, setForm] = useState({
    name: existing?.name || '', cuisine: existing?.cuisine || '', minutes: existing?.minutes || 30, rating: existing?.rating || 0,
    tags: (existing?.tags || []).join(', '), ingredients: (existing?.ingredients || []).join('\n'), instructions: existing?.instructions || ''
  });
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  return (
    <Modal title={existing ? 'Your recipe' : 'Add a recipe'} subtitle="Keep the food you love, with the way you make it." wide onClose={app.closeModal}>
      <form onSubmit={event => { event.preventDefault(); if (!form.name.trim()) return; app.saveRecipe({ name: form.name.trim(), cuisine: form.cuisine, minutes: Number(form.minutes) || 30, rating: Number(form.rating) || 0, tags: form.tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean), ingredients: form.ingredients.split('\n').map(line => line.trim()).filter(Boolean), instructions: form.instructions, favorite: existing?.favorite || false, cookedDates: existing?.cookedDates || [], photo: existing?.photo || '' }, id); }}>
        <div className="form-grid">
          <div className="full"><Field label="Dish name"><input value={form.name} onChange={set('name')} required maxLength={140} /></Field></div>
          <Field label="Cuisine"><input value={form.cuisine} onChange={set('cuisine')} /></Field>
          <Field label="Minutes"><input type="number" min="1" value={form.minutes} onChange={set('minutes')} /></Field>
          <div className="full"><Field label="Ingredients, one per line"><textarea rows={6} value={form.ingredients} onChange={set('ingredients')} /></Field></div>
          <div className="full"><Field label="Steps"><textarea rows={6} value={form.instructions} onChange={set('instructions')} /></Field></div>
        </div>
        <div className="form-actions">
          {existing && <Button variant="outline" onClick={() => app.addGrocery(existing.id)}>Add ingredients to groceries</Button>}
          {existing && <Button variant="danger" onClick={() => app.deleteRecipe(existing.id)}>Delete</Button>}
          <Button type="submit">Save recipe</Button>
        </div>
      </form>
    </Modal>
  );
}

function MealPlanForm({ id }) {
  const app = useApp();
  const existing = app.db.mealPlans.find(item => item.id === id);
  const [form, setForm] = useState(existing || { recipeId: app.db.recipes[0]?.id || '', date: today(), mealType: 'Dinner', time: '19:00' });
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  if (!app.db.recipes.length) return <Modal title="Plan a meal" subtitle="Add a recipe first." onClose={app.closeModal}><Button onClick={() => app.openModal('recipe')}>Add a recipe</Button></Modal>;
  return (
    <Modal title={existing ? 'Edit meal plan' : 'Plan a meal'} subtitle="Choose a dish and a day." onClose={app.closeModal}>
      <form className="form-grid" onSubmit={event => { event.preventDefault(); app.saveMealPlan(form, id); }}>
        <div className="full"><Field label="Recipe"><Select value={form.recipeId} onChange={set('recipeId')} options={app.db.recipes.map(recipe => [recipe.id, recipe.name])} /></Field></div>
        <Field label="Date"><input type="date" value={form.date} onChange={set('date')} required /></Field>
        <Field label="Meal"><Select value={form.mealType} onChange={set('mealType')} options={['Breakfast', 'Lunch', 'Dinner', 'Snack']} /></Field>
        <Field label="Time"><input type="time" value={form.time} onChange={set('time')} /></Field>
        <div className="form-actions">{existing && <Button variant="danger" onClick={() => app.deleteMealPlan(id)}>Remove</Button>}<Button type="submit">Save meal</Button></div>
      </form>
    </Modal>
  );
}

function Connections({ onClose }) {
  const app = useApp();
  const connectors = window.ModoConnectors;
  const [busy, setBusy] = useState('');
  const [feedName, setFeedName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');

  async function connect(provider) {
    const clientId = app.db.connections[provider].clientId;
    try {
      connectors.assertId(provider, clientId);
      setBusy(provider);
      if (provider === 'outlook') { await connectors.microsoftStart(clientId); return; }
      await connectors.googleConnect(clientId);
      await sync(provider);
    } catch (err) { app.notify(err.message); }
    finally { setBusy(''); }
  }

  async function sync(provider) {
    if (!connectors?.isConnected(provider)) { app.notify('Connect first, then sync.'); return; }
    setBusy(provider);
    try {
      const result = provider === 'google' ? await connectors.googleLoad() : await connectors.outlookLoad();
      app.update(next => applyProviderEvents(next, provider, result), `${provider === 'google' ? 'Google' : 'Outlook'} calendar updated.`);
    } catch (err) { app.notify(err.message); }
    finally { setBusy(''); }
  }

  async function subscribe(event) {
    event.preventDefault();
    try {
      const url = connectors.normalizeAppleUrl(feedUrl);
      const content = await fetchCalendarFeed(url, app.csrf());
      const data = expandICS(parseICS(content));
      const id = uid('feed');
      app.update(next => {
        next.connections.icloud.feeds.push({ id, name: feedName.trim() || 'iCloud', url, lastSync: new Date().toISOString(), visible: true, error: '' });
        next.events = next.events.filter(item => !(item.source === 'icloud' && item.calendarId === id));
        for (const raw of data) next.events.push({ id: uid('event'), ...raw, source: 'icloud', calendarId: id, calendarName: feedName || 'iCloud', readonly: true });
      }, `Saved ${feedName || 'iCloud'} with ${data.length} events.`);
      setFeedName(''); setFeedUrl('');
    } catch (err) { app.notify(err.message); }
  }

  return (
    <Modal title="Calendar connections" subtitle="Google and Outlook stay in this browser session. iCloud uses a public share link." wide onClose={onClose}>
      <div className="calendar-connect-layout">
        {['google', 'outlook'].map(provider => {
          const live = connectors?.isConnected(provider);
          const connection = app.db.connections[provider];
          return (
            <section className="connection-card" key={provider}>
              <h3>{provider === 'google' ? 'Google Calendar' : 'Outlook'}</h3>
              <p>{live ? 'Signed in for this browser session.' : 'Add your OAuth client ID, then connect.'}</p>
              <Field label="Client ID"><input value={connection.clientId || ''} onChange={event => app.update(next => { next.connections[provider].clientId = event.target.value; }, '')} placeholder={provider === 'google' ? '….apps.googleusercontent.com' : 'Application (client) ID'} /></Field>
              <div className="connection-actions">
                <Button variant={live ? 'soft' : 'primary'} disabled={Boolean(busy)} onClick={() => live ? sync(provider) : connect(provider)}>{busy === provider ? 'Working…' : live ? 'Sync now' : 'Connect'}</Button>
                {live && <Button variant="outline" onClick={() => { connectors.disconnect(provider); app.notify('Disconnected for this session.'); }}>Disconnect</Button>}
              </div>
              {connection.error && <p className="connection-warning">{connection.error}</p>}
            </section>
          );
        })}
      </div>
      <section className="connection-card" style={{ marginTop: 13 }}>
        <h3>Apple Calendar / iCloud</h3>
        <p>Public share links only. Anyone with the link can read that calendar.</p>
        <form className="connection-form" onSubmit={subscribe}>
          <Field label="Nickname"><input value={feedName} onChange={event => setFeedName(event.target.value)} placeholder="Personal iCloud" /></Field>
          <Field label="Public webcal or https link"><input type="url" required value={feedUrl} onChange={event => setFeedUrl(event.target.value)} placeholder="webcal://p01-caldav.icloud.com/published/…" /></Field>
          <Button type="submit">Subscribe</Button>
        </form>
        {app.db.connections.icloud.feeds.map(feed => <div className="connection-feed" key={feed.id}><span>{feed.name}</span><Button variant="ghost" small onClick={() => app.askConfirm({ title: 'Remove this calendar?', text: `“${feed.name}” and the events imported from it will leave your calendar. Continue only if you meant to remove it.`, confirmLabel: 'Remove calendar', run: () => app.update(next => { next.connections.icloud.feeds = next.connections.icloud.feeds.filter(item => item.id !== feed.id); next.events = next.events.filter(item => item.calendarId !== feed.id); }, 'iCloud subscription removed.') })}>Remove</Button></div>)}
      </section>
    </Modal>
  );
}
