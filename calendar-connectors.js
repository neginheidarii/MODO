/* MODO Calendar connectors v2. Provider tokens stay in JavaScript memory, never localStorage.
   Google: official Google Identity Services OAuth token client.
   Microsoft: OAuth 2.0 authorization code with PKCE for SPA (no client secret).
   iCloud: read-only PUBLIC iCalendar share via the allowlisted local proxy.
*/
(() => {
 'use strict';
 const GOOGLE_SCOPES='https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events';
 const MICROSOFT_SCOPES='Calendars.ReadWrite User.Read';
 const MS_AUTH='https://login.microsoftonline.com/common/oauth2/v2.0';
 const GRAPH='https://graph.microsoft.com/v1.0';
 const sessions={google:{token:'',until:0},outlook:{token:'',until:0}};
 const pad=n=>String(n).padStart(2,'0');
 const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
 const timeKey=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
 const errorText=(value)=>typeof value==='string'?value:String(value?.message||'Calendar provider error');
 const localeTZ=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
 function isConnected(provider){const s=sessions[provider];return Boolean(s?.token&&s.until>Date.now()+10000);}
 function disconnect(provider){if(provider==='google'&&sessions.google.token&&window.google?.accounts?.oauth2?.revoke){try{window.google.accounts.oauth2.revoke(sessions.google.token,()=>{});}catch{}}if(sessions[provider]){sessions[provider].token='';sessions[provider].until=0;}}
 function assertId(provider,id){if(provider==='google'&&!/^[\w.-]{20,}\.apps\.googleusercontent\.com$/.test(id||''))throw new Error('Enter your Google OAuth Web Client ID ending in .apps.googleusercontent.com.');if(provider==='outlook'&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id||''))throw new Error('Enter your Microsoft Entra Application (client) ID (a UUID).');}
 function ensureGoogleScript(){return new Promise((resolve,reject)=>{if(window.google?.accounts?.oauth2){resolve();return;}let script=document.querySelector('script[data-google-identity]');if(!script){script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.dataset.googleIdentity='true';document.head.appendChild(script);}const fail=()=>reject(new Error('Could not load Google sign-in. Check your network and try again.'));script.addEventListener('load',()=>window.google?.accounts?.oauth2?resolve():fail(),{once:true});script.addEventListener('error',fail,{once:true});setTimeout(()=>{if(!window.google?.accounts?.oauth2)reject(new Error('Google sign-in is still loading. Try again.'));},10000);});}
 async function googleConnect(clientId){assertId('google',clientId);await ensureGoogleScript();return new Promise((resolve,reject)=>{let settled=false;const client=window.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:GOOGLE_SCOPES,callback:r=>{if(settled)return;settled=true;if(r?.access_token){sessions.google.token=r.access_token;sessions.google.until=Date.now()+(Number(r.expires_in)||3000)*1000;resolve(true);}else reject(new Error(r?.error_description||r?.error||'Google authorization was not completed.'));},error_callback:e=>{if(!settled){settled=true;reject(new Error(e?.message||e?.type||'Google sign-in was cancelled.'));}}});try{client.requestAccessToken({prompt:'consent'});}catch(e){reject(e);}});}
 function redirectUri(){return location.origin+location.pathname;}
 function randomUrlSafe(bytes=32){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 async function pkceChallenge(v){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 async function microsoftStart(clientId){assertId('outlook',clientId);if(!crypto?.subtle)throw new Error('Microsoft sign-in requires HTTPS or localhost.');const verifier=randomUrlSafe(64),challenge=await pkceChallenge(verifier),state=randomUrlSafe(24);sessionStorage.setItem('modo-ms-oauth',JSON.stringify({state,verifier,clientId,redirectUri:redirectUri(),started:Date.now(),returnHash:location.hash||'#/calendar'}));const url=new URL(MS_AUTH+'/authorize');url.searchParams.set('client_id',clientId);url.searchParams.set('response_type','code');url.searchParams.set('redirect_uri',redirectUri());url.searchParams.set('response_mode','query');url.searchParams.set('scope',MICROSOFT_SCOPES);url.searchParams.set('state',state);url.searchParams.set('code_challenge',challenge);url.searchParams.set('code_challenge_method','S256');location.assign(url.href);}
 async function microsoftFinish(){const query=new URLSearchParams(location.search);if(!query.has('state')&&!query.has('code')&&!query.has('error'))return null;let tx;try{tx=JSON.parse(sessionStorage.getItem('modo-ms-oauth')||'null');}catch{tx=null;}if(!tx){history.replaceState(null,'',location.pathname+(location.hash||'#/calendar'));throw new Error('Microsoft sign-in session expired. Please reconnect.');}sessionStorage.removeItem('modo-ms-oauth');const incomingState=query.get('state'),error=query.get('error');history.replaceState(null,'',location.pathname+(tx.returnHash||'#/calendar'));
  if(!incomingState||incomingState!==tx.state||Date.now()-tx.started>600000)throw new Error('Microsoft sign-in validation failed. Please reconnect.');
  if(error)throw new Error(query.get('error_description')||error);
  if(!query.get('code'))throw new Error('Microsoft did not return an authorization code.');
  const data=new URLSearchParams({client_id:tx.clientId,scope:MICROSOFT_SCOPES,code:query.get('code'),redirect_uri:tx.redirectUri,grant_type:'authorization_code',code_verifier:tx.verifier});
  const response=await fetch(MS_AUTH+'/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data});const body=await response.json().catch(()=>({}));
  if(!response.ok||!body.access_token)throw new Error(body.error_description||'Microsoft token exchange failed. The redirect URI must be registered as a SPA.');
  sessions.outlook.token=body.access_token;sessions.outlook.until=Date.now()+(Number(body.expires_in)||3600)*1000;
  return {provider:'outlook',clientId:tx.clientId};
 }
 async function providerFetch(provider,url,options={}){
  if(!isConnected(provider))throw new Error(`${provider==='google'?'Google':'Microsoft'} access expired. Please reconnect to sync.`);
  if(provider==='google'&&!url.startsWith('https://www.googleapis.com/calendar/v3/'))throw new Error('Unsafe Google API URL.');
  if(provider==='outlook'&&!url.startsWith(GRAPH+'/'))throw new Error('Unsafe Microsoft Graph API URL.');
  const headers={'Authorization':`Bearer ${sessions[provider].token}`,...(provider==='outlook'?{'Prefer':'outlook.timezone="UTC"'}:{}),...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})};
  const resp=await fetch(url,{...options,headers,cache:'no-store'});const body=resp.status===204?{}:await resp.json().catch(()=>({}));
  if(!resp.ok){const msg=body?.error?.message||body?.error_description||resp.statusText||`HTTP ${resp.status}`;throw new Error(`${provider==='google'?'Google':'Outlook'} (${resp.status}): ${msg}`);}
  return body;
 }
 const gapi=(path,opts)=>providerFetch('google',`https://www.googleapis.com/calendar/v3/${path}`,opts);
 const msapi=(path,opts)=>providerFetch('outlook',GRAPH+path,opts);
 function range(){const start=new Date(),end=new Date();start.setDate(start.getDate()-90);start.setHours(0,0,0,0);end.setDate(end.getDate()+365);end.setHours(23,59,59,0);return {start:start.toISOString(),end:end.toISOString()};}
 function localFromIso(value){if(!value)return {date:'',time:''};const d=new Date(value);return Number.isNaN(d.valueOf())?{date:'',time:''}:{date:dateKey(d),time:timeKey(d)};}
 function googleNormalize(e,c){const isAllDay=Boolean(e.start?.date&&!e.start?.dateTime);const start=isAllDay?{date:e.start.date,time:''}:localFromIso(e.start?.dateTime);const end=e.end?.dateTime?localFromIso(e.end.dateTime):{time:''};return {title:e.summary||'(Untitled)',date:start.date,time:start.time,endTime:end.date===start.date?end.time:'',location:e.location||'',notes:e.description||'',externalId:e.id,externalUid:e.iCalUID||e.id,calendarId:c.id,calendarName:c.name,source:'google',readonly:true,externalUrl:e.htmlLink||'',allDay:isAllDay};}
 function outlookNormalize(e,c){const isAllDay=Boolean(e.isAllDay);const raw=e.start?.dateTime||'';const dt=raw?raw.replace(/(\.\d{3})\d+/,'$1'):'';const en=(e.end?.dateTime||'').replace(/(\.\d{3})\d+/,'$1');const start=isAllDay?{date:dt.slice(0,10),time:''}:localFromIso(dt+(dt.endsWith('Z')?'':'Z'));const end=isAllDay?{date:'',time:''}:localFromIso(en+(en.endsWith('Z')?'':'Z'));return {title:e.subject||'(Untitled)',date:start.date,time:start.time,endTime:end.date===start.date?end.time:'',location:e.location?.displayName||'',notes:(e.bodyPreview||'').slice(0,2000),externalId:e.id,externalUid:e.iCalUId||e.id,calendarId:c.id,calendarName:c.name,source:'outlook',readonly:true,externalUrl:e.webLink||'',allDay:isAllDay};}
 async function googleLoad(){const collection=await gapi('users/me/calendarList?maxResults=250');const calendars=(collection.items||[]).map(c=>({id:c.id,name:c.summary||'Google calendar',canWrite:['owner','writer'].includes(c.accessRole),color:c.backgroundColor||'#59654D',provider:'google'}));const {start,end}=range();const data=[],failures=[];for(const c of calendars){try{let page='',count=0;do{const query=new URLSearchParams({timeMin:start,timeMax:end,singleEvents:'true',maxResults:'250',showDeleted:'false'});if(page)query.set('pageToken',page);const res=await gapi(`calendars/${encodeURIComponent(c.id)}/events?${query}`);data.push(...(res.items||[]).filter(e=>e.status!=='cancelled').map(e=>googleNormalize(e,c)).filter(e=>e.date));page=res.nextPageToken||'';count++;}while(page&&count<12);}catch(e){failures.push({calendarId:c.id,message:errorText(e)});}}
  return {calendars,events:data,failures};}
 async function outlookLoad(){const calendars=[];let url=GRAPH+'/me/calendars?$top=100',n=0;while(url&&n++<10){const body=await providerFetch('outlook',url);calendars.push(...(body.value||[]).map(c=>({id:c.id,name:c.name||'Outlook calendar',canWrite:c.canEdit!==false,color:'#879B79',provider:'outlook'})));url=body['@odata.nextLink']||null;}const {start,end}=range(),data=[],failures=[];for(const c of calendars){try{const query=new URLSearchParams({startDateTime:start,endDateTime:end,'$top':'100'});let page=GRAPH+`/me/calendars/${encodeURIComponent(c.id)}/calendarView?`+query,n=0;while(page&&n++<25){const res=await providerFetch('outlook',page);data.push(...(res.value||[]).filter(e=>!e.isCancelled).map(e=>outlookNormalize(e,c)).filter(e=>e.date));page=res['@odata.nextLink']||null;}}catch(e){failures.push({calendarId:c.id,message:errorText(e)});}}return {calendars,events:data,failures};}
 const isoUtc=(d,t)=>new Date(`${d}T${t||'09:00'}:00`).toISOString();
 function eventTimes(e){let endTime=e.endTime||'';if(!endTime||endTime<=e.time){const z=new Date(`${e.date}T${e.time||'09:00'}:00`);z.setMinutes(z.getMinutes()+60);return {start:isoUtc(e.date,e.time),end:z.toISOString()};}return {start:isoUtc(e.date,e.time),end:isoUtc(e.date,endTime)};}
 async function upsert(provider,calendarId,e,remoteId=''){
  if(!e?.date||!e?.title)throw new Error('The event needs a name and date.');
  const z=eventTimes(e);let data;
  if(provider==='google'){
   data={summary:e.title,location:e.location||'',description:e.notes||'',start:{dateTime:z.start,timeZone:'UTC'},end:{dateTime:z.end,timeZone:'UTC'}};
   const path=`calendars/${encodeURIComponent(calendarId)}/events${remoteId?'/'+encodeURIComponent(remoteId):''}`;
   const result=await gapi(path,{method:remoteId?'PATCH':'POST',body:JSON.stringify(data)});return {remoteId:result.id,url:result.htmlLink||''};
  }
  if(provider==='outlook'){
   data={subject:e.title,...(!remoteId&&e.id?{transactionId:String(e.id).slice(0,100)}:{}),body:{contentType:'text',content:e.notes||''},location:{displayName:e.location||''},start:{dateTime:z.start.replace(/Z$/,''),timeZone:'UTC'},end:{dateTime:z.end.replace(/Z$/,''),timeZone:'UTC'}};
   const path=remoteId?`/me/events/${encodeURIComponent(remoteId)}`:`/me/calendars/${encodeURIComponent(calendarId)}/events`;
   const result=await msapi(path,{method:remoteId?'PATCH':'POST',body:JSON.stringify(data)});return {remoteId:result.id,url:result.webLink||''};
  }
  throw new Error('This calendar cannot accept MODO events.');
 }
 async function removeRemote(provider,calendarId,remoteId){if(!remoteId)return;if(provider==='google')await gapi(`calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(remoteId)}`,{method:'DELETE'});else if(provider==='outlook')await msapi(`/me/events/${encodeURIComponent(remoteId)}`,{method:'DELETE'});else throw new Error('Only Google and Outlook events can be deleted through this connection.');}
 function normalizeAppleUrl(input){let raw=String(input||'').trim();if(raw.startsWith('webcal://'))raw='https://'+raw.slice(9);if(!raw.startsWith('https://'))throw new Error('Use the public iCloud calendar webcal:// or https:// link.');let url;try{url=new URL(raw);}catch{throw new Error('Invalid iCloud calendar URL.');}if(!/^p\d+-caldav\.icloud\.com$/i.test(url.hostname)||!url.pathname.startsWith('/published/'))throw new Error('Only public iCloud calendar links (pXX-caldav.icloud.com/published/...) are supported.');if(url.username||url.password||url.port||url.search||url.hash)throw new Error('This calendar URL contains unsupported extra parameters.');return url.href;}
 async function appleFetch(url){const safeUrl=normalizeAppleUrl(url);const response=await fetch('./api/calendar-feed',{method:'POST',headers:{'Content-Type':'application/json','X-MODO-Request':'1','X-CSRF-Token':window.ModoAccount?.csrf||''},body:JSON.stringify({url:safeUrl}),cache:'no-store'}).catch(()=>{throw new Error('Live iCloud subscriptions require the included MODO Node server. Run node server.mjs.');});if(!response.ok){const res=await response.json().catch(()=>({}));throw new Error(res.error||`iCloud calendar feed unavailable (${response.status}). Run node server.mjs.`);}const text=await response.text();if(!text.includes('BEGIN:VCALENDAR'))throw new Error('This link did not return an iCalendar feed.');return text;}
 window.ModoConnectors={isConnected,disconnect,assertId,googleConnect,microsoftStart,microsoftFinish,googleLoad,outlookLoad,upsert,removeRemote,appleFetch,normalizeAppleUrl,localeTZ,range};
})();
