"""Real local HTTP auth/workspace/isolation E2E tests. Run with MODO server on 8877."""
import asyncio, json, secrets, requests, os
from playwright.async_api import async_playwright
BASE='http://localhost:8877'; H={'Origin':BASE,'X-MODO-Request':'1','Content-Type':'application/json'}
def post(sess,path,data,csrf=None,method='post'):
 h=dict(H)
 if csrf:h['X-CSRF-Token']=csrf
 return sess.request(method,BASE+path,headers=h,json=data,timeout=12)

async def main():
 a,b=requests.Session(),requests.Session()
 em1='a'+secrets.token_hex(5)+'@example.com';em2='b'+secrets.token_hex(5)+'@example.com';pwd='CorrectLongPassword123!'
 r=post(a,'/api/auth/register',{'name':'Megan Test','email':em1,'password':pwd});assert r.status_code==201,(r.status_code,r.text)
 csrf=r.json()['csrf'];assert a.get(BASE+'/api/auth/session').json()['user']['email']==em1
 ra=post(a,'/api/workspace',{'revision':0,'data':{'version':1,'settings':{},'tasks':[{'id':'private1','title':'Only user A'}],'modes':[],'events':[],'people':[],'meetups':[],'rituals':[],'recipes':[],'mealPlans':[]}},csrf,'put');assert ra.status_code==200,ra.text
 assert ra.json()['revision']==1
 r=post(b,'/api/auth/register',{'name':'Other Test','email':em2,'password':pwd});assert r.status_code==201,r.text
 csrf2=r.json()['csrf'];assert b.get(BASE+'/api/workspace').json()['data'] is None,'User B saw user A data'
 r=post(b,'/api/workspace',{'revision':0,'data':{'version':1,'settings':{},'tasks':[],'modes':[],'events':[],'people':[],'meetups':[],'rituals':[],'recipes':[],'mealPlans':[]}},csrf2,'put');assert r.status_code==200,r.text
 assert len(a.get(BASE+'/api/workspace').json()['data']['tasks'])==1
 stale=post(a,'/api/workspace',{'revision':0,'data':{'version':1,'settings':{},'tasks':[],'modes':[],'events':[],'people':[],'meetups':[],'rituals':[],'recipes':[],'mealPlans':[]}},csrf,'put')
 assert stale.status_code==409,stale.text
 cross=post(a,'/api/workspace',{'revision':1,'data':{'version':1,'settings':{},'tasks':[],'modes':[],'events':[],'people':[],'meetups':[],'rituals':[],'recipes':[],'mealPlans':[]}},None,'put');assert cross.status_code==403
 forbidden=a.get(BASE+'/server.mjs');assert forbidden.status_code==404
 assert requests.get(BASE+'/api/workspace').status_code==401
 assert post(a,'/api/auth/change-password',{'currentPassword':pwd,'newPassword':'NewLongPassword789!'},csrf).status_code==200
 assert post(a,'/api/auth/logout',{},csrf).status_code==200
 assert a.get(BASE+'/api/auth/session').status_code==401
 assert post(a,'/api/auth/login',{'email':em1,'password':pwd}).status_code==401
 assert post(a,'/api/auth/login',{'email':em1,'password':'NewLongPassword789!'}).status_code==200
 print('PASS: signup, sessions, scoped storage, optimistic conflicts, CSRF, password change, logout, failed old login, private files')
 if os.getenv('MODO_SKIP_BROWSER')=='1':return
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [390,1440]:
   context=await browser.new_context(viewport={'width':width,'height':900},device_scale_factor=1)
   page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto(BASE+'/index.html',wait_until='domcontentloaded');await page.wait_for_url('**/login.html*',timeout=15000)
   assert await page.locator('#auth-heading').inner_text()=='Welcome back.'
   await page.locator('button[data-mode="signup"]').click()
   await page.locator('#auth-name').fill('Browser Owner')
   await page.locator('#auth-email').fill('browser'+str(width)+secrets.token_hex(4)+'@example.com')
   await page.locator('#auth-password').fill(pwd)
   await page.locator('#auth-submit').click()
   await page.wait_for_url('**/index.html*',timeout=25000)
   await page.wait_for_selector('.shell',timeout=25000)
   assert await page.locator('.sidebar-profile b').inner_text()=='Browser Owner'
   await page.evaluate('()=>{go("tasks")}')
   await page.locator('.page-hero [data-action="open-task"]').click()
   await page.locator('form[data-form="task"] input[name="title"]').fill('Protected task')
   await page.locator('form[data-form="task"] button[type="submit"]').click()
   await page.wait_for_timeout(1300)
   status=await page.evaluate('()=>({tasks:db.tasks.map(x=>x.title),unsaved:window.ModoAccount.hasUnsaved()})')
   assert 'Protected task' in status['tasks'],status
   await page.reload(wait_until='domcontentloaded');await page.wait_for_selector('.shell',timeout=20000)
   assert await page.evaluate('db.tasks.some(t=>t.title==="Protected task")')
   await page.evaluate('()=>go("settings")')
   await page.locator('[data-action="logout"]').first.click()
   await page.wait_for_url('**/login.html*',timeout=15000)
   assert not errors,errors
   if width==390:await page.screenshot(path='/mnt/data/modo-v3/tests/signup-mobile.png',full_page=True)
   print('PASS browser',width,'signup -> app -> task persisted on server -> refresh -> logout')
   await context.close()
  await browser.close()
asyncio.run(main())
