from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'styles.css').read_text(); js=(root/'app.js').read_text()
storage="""const __dbStore=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__dbStore.get(k)||null,setItem:(k,v)=>__dbStore.set(k,String(v)),removeItem:k=>__dbStore.delete(k),clear:()=>__dbStore.clear()}});"""
markup='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#F3EBDD"><style>'+css+'</style></head><body><div id="app"></div><div id="toast-region"></div><script>'+storage+js+'</script></body></html>'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w in [320,375,390,430,768,1024,1280,1440]:
  page=browser.new_page(viewport={'width':w,'height':900})
  err=[];page.on('pageerror',lambda e:err.append(str(e)))
  page.set_content(markup)
  for page_name in ['today','tasks','calendar','people','modes','rituals','meals','insights','settings','more']:
   page.evaluate('(name)=>{ui.page=name;render()}',page_name)
   assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),f'Overflow {w} {page_name}'
  assert not err,(w,err)
  print('Responsive PASS',w,'px × 10 screens')
  page.close()
 browser.close()
