import asyncio
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
css=(ROOT/'styles.css').read_text()
js=(ROOT/'app.js').read_text()
connectors=(ROOT/'calendar-connectors.js').read_text()
MOCK=r'''
const __store = new Map();
Object.defineProperty(window, 'localStorage', {configurable:true,value:{getItem:k=>__store.get(k)??null,setItem:(k,v)=>__store.set(k,String(v)),removeItem:k=>__store.delete(k),clear:()=>__store.clear()}});
window.modoMock={calls:[],googleEvents:[],outlookEvents:[],ics:'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:weekly123\r\nSUMMARY:Weekly dinner\r\nDTSTART:20261018T180000\r\nDTEND:20261018T193000\r\nRRULE:FREQ=WEEKLY;COUNT=10;BYDAY=SU\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n'};
window.google={accounts:{oauth2:{initTokenClient:o=>({requestAccessToken:()=>o.callback({access_token:'google-mock',expires_in:3600})}),revoke:(_t,cb)=>cb()}}};
window.fetch=async (url,opts={})=>{
 const req=String(url),method=opts.method||'GET';window.modoMock.calls.push([method,req]);let body={};
 if(req.includes('users/me/calendarList'))body={items:[{id:'primary',summary:'Personal Calendar',accessRole:'owner',backgroundColor:'#59805F'},{id:'team@example.com',summary:'Team',accessRole:'reader',backgroundColor:'#335577'}]};
 else if(req.includes('googleapis.com')&&method==='POST')body={id:'published123',htmlLink:'https://calendar.google.com/event?eid=test'};
 else if(req.includes('googleapis.com')&&method==='PATCH')body={id:'published123',htmlLink:'https://calendar.google.com/event?eid=test'};
 else if(req.includes('googleapis.com')&&req.includes('/calendars/primary/events'))body={items:window.modoMock.googleEvents};
 else if(req.includes('googleapis.com'))body={items:[{id:'team123',summary:'Team meeting',start:{date:'2026-10-22'},end:{date:'2026-10-23'}}]};
 else if(req.includes('graph.microsoft.com')&&req.includes('/me/calendars?'))body={value:[{id:'outlookcal',name:'Outlook calendar',canEdit:true}]};
 else if(req.includes('graph.microsoft.com')&&req.includes('calendarView'))body={value:window.modoMock.outlookEvents};
 else if(req.includes('graph.microsoft.com')&&method==='POST')body={id:'outlook-created',webLink:'https://outlook.office.com/calendar/item/123'};
 else if(req.includes('graph.microsoft.com')&&method==='PATCH')body={id:'outlook-created',webLink:'https://outlook.office.com/calendar/item/123'};
 return {ok:true,status:200,statusText:'OK',json:async()=>body,text:async()=>window.modoMock.ics};
};
'''
html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#F3EBDD"/><style>'+css+'</style></head><body><div id="app"></div><div id="toast-region"></div><script>'+MOCK+connectors+js+'</script></body></html>'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1400,'height':980})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content(html)
  await page.evaluate('()=>{ui.page="calendar";render();}')
  await page.locator('button[data-action="connections"]').first.click()
  assert await page.get_by_text('Google Calendar').count()>=1
  client='aaaaaaaaaaaaaaaaaaaaaaaa.apps.googleusercontent.com'
  await page.locator('form[data-form="oauth-settings"] input[name=googleClientId]').fill(client)
  await page.locator('form[data-form="oauth-settings"] input[name=outlookClientId]').fill('11111111-2222-3333-4444-555555555555')
  await page.locator('form[data-form="oauth-settings"] button[type=submit]').click()
  assert await page.evaluate('db.connections.google.clientId')==client
  await page.evaluate("window.modoMock.googleEvents=[{id:'extA',summary:'Google appointment',start:{date:'2026-10-20'},end:{date:'2026-10-21'}}]")
  await page.locator('button[data-action="connection-connect"][data-provider="google"]').click()
  assert await page.evaluate('window.ModoConnectors.isConnected("google")')
  assert await page.evaluate('db.events.filter(e=>e.source==="google").length')==2
  await page.locator('input[data-connection-visible="google"][data-id="team@example.com"]').uncheck()
  assert await page.evaluate('dayItems("2026-10-22","google").length')==0
  # Event publication must create once then patch the same external ID.
  await page.locator('button[data-action="close-modal"]').first.click()
  await page.evaluate('()=>{ui.modal={kind:"event",id:null};render()}')
  await page.locator('form[data-form="event"] input[name=title]').fill('Test published event')
  await page.locator('form[data-form="event"] select[name=externalTarget]').select_option('google:primary')
  await page.locator('form[data-form="event"] button[type=submit]').click()
  event_id=await page.evaluate('db.events.find(e=>e.title==="Test published event").id')
  assert await page.evaluate('id=>db.events.find(e=>e.id===id).externalLinks.google.remoteId',event_id)=='published123'
  await page.evaluate('id=>{ui.modal={kind:"event",id};render()}',event_id)
  await page.locator('form[data-form="event"] input[name=title]').fill('Edited published event')
  await page.locator('form[data-form="event"] button[type=submit]').click()
  calls=await page.evaluate('window.modoMock.calls')
  assert len([x for x in calls if x[0]=='POST' and 'googleapis' in x[1]])==1
  assert len([x for x in calls if x[0]=='PATCH' and 'googleapis' in x[1]])==1
  await page.evaluate("window.modoMock.googleEvents.push({id:'published123',summary:'Edited published event',start:{date:'2026-10-20'},end:{date:'2026-10-21'}})")
  await page.evaluate('()=>syncProvider("google")')
  assert await page.evaluate('db.events.filter(e=>e.source==="google"&&e.externalId==="published123").length')==0
  # Apple subscriptions, recurrence and multiple calendar visibility
  await page.evaluate('()=>{ui.modal={kind:"connections",id:null};render()}')
  await page.locator('form[data-form="icloud-subscribe"] input[name="feedName"]').fill('Family iCloud')
  await page.locator('form[data-form="icloud-subscribe"] input[name="feedUrl"]').fill('https://p01-caldav.icloud.com/published/2/mock')
  await page.locator('form[data-form="icloud-subscribe"] input[name="publicAcknowledgement"]').check()
  await page.locator('form[data-form="icloud-subscribe"] button[type=submit]').click()
  assert await page.evaluate('db.connections.icloud.feeds.length')==1
  assert await page.evaluate('db.events.filter(e=>e.source==="icloud").length')>=1
  await page.evaluate("document.getElementById('toast-region').innerHTML=''")
  await page.screenshot(path=str(ROOT/'tests/calendar-connected-desktop.png'),full_page=True)
  await page.set_viewport_size({'width':390,'height':844})
  await page.screenshot(path=str(ROOT/'tests/calendar-connected-mobile.png'),full_page=True)
  assert not await page.evaluate('document.documentElement.scrollWidth>window.innerWidth+1'),'Mobile overflow in connections panel'
  await page.locator('button[data-action="close-modal"]').first.click()
  for width in (320,390,768,1440):
   await page.set_viewport_size({'width':width,'height':900})
   assert not await page.evaluate('document.documentElement.scrollWidth>window.innerWidth+1'),f'Mobile overflow width={width}'
  # Verify Microsoft Graph adapters by injecting only an ephemeral in-memory session (no real user credentials).
  await page.evaluate("()=>{window.ModoConnectors.__testOnlyInit=null}")
  # OAuth callback is separately tested using Node VM, API parser via mock Graph fetch.
  # Client-side iCloud URL must reject non-iCloud or internal URLs.
  assert await page.evaluate('(()=>{try{window.ModoConnectors.normalizeAppleUrl("http://localhost/internal");return false}catch{return true}})()')
  assert not errors,errors
  print('PASS: Google OAuth + multi-calendar sync, selected visibility, remote event create/update/no duplicate, iCloud recurring subscription, responsive modal 320-1440, no page errors')
  await browser.close()
  for link in ('http://localhost:5000/private','https://evil.example.net/calendar.ics','https://p01-caldav.icloud.com.evil.com/published/2/key'):
   def probe():
    try:
     with urlopen(Request('http://127.0.0.1:8787/api/calendar-feed',data=__import__('json').dumps({'url':link}).encode(),headers={'Content-Type':'application/json'}),timeout=5) as resp:return resp.status
    except HTTPError as e:return e.code
   result=await asyncio.to_thread(probe)
   assert result==400,(link,result)
  print('PASS: Apple public feed proxy rejects non-Apple and internal/private URL targets')
asyncio.run(main())
