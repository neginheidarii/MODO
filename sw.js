const CACHE='modo-shell-v3';
const SHELL=['./','./index.html','./login.html','./styles.css','./app.js','./boot.js','./auth.js','./calendar-connectors.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request, url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/'))return;
 e.respondWith(fetch(req).then(r=>{if(r.ok&&r.type==='basic'){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return r;}).catch(()=>caches.match(req).then(x=>x||Response.error())));
});
