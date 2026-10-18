import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { accountRequest, getSession, getWorkspace, putWorkspace } from '../api.js';
import { ensureConnections, emptyWorkspace, PAGES, syncMeetupEvent, taskDateForAction } from '../lib/domain.js';
import { today, uid } from '../lib/dates.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

function readPage() {
  const match = location.hash.match(/^#\/(\w+)/);
  let page = match?.[1] || 'today';
  if (page === 'more' && window.innerWidth > 900) page = 'modes';
  return PAGES.includes(page) ? page : 'today';
}

export function AppProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [page, setPage] = useState(readPage);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState('');
  const [syncError, setSyncError] = useState('');
  const [search, setSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState('Today');
  const [taskCategory, setTaskCategory] = useState('All');
  const [calView, setCalView] = useState('month');
  const [calMonth, setCalMonth] = useState(`${today().slice(0, 7)}-01`);
  const [calDay, setCalDay] = useState(today());
  const [modeFilter, setModeFilter] = useState('Active');
  const [selectedMode, setSelectedMode] = useState(null);
  const [modeDay, setModeDay] = useState(today());
  const [mealFilter, setMealFilter] = useState('All');
  const [mealSearch, setMealSearch] = useState('');
  const [peopleFilter, setPeopleFilter] = useState('All');
  const [heatDay, setHeatDay] = useState(today());
  const csrfRef = useRef('');
  const revRef = useRef(0);
  const dirty = useRef(null);
  const timer = useRef(null);
  const working = useRef(false);
  const halted = useRef(false);
  const dbRef = useRef(null);
  const confirmRef = useRef(null);

  const notify = useCallback(message => {
    setToast(message);
    window.setTimeout(() => setToast(current => current === message ? '' : current), 3200);
  }, []);

  const flush = useCallback(async () => {
    if (working.current) return;
    if (halted.current || !dirty.current) return;
    working.current = true;
    const payload = dirty.current;
    dirty.current = null;
    try {
      const result = await putWorkspace(revRef.current, payload, csrfRef.current);
      if (result.status === 401) { halted.current = true; setSyncError('Your session ended. Export your workspace before signing in again.'); return; }
      if (result.status === 409) { halted.current = true; setSyncError('This account was changed somewhere else. Reload before saving so you do not overwrite it.'); return; }
      if (result.status !== 200) throw new Error(result.payload.error || 'Save failed');
      revRef.current = result.payload.revision;
      setSyncError('');
    } catch (err) {
      dirty.current = dirty.current ?? payload;
      setSyncError('Changes are not on the server yet. MODO will retry.');
      timer.current = window.setTimeout(flush, 3500);
    } finally {
      working.current = false;
      if (dirty.current && !halted.current) timer.current = window.setTimeout(flush, 3500);
    }
  }, []);

  const queueSave = useCallback(next => {
    if (halted.current) return;
    dirty.current = next;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 450);
  }, [flush]);

  const update = useCallback((mutator, message) => {
    setDb(current => {
      const next = structuredClone(current);
      mutator(next);
      ensureConnections(next);
      dbRef.current = next;
      queueSave(next);
      return next;
    });
    if (message) notify(message);
  }, [notify, queueSave]);

  const bootstrap = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const session = await getSession();
      if (!session) { setStatus('auth'); return; }
      const workspace = await getWorkspace();
      if (workspace.status === 401) { setStatus('auth'); return; }
      const data = ensureConnections(structuredClone(workspace.data || emptyWorkspace()));
      csrfRef.current = session.csrf;
      window.ModoAccount = { csrf: session.csrf, user: session.user };
      revRef.current = workspace.revision || 0;
      halted.current = false;
      dbRef.current = data;
      setUser(session.user);
      setDb(data);
      setStatus('ready');
      if (!location.hash) location.hash = '#/today';
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);
  useEffect(() => {
    const onHash = () => { setPage(readPage()); setModal(null); confirmRef.current = null; setConfirm(null); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (!db) return;
    const preferred = db.settings.theme || 'light';
    const mode = preferred === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preferred;
    document.documentElement.dataset.theme = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#222820' : '#F3EBDD');
  }, [db]);
  useEffect(() => () => { window.clearTimeout(timer.current); }, []);

  const go = useCallback(next => {
    const pageName = next === 'more' && window.innerWidth > 900 ? 'modes' : next;
    setPage(pageName);
    setModal(null);
    confirmRef.current = null;
    setConfirm(null);
    location.hash = `#/${pageName}`;
    window.scrollTo({ top: 0 });
  }, []);

  const askConfirm = useCallback(prompt => { confirmRef.current = prompt; setConfirm(prompt); }, []);
  const dismissConfirm = useCallback(() => { confirmRef.current = null; setConfirm(null); }, []);
  const acceptConfirm = useCallback(async () => {
    const current = confirmRef.current;
    confirmRef.current = null;
    setConfirm(null);
    try { await current?.run?.(); }
    catch (err) { notify(err.message); }
  }, [notify]);

  const finishLogout = useCallback(async () => {
    try {
      await accountRequest('./api/auth/logout', {}, csrfRef.current);
      setStatus('auth');
      setDb(null);
      setUser(null);
    } catch (err) { notify(err.message); }
  }, [notify]);

  const logout = useCallback(async () => {
    await flush();
    if (dirty.current) {
      askConfirm({
        title: 'Sign out anyway?',
        text: 'Some recent changes may not be saved yet. Continue only if you meant to leave.',
        confirmLabel: 'Sign out',
        run: finishLogout
      });
      return;
    }
    await finishLogout();
  }, [flush, askConfirm, finishLogout]);

  const value = useMemo(() => ({
    status, error, user, db, page, modal, confirm, toast, syncError, search, taskFilter, taskCategory,
    calView, calMonth, calDay, modeFilter, selectedMode, modeDay, mealFilter, mealSearch, peopleFilter, heatDay,
    csrf: () => csrfRef.current,
    notify, bootstrap, go, logout, update, askConfirm, dismissConfirm, acceptConfirm, setSearch, setTaskFilter, setTaskCategory, setCalView, setCalMonth, setCalDay,
    setModeFilter, setSelectedMode, setModeDay, setMealFilter, setMealSearch, setPeopleFilter, setHeatDay,
    openModal: (kind, id = null, extra = {}) => setModal({ kind, id, ...extra }),
    closeModal: () => setModal(null),
    toggleTask(id, date) {
      update(next => {
        const task = next.tasks.find(item => item.id === id);
        if (!task) return;
        const key = taskDateForAction(task, date || today());
        task.completedDates ??= [];
        task.completedDates = task.completedDates.includes(key) ? task.completedDates.filter(d => d !== key) : [...task.completedDates, key];
      });
    },
    saveTask(data, id) {
      update(next => {
        if (id) Object.assign(next.tasks.find(item => item.id === id), data);
        else next.tasks.unshift({ id: uid('task'), completedDates: [], ...data });
      }, id ? 'Task updated.' : 'Task added.');
      setModal(null);
    },
    deleteTask(id) {
      const name = dbRef.current?.tasks.find(item => item.id === id)?.title;
      askConfirm({
        title: 'Remove this task?',
        text: `${name ? `“${name}”` : 'This task'} will leave your list. Continue only if you meant to remove it.`,
        confirmLabel: 'Remove task',
        run: () => { update(next => { next.tasks = next.tasks.filter(item => item.id !== id); }, 'Removed from your workspace.'); setModal(null); }
      });
    },
    saveEvent(data, id) {
      update(next => {
        if (id) Object.assign(next.events.find(item => item.id === id), data);
        else next.events.push({ id: uid('event'), source: 'modo', readonly: false, ...data });
      }, id ? 'Event updated.' : 'Event added to your calendar.');
      setModal(null);
    },
    deleteEvent(id) {
      const name = dbRef.current?.events.find(item => item.id === id)?.title;
      askConfirm({
        title: 'Remove this event?',
        text: `${name ? `“${name}”` : 'This event'} will leave your calendar. Continue only if you meant to remove it.`,
        confirmLabel: 'Remove event',
        run: () => { update(next => { next.events = next.events.filter(item => item.id !== id); }, 'Removed from your workspace.'); setModal(null); }
      });
    },
    savePerson(data, id) {
      update(next => {
        if (id) Object.assign(next.people.find(item => item.id === id), data);
        else next.people.push({ id: uid('person'), ...data });
      }, id ? 'Person updated.' : 'Person added.');
      setModal(null);
    },
    deletePerson(id) {
      const name = dbRef.current?.people.find(item => item.id === id)?.name;
      askConfirm({
        title: 'Remove this person?',
        text: `${name ? `“${name}”` : 'This person'} and their meetups will leave your space. Continue only if you meant to remove them.`,
        confirmLabel: 'Remove person',
        run: () => {
          update(next => {
            const meetIds = new Set(next.meetups.filter(item => item.personId === id).map(item => item.eventId));
            next.events = next.events.filter(item => !meetIds.has(item.id));
            next.meetups = next.meetups.filter(item => item.personId !== id);
            next.people = next.people.filter(item => item.id !== id);
          }, 'Removed from your workspace.');
          setModal(null);
        }
      });
    },
    saveMeetup(data, id) {
      update(next => {
        const current = id ? next.meetups.find(item => item.id === id) : { id: uid('meet'), eventId: '' };
        Object.assign(current, data);
        if (!id) next.meetups.push(current);
        syncMeetupEvent(next, current);
      }, 'Meetup saved.');
      setModal(null);
    },
    deleteMeetup(id) {
      const name = dbRef.current?.meetups.find(item => item.id === id)?.title;
      askConfirm({
        title: 'Remove this meetup?',
        text: `${name ? `“${name}”` : 'This meetup'} will leave your plans and calendar. Continue only if you meant to remove it.`,
        confirmLabel: 'Remove meetup',
        run: () => {
          update(next => {
            const meet = next.meetups.find(item => item.id === id);
            if (meet?.eventId) next.events = next.events.filter(item => item.id !== meet.eventId);
            next.meetups = next.meetups.filter(item => item.id !== id);
          }, 'Removed from your workspace.');
          setModal(null);
        }
      });
    },
    saveRitual(data, id) {
      update(next => {
        if (id) Object.assign(next.rituals.find(item => item.id === id), data);
        else next.rituals.push({ id: uid('ritual'), logs: {}, ...data });
      }, id ? 'Ritual updated.' : 'Ritual added.');
      setModal(null);
    },
    deleteRitual(id) {
      const name = dbRef.current?.rituals.find(item => item.id === id)?.name;
      askConfirm({
        title: 'Remove this ritual?',
        text: `${name ? `“${name}”` : 'This ritual'} and its history will leave your rituals. Continue only if you meant to remove it.`,
        confirmLabel: 'Remove ritual',
        run: () => { update(next => { next.rituals = next.rituals.filter(item => item.id !== id); }, 'Removed from your workspace.'); setModal(null); }
      });
    },
    toggleRitual(id, date) {
      update(next => {
        const ritual = next.rituals.find(item => item.id === id);
        if (!ritual) return;
        ritual.logs ??= {};
        const done = Number(ritual.logs[date] || 0) >= Number(ritual.target || 1);
        ritual.logs[date] = done ? 0 : Number(ritual.target || 1);
      });
    },
    saveMode(data) {
      update(next => {
        const existing = next.modes.find(item => item.id === data.id);
        if (existing) Object.assign(existing, data);
        else next.modes.unshift(data);
      }, data.existing ? 'Mode updated.' : 'Your new mode is ready.');
      setSelectedMode(data.id);
      setModeDay(today());
      setModal(null);
    },
    deleteMode(id) {
      const name = dbRef.current?.modes.find(item => item.id === id)?.title;
      askConfirm({
        title: 'Remove this mode?',
        text: `${name ? `“${name}”` : 'This mode'} and its commitments will leave your workspace. Continue only if you meant to remove it.`,
        confirmLabel: 'Remove mode',
        run: () => { update(next => { next.modes = next.modes.filter(item => item.id !== id); }, 'Removed from your workspace.'); setSelectedMode(current => current === id ? null : current); setModal(null); }
      });
    },
    setModeStatus(id, statusName) {
      update(next => { const mode = next.modes.find(item => item.id === id); if (mode) mode.status = statusName; });
    },
    toggleModeRule(modeId, ruleId, date) {
      update(next => {
        const mode = next.modes.find(item => item.id === modeId);
        const rule = mode?.rules.find(item => item.id === ruleId);
        if (!rule) return;
        const current = rule.ritualId ? Number(next.rituals.find(item => item.id === rule.ritualId)?.logs?.[date] || 0) : Number(mode.logs?.[`${date}|${rule.id}`] || 0);
        const target = rule.kind === 'check' ? 1 : Number(rule.target) || 1;
        const value = current >= target ? 0 : target;
        if (rule.ritualId) {
          const ritual = next.rituals.find(item => item.id === rule.ritualId);
          if (ritual) { ritual.logs ??= {}; ritual.logs[date] = value; }
        } else {
          mode.logs ??= {};
          mode.logs[`${date}|${rule.id}`] = value;
        }
      });
    },
    setModeRuleValue(modeId, ruleId, date, value) {
      update(next => {
        const mode = next.modes.find(item => item.id === modeId);
        const rule = mode?.rules.find(item => item.id === ruleId);
        if (!mode || !rule) return;
        if (rule.ritualId) {
          const ritual = next.rituals.find(item => item.id === rule.ritualId);
          if (ritual) { ritual.logs ??= {}; ritual.logs[date] = value; }
        } else {
          mode.logs ??= {};
          mode.logs[`${date}|${rule.id}`] = value;
        }
      }, 'Progress saved.');
    },
    saveRecipe(data, id) {
      update(next => {
        if (id) Object.assign(next.recipes.find(item => item.id === id), data);
        else next.recipes.unshift({ id: uid('recipe'), favorite: false, rating: 0, cookedDates: [], photo: '', ...data });
      }, id ? 'Recipe updated.' : 'Added to your kitchen.');
      setModal(null);
    },
    deleteRecipe(id) {
      const name = dbRef.current?.recipes.find(item => item.id === id)?.name;
      askConfirm({
        title: 'Remove this recipe?',
        text: `${name ? `“${name}”` : 'This recipe'} and any meals planned from it will leave your kitchen. Continue only if you meant to remove it.`,
        confirmLabel: 'Remove recipe',
        run: () => {
          update(next => {
            next.recipes = next.recipes.filter(item => item.id !== id);
            next.mealPlans = next.mealPlans.filter(item => item.recipeId !== id);
          }, 'Removed from your workspace.');
          setModal(null);
        }
      });
    },
    toggleFavorite(id) {
      update(next => { const recipe = next.recipes.find(item => item.id === id); if (recipe) recipe.favorite = !recipe.favorite; });
    },
    markCooked(id) {
      update(next => {
        const recipe = next.recipes.find(item => item.id === id);
        if (recipe) { recipe.cookedDates ??= []; recipe.cookedDates.push(today()); }
      }, 'Added to your cooking history.');
    },
    saveMealPlan(data, id) {
      update(next => {
        if (id) Object.assign(next.mealPlans.find(item => item.id === id), data);
        else next.mealPlans.push({ id: uid('mealplan'), ...data });
      }, id ? 'Meal plan updated.' : 'Meal added to your planner.');
      setModal(null);
    },
    deleteMealPlan(id) {
      const plan = dbRef.current?.mealPlans.find(item => item.id === id);
      const name = dbRef.current?.recipes.find(item => item.id === plan?.recipeId)?.name;
      askConfirm({
        title: 'Remove this meal?',
        text: `${name ? `“${name}”` : 'This meal'} will leave the plan. The recipe stays. Continue only if you meant to remove it.`,
        confirmLabel: 'Remove meal',
        run: () => { update(next => { next.mealPlans = next.mealPlans.filter(item => item.id !== id); }, 'Removed from your workspace.'); setModal(null); }
      });
    },
    addGrocery(recipeId) {
      update(next => {
        const recipe = next.recipes.find(item => item.id === recipeId);
        if (!recipe) return;
        for (const ingredient of recipe.ingredients) {
          next.tasks.push({ id: uid('task'), title: `Buy ${ingredient}`, notes: `For ${recipe.name}`, category: 'Groceries', priority: 'low', dueDate: today(), dueTime: '', repeat: 'none', reminder: 'none', completedDates: [] });
        }
      }, 'Ingredients added to Groceries.');
    },
    replaceWorkspace(data) {
      const next = ensureConnections(structuredClone(data));
      dbRef.current = next;
      setDb(next);
      queueSave(next);
      notify('Backup restored.');
    },
    async changePassword(currentPassword, newPassword) {
      await accountRequest('./api/auth/change-password', { currentPassword, newPassword }, csrfRef.current);
      notify('Password changed. Other sessions were signed out.');
    },
    async deleteAccount(password) {
      await accountRequest('./api/account', { password }, csrfRef.current, 'DELETE');
      setStatus('auth');
      setDb(null);
    }
  }), [status, error, user, db, page, modal, confirm, toast, syncError, search, taskFilter, taskCategory, calView, calMonth, calDay, modeFilter, selectedMode, modeDay, mealFilter, mealSearch, peopleFilter, heatDay, notify, bootstrap, go, logout, update, askConfirm, dismissConfirm, acceptConfirm, queueSave]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
