import { Icon } from '../icons.jsx';
import { fmtFull, initials, today } from '../lib/dates.js';
import { useApp } from '../context/AppState.jsx';

const NAV = [
  ['today', 'Today', 'home'],
  ['tasks', 'Tasks', 'tasks'],
  ['calendar', 'Calendar', 'calendar'],
  ['people', 'People', 'people'],
  ['modes', 'Modes', 'target'],
  ['rituals', 'Rituals', 'sun'],
  ['meals', 'Meals', 'meals'],
  ['insights', 'Insights', 'insights']
];

export function Shell({ children }) {
  const app = useApp();
  const primary = NAV.slice(0, 4);
  const mobile = [...primary, ['more', 'More', 'grid']];
  const moreActive = ['modes', 'rituals', 'meals', 'insights', 'settings', 'more'].includes(app.page);

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <button className="brand" onClick={() => app.go('today')}>modo.</button>
          <span className="brand-tagline">YOUR LIFE. YOUR MODE.</span>
        </div>
        <div className="nav-section-label">My workspace</div>
        <nav className="sidebar-nav">
          {NAV.map(([page, title, icon]) => (
            <button key={page} className={`nav-link${app.page === page ? ' active' : ''}`} aria-current={app.page === page ? 'page' : undefined} onClick={() => app.go(page)}>
              <Icon name={icon} /> <span>{title}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className={`nav-link${app.page === 'settings' ? ' active' : ''}`} onClick={() => app.go('settings')}><Icon name="settings" /> Settings</button>
          <div className="sidebar-note"><Icon name="sparkle" size={21} /><strong>A little progress, every day.</strong><p>Make space for the things that matter to you.</p></div>
          <div className="sidebar-profile">
            <div className="profile-avatar">{initials(app.user?.name)}</div>
            <div style={{ minWidth: 0 }}>
              <b>{app.user?.name || 'My MODO'}</b>
              <span>{app.user?.email || 'Personal workspace'}</span>
            </div>
          </div>
          <button className="nav-link" onClick={app.logout}><Icon name="logout" /> Sign out</button>
        </div>
      </aside>
      <div className="content-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-top-brand" onClick={() => app.go('today')} style={{ background: 'none', border: 0, padding: 0 }}>modo.</button>
            <span className="demo-tag" title="Your workspace is saved to your private account"><i className="dot" /> Your private space</span>
            <span className="topbar-date">{fmtFull(today())}</span>
          </div>
          <div className="topbar-actions">
            <form className="top-search" onSubmit={event => { event.preventDefault(); app.go('search'); }}>
              <Icon name="search" size={16} />
              <input aria-label="Search" placeholder="Search" value={app.search} onChange={event => app.setSearch(event.target.value)} />
            </form>
            <button className="icon-button" aria-label="Notifications" onClick={() => app.go('notifications')}><Icon name="bell" /></button>
            <button className="icon-button" aria-label="Add" onClick={() => app.openModal('quick')}><Icon name="plus" /></button>
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile">
        {mobile.map(([page, title, icon]) => (
          <button key={page} className={(page === 'more' ? moreActive : app.page === page) ? 'active' : ''} onClick={() => app.go(page)}>
            <Icon name={icon} size={20} />{title}
          </button>
        ))}
      </nav>
      <button className="fab" aria-label="Add" onClick={() => app.openModal('quick')}><Icon name="plus" /></button>
    </div>
  );
}
