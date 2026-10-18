import { Button, Empty, Filters, Hero } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { useApp } from '../context/AppState.jsx';
import { fmtDate, fmtTime } from '../lib/dates.js';

export function MealsPage() {
  const app = useApp();
  let recipes = app.db.recipes.slice();
  if (app.mealFilter === 'Cooked before') recipes = recipes.filter(recipe => recipe.cookedDates?.length);
  else if (app.mealFilter === 'Saved') recipes = recipes.filter(recipe => recipe.favorite);
  if (app.mealSearch) {
    const q = app.mealSearch.toLowerCase();
    recipes = recipes.filter(recipe => `${recipe.name} ${(recipe.tags || []).join(' ')} ${(recipe.ingredients || []).join(' ')}`.toLowerCase().includes(q));
  }
  return (
    <>
      <Hero kicker="Your kitchen" title="What are we cooking?" text="Recipes you have saved, with the ingredients and the way you make them.">
        <Button onClick={() => app.openModal('recipe')}><Icon name="plus" size={16} /> Add a recipe</Button>
        <Button variant="outline" onClick={() => app.openModal('mealplan')}><Icon name="calendar" size={16} /> Plan a meal</Button>
      </Hero>
      <div className="spread" style={{ marginBottom: 15, flexWrap: 'wrap' }}>
        <Filters label="Recipes" values={['All', 'Saved', 'Cooked before']} current={app.mealFilter} onChange={app.setMealFilter} />
        <input type="search" aria-label="Find a recipe" placeholder="Find a dish..." value={app.mealSearch} onChange={event => app.setMealSearch(event.target.value)} style={{ width: 185 }} />
      </div>
      {recipes.length ? <div className="recipe-grid">{recipes.map(recipe => (
        <article className="card recipe-card" key={recipe.id}>
          <div className="recipe-art"><div className="dish-shape"><Icon name={recipe.tags?.includes('pasta') ? 'meals' : 'coffee'} size={42} /></div></div>
          <div className="recipe-body">
            <div className="spread"><span className="mini-label">{recipe.cuisine || 'My kitchen'}</span><button className={`icon-button${recipe.favorite ? ' loved' : ''}`} aria-label={recipe.favorite ? 'Remove from saved' : 'Save recipe'} aria-pressed={recipe.favorite} onClick={() => app.toggleFavorite(recipe.id)}><Icon name="heart" size={17} /></button></div>
            <h3>{recipe.name}</h3>
            <p>{recipe.cookedDates?.length ? `Cooked ${recipe.cookedDates.length} time${recipe.cookedDates.length === 1 ? '' : 's'}` : 'Not cooked yet'} · {recipe.minutes || 30} min</p>
            <div className="recipe-card-actions">
              <Button variant="soft" small onClick={() => app.openModal('recipe', recipe.id)}>View recipe</Button>
              <Button variant="ghost" small onClick={() => app.markCooked(recipe.id)}>Cooked</Button>
            </div>
          </div>
        </article>
      ))}</div> : <Empty title="Nothing in this collection yet." text="Save a recipe you want to make again." action="Add a recipe" onAction={() => app.openModal('recipe')} />}
      <div style={{ height: 21 }} />
      <div className="section-heading"><h2>Meal plan</h2><button className="inline-link" onClick={() => app.openModal('mealplan')}>Add a meal <Icon name="arrowRight" size={14} /></button></div>
      <div className="card">
        {app.db.mealPlans.length ? [...app.db.mealPlans].sort((a, b) => a.date.localeCompare(b.date)).map(plan => (
          <div className="meal-plan-row" key={plan.id}>
            <div><strong style={{ fontSize: 13 }}>{app.db.recipes.find(recipe => recipe.id === plan.recipeId)?.name || 'Recipe removed'}</strong><div className="small-text subtle">{fmtDate(plan.date)} · {plan.mealType}{plan.time ? ` · ${fmtTime(plan.time)}` : ''}</div></div>
            <button className="icon-button" aria-label="Edit meal" onClick={() => app.openModal('mealplan', plan.id)}><Icon name="edit" size={16} /></button>
          </div>
        )) : <Empty title="Plan something lovely." text="Choose a recipe and a day." action="Plan a meal" onAction={() => app.openModal('mealplan')} />}
      </div>
    </>
  );
}
