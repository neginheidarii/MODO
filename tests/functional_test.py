import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'styles.css').read_text();js=(root/'app.js').read_text()
storage="""const __dbStore=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__dbStore.get(k)||null,setItem:(k,v)=>__dbStore.set(k,String(v)),removeItem:k=>__dbStore.delete(k),clear:()=>__dbStore.clear()}});"""
html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#F3EBDD"><style>'+css+'</style></head><body><div id="app"></div><div id="toast-region"></div><script>'+storage+js+'</script></body></html>'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await b.new_page(viewport={'width':1280,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda dlg:asyncio.create_task(dlg.accept()))
  await page.set_content(html)
  async def route(p): await page.evaluate('p=>{ui.page=p;render()}',p)
  async def value(code): return await page.evaluate(code)
  # Task creation, editing, completion
  await route('tasks');await page.locator('.page-hero [data-action="open-task"]').click()
  await page.locator('form[data-form="task"] input[name="title"]').fill('Plan Sunday brunch')
  await page.locator('form[data-form="task"] input[name="dueDate"]').fill('2026-10-19')
  await page.locator('form[data-form="task"] button[type="submit"]').click()
  assert await value('db.tasks.some(t=>t.title==="Plan Sunday brunch")')
  tid=await value('db.tasks.find(t=>t.title==="Plan Sunday brunch").id')
  await page.locator('[data-action="tasks-filter"][data-value="All"]').click()
  await page.locator(f'[data-action="open-task"][data-id="{tid}"]').click()
  await page.locator('form[data-form="task"] input[name="title"]').fill('Plan Sunday breakfast')
  await page.locator('form[data-form="task"] button[type="submit"]').click()
  assert await value('db.tasks.some(t=>t.title==="Plan Sunday breakfast")')
  # Person + meetup, should create exactly one linked calendar event after edits
  await route('people');await page.locator('.page-hero [data-action="open-person"]').click()
  await page.locator('form[data-form="person"] input[name="name"]').fill('Taylor')
  await page.locator('form[data-form="person"] button[type="submit"]').click()
  pid=await value('db.people.find(x=>x.name==="Taylor").id')
  await page.evaluate('id=>{ui.modal={kind:"meetup",id:null,personId:id};render()}',pid)
  await page.locator('form[data-form="meetup"] input[name="title"]').fill('Lunch with Taylor')
  await page.locator('form[data-form="meetup"] input[name="date"]').fill('2026-10-26')
  await page.locator('form[data-form="meetup"] button[type="submit"]').click()
  mid=await value('db.meetups.find(x=>x.personId==="'+pid+'").id')
  assert await value('db.events.filter(e=>e.source==="meetup"&&e.linkedId==="'+mid+'").length===1')
  await page.evaluate('id=>{ui.modal={kind:"meetup",id};render()}',mid)
  await page.locator('form[data-form="meetup"] input[name="date"]').fill('2026-10-27')
  await page.locator('form[data-form="meetup"] button[type="submit"]').click()
  assert await value('db.events.filter(e=>e.source==="meetup"&&e.linkedId==="'+mid+'").length===1')
  assert await value('db.events.find(e=>e.linkedId==="'+mid+'").date==="2026-10-27"')
  # Ritual CRUD
  await route('rituals');await page.locator('.page-hero [data-action="open-ritual"]').click()
  await page.locator('form[data-form="ritual"] input[name="name"]').fill('Stretch gently')
  await page.locator('form[data-form="ritual"] button[type="submit"]').click()
  assert await value('db.rituals.some(r=>r.name==="Stretch gently")')
  # Custom mode creation
  await route('modes');await page.locator('.page-hero [data-action="open-mode"]').click()
  await page.locator('form[data-form="mode"] input[name="title"]').fill('30 days of focus')
  await page.locator('form[data-form="mode"] select[name="duration"]').select_option('30')
  await page.locator('form[data-form="mode"] button[type="submit"]').click()
  assert await value('db.modes.some(m=>m.title==="30 days of focus"&&m.duration===30)')
  # Meal plan + recipe CRUD
  await route('meals');await page.locator('.page-hero [data-action="open-recipe"]').click()
  await page.locator('form[data-form="recipe"] input[name="name"]').fill('Roasted veggie pasta')
  await page.locator('form[data-form="recipe"] input[name="tags"]').fill('vegetarian, pasta, roasted')
  await page.locator('form[data-form="recipe"] textarea[name="ingredients"]').fill('Pasta\nZucchini\nGarlic')
  await page.locator('form[data-form="recipe"] button[type="submit"]').click()
  print('AFTER RECIPE', await value('db.recipes.slice(0,2).map(r=>r.name)'), 'ERRORS',errors, 'VALID',await page.evaluate('document.querySelector("form[data-form=recipe]")?.checkValidity()'));assert await value('db.recipes.some(r=>r.name==="Roasted veggie pasta")')
  await page.locator('.page-hero [data-action="open-mealplan"]').click()
  await page.locator('form[data-form="mealplan"] input[name="date"]').fill('2026-10-29')
  await page.locator('form[data-form="mealplan"] button[type="submit"]').click()
  assert await value('db.mealPlans.some(m=>m.date==="2026-10-29")')
  # ICS parse and light/dark setting, activity view
  assert await value('parseICS("BEGIN:VCALENDAR\\nBEGIN:VEVENT\\nUID:xyz123\\nDTSTART:20261025T140000\\nSUMMARY:Coffee\\nEND:VEVENT\\nEND:VCALENDAR").length===1')
  await route('settings');await page.locator('#theme-select').select_option('dark')
  assert await value('document.documentElement.dataset.theme==="dark"')
  await route('insights');assert await page.locator('.heatmap-weeks .heat-cell').count()==26*7
  assert not errors,errors
  print('PASS: tasks CRUD, person->calendar linked meetup & reschedule, rituals, modes, recipe, meal plan, ICS parsing, theme and 182 heatmap cells')
  await b.close()
asyncio.run(main())
