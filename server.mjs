/** MODO v3 secure single-instance web server. Node.js >=22.13; recommend Node 24 LTS.
 * Accounts and workspaces live in Supabase when configured, otherwise in local SQLite.
 * Configure environment as documented in README before public deployment.
 */
import {loadLocalEnv} from './env.mjs';
import http from 'node:http';
import {createReadStream, statSync, existsSync} from 'node:fs';
import {resolve, extname, sep, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {importLocalSqlite, openStore} from './store.mjs';
loadLocalEnv();
const scrypt=promisify(scryptCallback);
const ROOT=dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||8080);
const HOST=process.env.HOST||(process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1');
const PRODUCTION=process.env.NODE_ENV==='production';
const ORIGIN=(process.env.APP_ORIGIN||`http://localhost:${PORT}`).replace(/\/$/,'');
const DATA_DIR=resolve(process.env.MODO_DATA_DIR||join(ROOT,'data'));
const EMAIL_READY=!!(process.env.RESEND_API_KEY&&process.env.RESEND_FROM);
const COOKIE=PRODUCTION?'__Host-modo_session':'modo_session';
if(PRODUCTION){if(!ORIGIN.startsWith('https://'))throw Error('Production requires APP_ORIGIN=https://your-domain');if(!EMAIL_READY)throw Error('Production requires RESEND_API_KEY and RESEND_FROM for email verification and recovery.');}
const store=openStore({dataDir:DATA_DIR});
const now=()=>Date.now(),random=()=>randomBytes(32).toString('base64url'),hash=s=>createHash('sha256').update(s).digest('hex');
const NAME_EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const LIMIT=2_500_000;
const rate=new Map();
function rateLimit(key,limit,period){const ts=now(),bucket=rate.get(key)||{ts,count:0};if(ts-bucket.ts>period){bucket.ts=ts;bucket.count=0;}bucket.count++;rate.set(key,bucket);return bucket.count<=limit;}
setInterval(()=>{const ts=now();for(const [key,v] of rate)if(ts-v.ts>3600_000)rate.delete(key);store.purgeExpired(ts).catch(err=>console.error('Cleanup failed',err?.message));},3600_000).unref();
const HEADERS={
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
 'Content-Security-Policy':"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://accounts.google.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://accounts.google.com https://www.googleapis.com https://graph.microsoft.com https://login.microsoftonline.com; frame-src https://accounts.google.com https://login.microsoftonline.com; manifest-src 'self'"
};
if(PRODUCTION)HEADERS['Strict-Transport-Security']='max-age=31536000; includeSubDomains';
function respond(res,status,payload,extra={}){res.writeHead(status,{...HEADERS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(payload));}
function fail(res,status,message){respond(res,status,{error:message});}
async function readJson(req,limit=LIMIT){if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))throw Object.assign(Error('Expected JSON request body.'),{status:415});let chunks=[],size=0;for await(const part of req){size+=part.length;if(size>limit)throw Object.assign(Error('Request exceeds the size limit.'),{status:413});chunks.push(part);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(Error('Invalid JSON.'),{status:400});}}
function sameOrigin(req){const reqOrigin=req.headers.origin;if(req.headers['sec-fetch-site']==='cross-site')return false;return reqOrigin===ORIGIN;}
function tokenOf(req){const cookies=String(req.headers.cookie||'').split(';').map(v=>v.trim());const raw=cookies.find(c=>c.startsWith(`${COOKIE}=`));return raw?.slice(COOKIE.length+1)||'';}
async function sessionOf(req){const token=tokenOf(req);if(!token||token.length>256)return null;const s=await store.sessionByHash(hash(token));return s?.expires_at>now()&&s.verified?{...s,tokenHash:hash(token)}:null;}
async function createSession(res,userId){const token=random(),csrf=random(),exp=now()+14*86400_000;await store.insertSession(hash(token),userId,csrf,exp);res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; ${PRODUCTION?'Secure; ':''}Max-Age=1209600`);return csrf;}
function clearCookie(res){res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; ${PRODUCTION?'Secure; ':''}Max-Age=0`);}
async function passwordHash(password){const salt=randomBytes(16);const dk=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return `scrypt$32768$${salt.toString('hex')}$${dk.toString('hex')}`;}
async function passwordMatches(password,stored){const [,iter,salt,expected]=String(stored).split('$');if(iter!=='32768'||!salt||!expected)return false;const dk=await scrypt(password,Buffer.from(salt,'hex'),64,{N:32768,r:8,p:1,maxmem:64*1024*1024});const compare=Buffer.from(expected,'hex');return compare.length===dk.length&&timingSafeEqual(dk,compare);}
async function sendEmail(to,subject,html){if(!EMAIL_READY)return false;const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM,to:[to],subject,html})});if(!response.ok){console.error('Email provider error',response.status);return false;}return true;}
async function sendAccountLink(user,kind){const token=random(),expires=now()+(kind==='verify'?24*3600_000:30*60_000);await store.replaceEmailToken(user.id,kind,hash(token),expires);const url=`${ORIGIN}/?mode=${kind}&token=${encodeURIComponent(token)}`;const subject=kind==='verify'?'Verify your MODO email':'Reset your MODO password';const done=await sendEmail(user.email,subject,`<p>${kind==='verify'?'Verify your email address':'Reset your password'} for MODO.</p><p><a href="${url}">Continue securely</a></p><p>This link expires in ${kind==='verify'?'24 hours':'30 minutes'}. If you did not request it, ignore this email.</p>`);if(!PRODUCTION&&!EMAIL_READY)console.log(`[MODO DEV ONLY] ${kind} link for ${user.email}: ${url}`);return done||!PRODUCTION;}
function publicUser(u){return {id:u.id||u.user_id,email:u.email,name:u.display_name};}
const accountRate=(req,kind)=>rateLimit(`${kind}:${req.socket.remoteAddress||'unknown'}`,kind==='login'?18:kind==='register'?6:10,15*60_000);
async function auth(req,res,path,s){
 if(path==='/api/auth/session'&&req.method==='GET'){if(!s)return fail(res,401,'Sign in required.');return respond(res,200,{user:publicUser(s),csrf:s.csrf});}
 if(req.method!=='POST'&&!(path==='/api/account'&&req.method==='DELETE'))return fail(res,405,'Method not allowed.');
 if(!sameOrigin(req)||req.headers['x-modo-request']!=='1')return fail(res,403,'Request blocked by origin protection.');
 if(!accountRate(req,path==='/api/auth/login'?'login':path==='/api/auth/register'?'register':'account'))return fail(res,429,'Too many attempts. Try again later.');
 if(s&&['/api/auth/logout','/api/auth/change-password','/api/account'].includes(path)&&req.headers['x-csrf-token']!==s.csrf)return fail(res,403,'Invalid session protection token.');
 const data=await readJson(req,32_768);
 if(!data||typeof data!=='object'||Array.isArray(data))return fail(res,400,'Expected a JSON object.');
 if(path==='/api/auth/register'){
  const email=String(data.email||'').trim().toLowerCase(),name=String(data.name||'').trim(),password=String(data.password||'');
  if(!NAME_EMAIL.test(email)||email.length>254||name.length<2||name.length>70||password.length<12||password.length>200)return fail(res,400,'Enter a valid name, email and password (12+ characters).');
  if(await store.userByEmail(email))return fail(res,409,'An account with that email already exists.');
  const id=randomBytes(16).toString('hex'),pass=await passwordHash(password),verified=EMAIL_READY?0:1;
  await store.insertUser({id,email,display_name:name,password_hash:pass,verified,created_at:now()});
  if(!verified){const sent=await sendAccountLink({id,email},'verify');if(!sent){await store.deleteUser(id);return fail(res,503,'Email delivery is unavailable. Please try again later.');}return respond(res,201,{message:'Check your inbox to verify your email, then sign in.',verificationRequired:true});}
  const csrf=await createSession(res,id);return respond(res,201,{user:{id,email,name},csrf});
 }
 if(path==='/api/auth/login'){
  const email=String(data.email||'').trim().toLowerCase(),password=String(data.password||'');const user=await store.userByEmail(email);const good=user?await passwordMatches(password,user.password_hash):await passwordMatches(password,'scrypt$32768$'+('00'.repeat(16))+'$'+('00'.repeat(64)));
  if(!good)return fail(res,401,'Email or password was not recognized.');
  if(!user.verified)return fail(res,403,'Please verify your email before signing in.');
  const csrf=await createSession(res,user.id);return respond(res,200,{user:publicUser(user),csrf});
 }
 if(path==='/api/auth/resend-verification'){
  const email=String(data.email||'').trim().toLowerCase();const user=await store.userByEmail(email);
  if(user&&!user.verified)await sendAccountLink(user,'verify');
  return respond(res,200,{message:'If verification is pending, a new email has been sent.'});
 }
 if(path==='/api/auth/forgot'){
  const email=String(data.email||'').trim().toLowerCase();const user=await store.userByEmail(email);if(user)await sendAccountLink(user,'reset');return respond(res,200,{message:'If an account exists, a recovery link has been sent.'});
 }
 if(path==='/api/auth/verify'){
  const t=await store.emailToken(hash(String(data.token||'')));if(!t||t.kind!=='verify'||t.expires_at<now())return fail(res,400,'Verification link is invalid or has expired.');
  await store.markVerified(t.user_id);await store.deleteEmailTokens(t.user_id,'verify');return respond(res,200,{message:'Email verified. You can now sign in.'});
 }
 if(path==='/api/auth/reset'){
  const t=await store.emailToken(hash(String(data.token||''))),password=String(data.password||'');if(!t||t.kind!=='reset'||t.expires_at<now())return fail(res,400,'Recovery link is invalid or has expired.');if(password.length<12||password.length>200)return fail(res,400,'Password must be at least 12 characters.');const h=await passwordHash(password);
  await store.setPassword(t.user_id,h,true);await store.deleteEmailTokens(t.user_id);await store.deleteSessionsForUser(t.user_id);return respond(res,200,{message:'Password changed. You can sign in.'});
 }
 if(!s)return fail(res,401,'Sign in required.');
 if(path==='/api/auth/logout'){await store.deleteSession(s.tokenHash);clearCookie(res);return respond(res,200,{ok:true});}
 if(path==='/api/auth/change-password'){
  const u=await store.userByEmail(s.email);if(!await passwordMatches(String(data.currentPassword||''),u.password_hash))return fail(res,403,'Current password is incorrect.');const next=String(data.newPassword||'');if(next.length<12||next.length>200)return fail(res,400,'New password must be at least 12 characters.');const h=await passwordHash(next);await store.setPassword(s.user_id,h,false);await store.deleteOtherSessions(s.user_id,s.tokenHash);return respond(res,200,{message:'Password changed; other sessions signed out.'});
 }
 if(path==='/api/account'&&req.method==='DELETE'){
  const u=await store.userByEmail(s.email);if(!await passwordMatches(String(data.password||''),u.password_hash))return fail(res,403,'Password is incorrect.');await store.deleteUser(s.user_id);clearCookie(res);return respond(res,200,{message:'Account and saved workspace deleted.'});
 }
 return fail(res,404,'Unknown authentication route.');
}
function validWorkspace(x){return x&&typeof x==='object'&&!Array.isArray(x)&&x.version===1&&x.settings&&typeof x.settings==='object'&&['tasks','events','people','meetups','rituals','modes','recipes','mealPlans'].every(k=>Array.isArray(x[k]))&&JSON.stringify(x).length<LIMIT;}
async function workspace(req,res,s){if(!s)return fail(res,401,'Sign in required.');if(req.method==='GET'){const row=await store.workspace(s.user_id);return respond(res,200,{data:row?.data||null,revision:row?.revision||0});}
 if(req.method!=='PUT')return fail(res,405,'Method not allowed.');if(!sameOrigin(req)||req.headers['x-modo-request']!=='1'||req.headers['x-csrf-token']!==s.csrf)return fail(res,403,'Workspace save blocked by request protection.');
 const input=await readJson(req),revision=input?.revision;if(!Number.isInteger(revision)||revision<0||!validWorkspace(input.data))return fail(res,400,'Workspace contains invalid data or revision.');
 const current=await store.workspace(s.user_id);if((current?.revision||0)!==revision)return respond(res,409,{error:'This workspace was updated elsewhere. Reload before saving to avoid overwriting data.',revision:current?.revision||0});
 if(current){const saved=await store.updateWorkspace(s.user_id,revision,revision+1,input.data,now());if(!saved){const again=await store.workspace(s.user_id);return respond(res,409,{error:'This workspace was updated elsewhere. Reload before saving to avoid overwriting data.',revision:again?.revision||0});}}
 else await store.insertWorkspace(s.user_id,1,input.data,now());
 return respond(res,200,{revision:revision+1});
}
function normalizeAppleUrl(value){let str=String(value||'').trim();if(str.startsWith('webcal://'))str='https://'+str.slice(9);const u=new URL(str);if(u.protocol!=='https:'||!/^p\d+-caldav\.icloud\.com$/i.test(u.hostname)||!u.pathname.startsWith('/published/')||u.port||u.username||u.password||u.search||u.hash)throw Error('Only public iCloud links supported.');return u;}
async function feed(req,res,s){if(!s)return fail(res,401,'Sign in required.');if(req.method!=='POST')return fail(res,405,'POST required.');if(!sameOrigin(req)||req.headers['x-modo-request']!=='1'||req.headers['x-csrf-token']!==s.csrf)return fail(res,403,'Request blocked.');if(!rateLimit('feed:'+s.user_id,30,60_000))return fail(res,429,'Feed request limit reached.');let target;try{target=normalizeAppleUrl((await readJson(req,8192)).url);}catch{return fail(res,400,'Use a public iCloud calendar link.');}
 try{const timeout=AbortSignal.timeout(14_000);let response=await fetch(target.href,{headers:{Accept:'text/calendar'},redirect:'manual',signal:timeout});if(response.status>=300&&response.status<400){const location=response.headers.get('location');if(!location)return fail(res,502,'Unexpected redirect.');target=normalizeAppleUrl(new URL(location,target).href);response=await fetch(target.href,{redirect:'error',signal:timeout});}if(!response.ok)return fail(res,502,'iCloud returned an error.');let bytes=0,chunks=[];for await(const chunk of response.body){bytes+=chunk.length;if(bytes>1_800_000)return fail(res,413,'Feed too large.');chunks.push(chunk);}const ics=Buffer.concat(chunks).toString('utf8');if(!ics.includes('BEGIN:VCALENDAR'))return fail(res,422,'Invalid iCalendar feed.');res.writeHead(200,{...HEADERS,'Content-Type':'text/calendar; charset=utf-8','Cache-Control':'no-store'});res.end(ics);}catch(e){return fail(res,502,'Unable to retrieve this iCloud feed.');}
}
const DIST=resolve(ROOT,'dist');
function staticFile(req,res,path){
 if(req.method!=='GET'&&req.method!=='HEAD')return fail(res,405,'Method not allowed.');
 if(!existsSync(DIST))return fail(res,503,'The app has not been built. Run npm run build, then start the server again.');
 let requested;try{requested=decodeURIComponent(path);}catch{return fail(res,400,'Invalid path.');}
 if(requested.includes('\0')||requested.includes('..'))return fail(res,400,'Invalid path.');
 if(requested==='/login.html'){const q=new URL(req.url,'http://localhost').search;res.writeHead(302,{Location:'/'+q});return res.end();}
 const rel=(!requested||requested==='/')?'/index.html':requested;
 let target=resolve(DIST,'.'+rel);
 if(!target.startsWith(DIST+sep)&&target!==DIST)return fail(res,403,'Forbidden.');
 let st;try{st=statSync(target);}catch{st=null;}
 if(!st?.isFile()){if(rel.includes('.'))return fail(res,404,'Not found.');target=resolve(DIST,'index.html');try{st=statSync(target);}catch{return fail(res,404,'Not found.');}}
 const hashed=/-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i.test(target);
 const cache=extname(target)==='.html'?'no-store':hashed?'public, max-age=31536000, immutable':'public, max-age=3600';
 res.writeHead(200,{...HEADERS,'Content-Type':MIME[extname(target)]||'application/octet-stream','Cache-Control':cache});
 if(req.method==='HEAD')return res.end();
 createReadStream(target).pipe(res);
}
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/health'&&req.method==='GET')return respond(res,200,{status:'ok',database:store.kind});
 const s=path.startsWith('/api/')?await sessionOf(req):null;
 if(path==='/api/calendar-feed')return await feed(req,res,s);
 if(path.startsWith('/api/auth/')||path==='/api/account')return await auth(req,res,path,s);
 if(path==='/api/workspace')return await workspace(req,res,s);
 if(path.startsWith('/api/'))return fail(res,404,'Unknown endpoint.');
 return staticFile(req,res,path);
 }catch(err){console.error('Request error',err?.message);if(!res.headersSent)fail(res,err?.status||500,err?.status?err.message:'Server error.');else res.end();}});
await store.prepare();
if(store.kind==='supabase'){const imported=await importLocalSqlite(store.client,join(DATA_DIR,'modo.sqlite'));if(imported.copied)console.log(`Copied ${imported.copied} local account${imported.copied===1?'':'s'} into Supabase.`);}
server.listen(PORT,HOST,()=>console.log(`MODO v3 ready at http://${HOST}:${PORT}; database: ${store.kind}; email: ${EMAIL_READY?'enabled':'dev mode'}`));
