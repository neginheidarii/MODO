import { Hero } from '../components/ui.jsx';
import { useApp } from '../context/AppState.jsx';
import { activityCount } from '../lib/domain.js';
import { addDays, fmtDate, today, weekdayName } from '../lib/dates.js';

export function InsightsPage() {
  const app = useApp();
  const end = today();
  const start = addDays(end, -7 * 26 + 1);
  const weeks = [];
  for (let i = 0; i < 26; i++) weeks.push(Array.from({ length: 7 }, (_, day) => addDays(start, i * 7 + day)));
  const level = n => n <= 0 ? 0 : n === 1 ? 1 : n < 4 ? 2 : n < 7 ? 3 : 4;
  const selected = activityCount(app.db, app.heatDay);
  const active = weeks.flat().filter(day => day <= end && activityCount(app.db, day) > 0).length;

  return (
    <>
      <Hero kicker="Insights" title="A quiet record of showing up." text="Every olive square is a day with a finished task, ritual, commitment, cooked meal or meetup." />
      <div className="stat-row" style={{ marginBottom: 21 }}>
        <div className="stat-tile"><strong>{active}</strong><span>Active days</span></div>
        <div className="stat-tile"><strong>26</strong><span>Weeks shown</span></div>
        <div className="stat-tile"><strong>{selected}</strong><span>On the selected day</span></div>
      </div>
      <section className="card">
        <div className="heatmap-scroll">
          <div className="heatmap-wrap">
            <div className="heatmap-days"><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /><span /></div>
            <div className="heatmap-weeks">
              {weeks.map((week, index) => (
                <div className="heatmap-week" key={index}>
                  {week.map(day => (
                    <button key={day} className={`heat-cell${day === app.heatDay ? ' picked' : ''}${day > end ? ' future' : ''}`} data-level={day > end ? 0 : level(activityCount(app.db, day))} title={`${weekdayName(day)} ${fmtDate(day)}`} disabled={day > end} onClick={() => app.setHeatDay(day)} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="heatmap-legend" style={{ marginTop: 12 }}><span>Less</span>{[0, 1, 2, 3, 4].map(n => <i key={n} className="heat-cell" data-level={n} />)}<span>More</span></div>
        <p className="small-text subtle" style={{ marginTop: 16 }}>{fmtDate(app.heatDay, { weekday: 'long', month: 'long', day: 'numeric' })} · {selected} recorded {selected === 1 ? 'activity' : 'activities'}</p>
      </section>
    </>
  );
}
