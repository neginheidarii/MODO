/* Authenticated MODO workspace bootstrap + ordered versioned server saves. */
(async()=>{
 const app=document.getElementById('app');
 app.innerHTML='<div class="boot-screen"><div class="boot-logo">modo.</div><p>Opening your space...</p></div>';
 const get=async(url)=>{const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});if(r.status===401){location.replace('./login.html');return null;}if(!r.ok)throw Error('Unable to open your workspace.');return r.json();};
 try{
  const session=await get('./api/auth/session');if(!session)return;
  const workspace=await get('./api/workspace');if(!workspace)return;
  let revision=workspace.revision,dirty=null,working=false,halted=false,timer=null;
  let banner=null;
  function status(message,type='info'){
   if(!banner){banner=document.createElement('div');banner.className='sync-alert';banner.setAttribute('role','status');document.body.appendChild(banner);}
   banner.textContent=message;banner.dataset.status=type;banner.hidden=!message;
  }
  async function flush(){
   if(working){await new Promise(resolve=>{const w=setInterval(()=>{if(!working){clearInterval(w);resolve();}},60);});}if(halted||dirty===null)return;
   working=true;const payload=dirty;dirty=null;
   try{
    const r=await fetch('./api/workspace',{method:'PUT',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-MODO-Request':'1','X-CSRF-Token':session.csrf},body:JSON.stringify({revision,data:JSON.parse(payload)})});
    if(r.status===401){halted=true;status('Your session ended. Export your workspace before signing in again.','error');return;}
    if(r.status===409){halted=true;status('This account was changed in another tab/device. Export a backup, then reload to avoid overwriting data.','error');return;}
    if(!r.ok)throw Error('Save failed ('+r.status+')');
    revision=(await r.json()).revision;
    status('');
   }catch(err){dirty=dirty??payload;status('Changes not saved to the server. Check your connection; MODO will retry.','error');}
   finally{working=false;if(dirty!==null&&!halted)timer=setTimeout(flush,3500);}
  }
  window.ModoAccount={user:session.user,csrf:session.csrf,save(data){if(halted)return;dirty=JSON.stringify(data);clearTimeout(timer);timer=setTimeout(flush,450);},flush,async logout(){await flush();if(dirty!==null||halted&&!location.href.includes('login')){if(!confirm('Some changes may not be saved. Sign out anyway?'))return;}const r=await fetch('./api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-MODO-Request':'1','X-CSRF-Token':session.csrf},body:'{}'});if(!r.ok)throw Error('Could not sign out.');location.replace('./login.html');},async changePassword(currentPassword,newPassword){return api('./api/auth/change-password',{currentPassword,newPassword});},async deleteAccount(password){await api('./api/account',{password},'DELETE');location.replace('./login.html');},hasUnsaved(){return dirty!==null||working;},revision:()=>revision};
  async function api(path,data,method='POST'){const r=await fetch(path,{method,headers:{'Content-Type':'application/json','X-MODO-Request':'1','X-CSRF-Token':session.csrf},body:JSON.stringify(data)});const result=await r.json().catch(()=>({}));if(!r.ok)throw Error(result.error||'Request failed');return result;}
  window.__MODO_BOOTSTRAP={workspace:workspace.data,revision,user:session.user};
  const script=document.createElement('script');script.src='./app.js';script.defer=true;document.body.appendChild(script);
  window.addEventListener('online',()=>{if(dirty!==null&&!halted)flush();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty!==null&&!halted)flush();});
 }catch(error){console.error(error);app.innerHTML='<div class="boot-screen"><div class="boot-logo">modo.</div><p>Could not connect to your private workspace.</p><button class="button button-primary" id="retry-boot">Retry connection</button></div>';document.getElementById('retry-boot').addEventListener('click',()=>location.reload());}
})();
