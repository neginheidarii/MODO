'use strict';
(()=>{
 const params=new URLSearchParams(location.search),form=document.getElementById('auth-form'),heading=document.getElementById('auth-heading'),sub=document.getElementById('auth-subheading'),message=document.getElementById('auth-message');
 const byId=id=>document.getElementById(id), tabs=byId('auth-tabs');let mode=['signup','forgot','reset','verify'].includes(params.get('mode'))?params.get('mode'):'login';
 const options={login:['Welcome back.','Your space is just as you left it.','Sign in'],signup:['A little more intentional.','Create your space. Your goals, your pace.','Create my account'],forgot:['Find your way back.','We will email you a secure recovery link.','Send reset link'],reset:['Choose a new password.','At least 12 characters for your protection.','Reset password'],verify:['One final step.','Verifying your email address.','Verify email']};
 function showMessage(text,kind='error'){message.hidden=!text;message.textContent=text;message.dataset.kind=kind;}
 function setMode(next){mode=next;try{if(location.protocol==='http:'||location.protocol==='https:')history.replaceState({},'',location.pathname+(mode==='login'?'':'?mode='+mode+(params.has('token')?'&token='+encodeURIComponent(params.get('token')):'')));}catch(_){/* unsupported preview URL */}const [h,s,b]=options[mode];heading.textContent=h;sub.textContent=s;byId('auth-submit').textContent=b;tabs.hidden=!['login','signup'].includes(mode);tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.mode===mode));byId('auth-name-field').hidden=mode!=='signup';byId('auth-name').required=mode==='signup';byId('auth-password-field').hidden=mode==='forgot'||mode==='verify';byId('auth-password').required=mode!=='forgot'&&mode!=='verify';byId('auth-email-field').hidden=mode==='reset'||mode==='verify';byId('auth-email').required=mode!=='reset'&&mode!=='verify';byId('forgot-link').hidden=mode!=='login';byId('verification-help').hidden=mode!=='login';byId('auth-back').hidden=['login','signup'].includes(mode);byId('auth-password').autocomplete=mode==='signup'?'new-password':mode==='reset'?'new-password':'current-password';showMessage('');}
 async function request(path,data){const r=await fetch('./api/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-MODO-Request':'1'},body:JSON.stringify(data),credentials:'same-origin',cache:'no-store'});const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||'Request failed. Please try again.');return x;}
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)setMode(b.dataset.mode);});byId('forgot-link').addEventListener('click',()=>setMode('forgot'));byId('back-login').addEventListener('click',()=>setMode('login'));
 byId('resend-verification').addEventListener('click',async()=>{const email=byId('auth-email').value.trim();if(!email){showMessage('Enter your email address first.');return;}try{const result=await request('resend-verification',{email});showMessage(result.message,'success');}catch(e){showMessage(e.message);}});
 form.addEventListener('submit',async e=>{e.preventDefault();const submit=byId('auth-submit');submit.disabled=true;showMessage('');try{
  const email=byId('auth-email').value.trim(),password=byId('auth-password').value,name=byId('auth-name').value.trim(),token=params.get('token');let x;
  if(mode==='signup')x=await request('register',{name,email,password});
  if(mode==='login')x=await request('login',{email,password});
  if(mode==='forgot')x=await request('forgot',{email});
  if(mode==='reset')x=await request('reset',{token,password});
  if(mode==='verify')x=await request('verify',{token});
  if(x.user){location.replace('./index.html#/today');return;}
  if(mode==='signup'&&!x.user){setMode('login');showMessage(x.message||'Check your inbox to verify your email.','success');}
  else if(mode==='forgot'||mode==='reset'||mode==='verify'){if(mode==='reset'||mode==='verify')setMode('login');showMessage(x.message||'Request completed.','success');}
 }catch(err){showMessage(err.message);}finally{submit.disabled=false;}});
 setMode(mode);
 if(mode==='verify'&&params.get('token')){form.requestSubmit();}
 if(mode==='reset'&&!params.get('token'))showMessage('Reset link is missing. Please request another.');
})();
