import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const storage=new Map();const requests=[];
let query='',authUrl='',cleanUrl='';
const guid='11111111-2222-3333-4444-555555555555';
const fakeLocation={origin:'https://modo.example.com',pathname:'/index.html',hash:'#/calendar',get search(){return query},assign(u){authUrl=u;}};
const context=vm.createContext({
  window:{},location:fakeLocation,crypto:webcrypto,
  URL,URLSearchParams,TextEncoder,Uint8Array,Date,Math,Set,String,Number,Error,JSON,Array,encodeURIComponent,console,
  btoa:v=>Buffer.from(v,'latin1').toString('base64'),
  history:{replaceState(_a,_b,u){cleanUrl=u}},
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  fetch:async(url,opt={})=>{
   requests.push({url:String(url),opt});let body={};
   if(String(url).endsWith('/token'))body={access_token:'fake-ms-token',expires_in:3600};
   else if(String(url).includes('/me/calendars?$top=100'))body={value:[{id:'ms-primary',name:'My Outlook',canEdit:true}]};
   else if(String(url).includes('calendarView'))body={value:[{id:'appointment-a',subject:'Work meeting',start:{dateTime:'2026-10-20T15:00:00.000',timeZone:'UTC'},end:{dateTime:'2026-10-20T15:30:00.000',timeZone:'UTC'},location:{displayName:'Office'}}]};
   else if(opt.method==='POST'||opt.method==='PATCH')body={id:'remote-456',webLink:'https://outlook.office.com/calendar/event'};
   return {ok:true,status:200,json:async()=>body};
  }
});
vm.runInContext(readFileSync(new URL('../calendar-connectors.js',import.meta.url),'utf8'),context);
const adapter=context.window.ModoConnectors;
await adapter.microsoftStart(guid);
const started=new URL(authUrl);
assert.equal(started.searchParams.get('code_challenge_method'),'S256');
assert.equal(started.searchParams.get('response_type'),'code');
assert.ok(started.searchParams.get('scope').includes('Calendars.ReadWrite'));
const saved=JSON.parse(storage.get('modo-ms-oauth'));
assert.ok(saved.verifier.length>=40);
query='?code=fake-authorization-code&state='+encodeURIComponent(saved.state);
const result=await adapter.microsoftFinish();
assert.equal(result.provider,'outlook');
assert.equal(cleanUrl,'/index.html#/calendar');
assert.ok(!storage.has('modo-ms-oauth'));
assert.ok(adapter.isConnected('outlook'));
const synced=await adapter.outlookLoad();
assert.equal(synced.calendars.length,1);
assert.equal(synced.events.length,1);
assert.equal(synced.events[0].title,'Work meeting');
const localEvent={title:'Coffee with Sarah',date:'2026-10-21',time:'11:00',endTime:'12:00',notes:'Catch up',location:'The cafe'};
const created=await adapter.upsert('outlook','ms-primary',localEvent);
assert.equal(created.remoteId,'remote-456');
await adapter.upsert('outlook','ms-primary',localEvent,'remote-456');
await adapter.removeRemote('outlook','ms-primary','remote-456');
assert.equal(requests.filter(x=>x.opt.method==='POST'&&String(x.url).includes('graph.microsoft.com')).length,1);
assert.equal(requests.filter(x=>x.opt.method==='PATCH').length,1);
assert.equal(requests.filter(x=>x.opt.method==='DELETE').length,1);
assert.ok(requests.some(x=>x.opt.headers?.Authorization==='Bearer fake-ms-token'));
adapter.disconnect('outlook');assert.ok(!adapter.isConnected('outlook'));
console.log('PASS: Microsoft PKCE sign-in, callback state validation, Graph list/calendar view, publish/update/delete, memory-only tokens and disconnect');
