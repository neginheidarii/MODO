import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
r=Path(__file__).resolve().parents[1]
raw=(r/'login.html').read_text().replace('<link rel="stylesheet" href="./styles.css">',"<style>"+(r/'styles.css').read_text()+"</style>")
raw=raw.replace('<script src="./auth.js" defer></script>','')
raw=raw.replace('<link rel="preconnect" href="https://fonts.googleapis.com">','')
raw=raw.replace('<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">','')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in (390,1440):
   pg=await b.new_page(viewport={'width':width,'height':900});errs=[];pg.on('pageerror',lambda e: errs.append(str(e)))
   await pg.set_content(raw)
   await pg.evaluate('()=>{window.fetch=async()=>({ok:false,json:async()=>({error:"Incorrect account"})})}')
   await pg.add_script_tag(content=(r/'auth.js').read_text())
   assert await pg.locator('#auth-heading').inner_text()=='Welcome back.'
   await pg.locator('button[data-mode="signup"]').click()
   assert await pg.locator('#auth-heading').inner_text()=='A little more intentional.'
   assert await pg.locator('#auth-name-field').is_visible()
   assert not await pg.evaluate('document.documentElement.scrollWidth > window.innerWidth+1')
   await pg.screenshot(path=str(r/'tests'/f'auth-signup-{width}.png'),full_page=True)
   await pg.locator('#auth-email').fill('hi@example.com')
   await pg.locator('#auth-password').fill('verygoodpassword123')
   await pg.locator('#auth-name').fill('Megan')
   await pg.locator('#auth-submit').click()
   assert await pg.locator('#auth-message').inner_text()=='Incorrect account'
   assert not errs,errs
   print('PASS UI: signup mobile/desktop, required validation, error message, overflow',width)
   await pg.close()
  await b.close()
asyncio.run(main())
