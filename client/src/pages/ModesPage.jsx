import { useEffect } from 'react';
import { Button, Empty, Filters, Hero, IconButton } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';
import { effectiveModeStatus, modeAdherence, modeDailyProgress, modeElapsed, modeRuleDone, modeStartEnd, modeValue, ruleIsCheck, ruleSummary } from '../lib/domain.js';
import { addDays, fmtDate, pct, today } from '../lib/dates.js';

export function ModesPage() {
  const app = useApp();
  const selected = app.db.modes.find(mode => mode.id === app.selectedMode) || app.db.modes.find(mode => effectiveModeStatus(mode) === 'active') || app.db.modes[0];
  const range = selected ? modeStartEnd(selected) : null;
  const viewDay = !range ? app.modeDay : app.modeDay < range.start ? range.start : app.modeDay > range.end ? range.end : app.modeDay;
  useEffect(() => {
    if (!range || app.modeDay === viewDay) return;
    app.setModeDay(viewDay);
  }, [range, app.modeDay, viewDay, app.setModeDay]);
  const filtered = app.db.modes.filter(mode => app.modeFilter === 'All' || effectiveModeStatus(mode) === app.modeFilter.toLowerCase());
  const valid = Boolean(selected);

  return (
    <>
      <Hero kicker="Your goals. Your rules." title="Find your mode." text="A challenge with the commitments you choose. Some are a simple check. Others track time or a count.">
        <Button onClick={() => app.openModal('mode')}><Icon name="plus" size={16} /> Create a mode</Button>
      </Hero>
      {selected && (
        <section className="card mode-detail" style={{ marginBottom: 22 }}>
          <div className="spread">
            <div>
              <div className="eyebrow">MY CURRENT MODE</div>
              <h2 style={{ fontSize: 22, letterSpacing: '-0.8px', margin: '8px 0 5px' }}>{selected.title}</h2>
              <p className="small-text subtle" style={{ margin: 0 }}>{selected.description || 'Your goals. Your rules.'}</p>
            </div>
            <strong>{pct(modeElapsed(selected), selected.duration)}%</strong>
          </div>
          <div className="stat-row" style={{ marginTop: 20 }}>
            <div className="stat-tile"><strong>{modeElapsed(selected)}</strong><span>Days elapsed</span></div>
            <div className="stat-tile"><strong>{Math.max(0, selected.duration - modeElapsed(selected))}</strong><span>Days left</span></div>
            <div className="stat-tile"><strong>{modeAdherence(app.db, selected)}%</strong><span>Consistency</span></div>
          </div>
          <div className="spread" style={{ margin: '20px 0 13px' }}>
            <div><h3 style={{ margin: 0, fontSize: 15 }}>Commitments</h3><span className="tiny subtle">{fmtDate(viewDay, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
            <div className="date-picker-inline">
              <IconButton label="Previous day" tinted disabled={viewDay <= range.start} onClick={() => app.setModeDay(addDays(viewDay, -1))}><Icon name="chevronLeft" size={16} /></IconButton>
              <IconButton label="Next day" tinted disabled={viewDay >= range.end} onClick={() => app.setModeDay(addDays(viewDay, 1))}><Icon name="chevronRight" size={16} /></IconButton>
            </div>
          </div>
          {today() < range.start && <div className="note" style={{ marginBottom: 12 }}>Starts {fmtDate(range.start, { weekday: 'long', month: 'long', day: 'numeric' })}. You can check these off from that morning.</div>}
          {valid ? selected.rules.map(rule => {
            const done = modeRuleDone(app.db, selected, rule, viewDay);
            const check = ruleIsCheck(rule);
            const locked = today() < range.start;
            return (
              <div className="mode-rule" key={rule.id} style={{ marginBottom: 8 }}>
                <button className={`checkmark${done ? ' checked' : ''}`} aria-label={`${done ? 'Clear' : 'Complete'} ${rule.title}`} disabled={locked} onClick={() => app.toggleModeRule(selected.id, rule.id, viewDay)}><Icon name="check" size={13} /></button>
                <div className={`check-row-main${done ? ' done' : ''}`}><strong>{rule.title}</strong><small>{ruleSummary(app.db, selected, rule, viewDay)}</small></div>
                {!check && <Button variant="ghost" small disabled={locked} onClick={() => { const entry = window.prompt(`Progress for ${rule.title} (${rule.unit || 'times'})`, String(modeValue(app.db, selected, rule, viewDay))); if (entry === null) return; const value = Number(entry); if (!Number.isFinite(value) || value < 0) { app.notify('Enter a valid number.'); return; } app.setModeRuleValue(selected.id, rule.id, viewDay, value); }}>{modeValue(app.db, selected, rule, viewDay)}/{rule.target}</Button>}
              </div>
            );
          }) : <div className="note">Choose a date between {fmtDate(range.start)} and {fmtDate(range.end)}.</div>}
          <div className="spread" style={{ marginTop: 18, gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" small onClick={() => app.openModal('mode', selected.id)}><Icon name="edit" size={14} /> Edit</Button>
            <Button variant="outline" small onClick={() => app.setModeStatus(selected.id, selected.status === 'active' ? 'paused' : 'active')}>{selected.status === 'active' ? 'Pause' : 'Resume'}</Button>
            <Button variant="ghost" small onClick={() => app.setModeStatus(selected.id, 'archived')}>Archive</Button>
            <Button variant="danger" small onClick={() => app.deleteMode(selected.id)}>Delete</Button>
          </div>
        </section>
      )}
      <Filters label="Modes" values={['Active', 'Paused', 'Completed', 'Archived', 'All']} current={app.modeFilter} onChange={app.setModeFilter} />
      <div className="grid-two balanced" style={{ marginTop: 14 }}>
        {filtered.length ? filtered.map(mode => {
          const elapsed = modeElapsed(mode);
          const stats = modeDailyProgress(app.db, mode, today());
          const upcoming = today() < mode.startDate;
          return (
            <article className="card mode-card" key={mode.id}>
              <div className="spread"><span className={`pill${effectiveModeStatus(mode) === 'active' ? ' success' : ''}`}>{effectiveModeStatus(mode)}</span><span className="tiny subtle">{mode.duration} days</span></div>
              <h3>{mode.title}</h3>
              <p>{mode.description || 'A challenge, entirely your own.'}</p>
              <div className="progress"><span style={{ width: `${pct(elapsed, mode.duration)}%` }} /></div>
              <div className="mode-meta"><span>{upcoming ? `Starts ${fmtDate(mode.startDate)}` : `${stats.done}/${stats.total} today`}</span><span>{modeAdherence(app.db, mode)}% consistency</span></div>
              <Button variant="soft" small onClick={() => app.setSelectedMode(mode.id)}>Open mode</Button>
            </article>
          );
        }) : <Empty title="Your next mode is yours to create." text="A challenge starts with one intention." action="Create a mode" onAction={() => app.openModal('mode')} />}
      </div>
    </>
  );
}
