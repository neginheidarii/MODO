import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'styles.css').read_text()
js=(root/'app.js').read_text()
# Isolated in-memory browser origin, because the testing environment blocks URL navigation.
storage="""const __dbStore=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__dbStore.get(k)||null,setItem:(k,v)=>__dbStore.set(k,String(v)),removeItem:k=>__dbStore.delete(k),clear:()=>__dbStore.clear()}});"""
html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#F3EBDD"><style>'+css+'</style></head><body><div id="app"></div><div id="toast-region"></div><script>'+storage+'\n'+js+'</script></body></html>'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for size in [{'width':1440,'height':900},{'width':390,'height':844},{'width':320,'height':690}]:
   page=await browser.new_page(viewport=size,device_scale_factor=1)
   errors=[]
   page.on('pageerror',lambda x:errors.append(str(x)))
   await page.set_content(html,wait_until='domcontentloaded')
   await page.wait_for_timeout(500)
   print('VIEWPORT',size['width'],'title',await page.locator('h1').first.text_content(),'errors',errors)
   print('overflow',await page.evaluate('document.documentElement.scrollWidth > window.innerWidth'))
   await page.screenshot(path=str(root/'tests'/f'screenshot-{size["width"]}.png'),full_page=True)
   for route in ['tasks','calendar','people','modes','rituals','meals','insights','settings','more']:
    await page.evaluate('p=>{ui.page=p;render()}',route)
    await page.wait_for_timeout(60)
    print('route',route,'headline',await page.locator('h1').first.text_content(),'overflow',await page.evaluate('document.documentElement.scrollWidth > window.innerWidth'),'errors',errors)
    if route in ['calendar','meals'] and size['width'] in [1440,390]:await page.screenshot(path=str(root/'tests'/f'screenshot-{route}-{size["width"]}.png'),full_page=True)
   await page.close()
  await browser.close()
asyncio.run(main())
