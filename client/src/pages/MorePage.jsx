import { Hero } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';

const TILES = [
  ['modes', 'Modes', 'target', 'Personal challenges, your own rules'],
  ['rituals', 'Rituals', 'sun', 'Habits and daily routines'],
  ['meals', 'Meals', 'meals', 'Recipes, favorites and planning'],
  ['insights', 'Insights', 'insights', 'A quiet record of your days'],
  ['settings', 'Settings', 'settings', 'Appearance, reminders and your account']
];

export function MorePage() {
  const app = useApp();
  return (
    <>
      <Hero kicker="Your space" title="Everything in its place." text="The rest of your everyday life." />
      <div className="more-grid">
        {TILES.map(([page, title, icon, text]) => (
          <button className="more-tile" key={page} onClick={() => app.go(page)}><Icon name={icon} size={25} /><strong>{title}</strong><span>{text}</span></button>
        ))}
      </div>
    </>
  );
}
