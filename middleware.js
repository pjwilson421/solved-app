import { COOKIE, TTL, equal, issueSession, validSession } from './lib/session.js';
import { SUPABASE_URL, SUPABASE_KEY, tokenFrom, verifyToken } from './lib/supa.js';
export const config = { runtime: 'nodejs', matcher: '/:path*' };
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' };
const attempts = new Map();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Sign-in page: SOLVED account (Supabase email + password). The old studio password stays available during the transition.
function login(error = '') {
 const pw = !!process.env.STUDIO_PASSWORD;
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOLVED Studio — Sign in</title><link rel="icon" type="image/svg+xml" href="/studio/assets/solved-puzzle.svg">
<style>body{margin:0;background:#282828;color:#f5f5f5;font:15px "Helvetica Neue",Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh;-webkit-font-smoothing:antialiased}main{width:min(340px,calc(100vw - 32px));box-sizing:border-box;background:#282828;border-radius:12px;padding:40px 32px}@media(max-width:420px){main{padding:28px 20px;border-radius:10px}}h1{font-size:22px;letter-spacing:.12em;margin:0 0 8px}p{color:#a3a3a3;line-height:1.5;margin:0 0 24px}label{display:block;margin:18px 0 8px;font-size:12px;font-weight:700}input,button{box-sizing:border-box;width:100%;padding:14px;border-radius:6px;font:inherit}input{border:1px solid #333;background:#141414;color:#f5f5f5}input:focus{outline:2px solid #1985FF;border-color:transparent}button{margin-top:20px;border:0;border-radius:6px;background:#1985FF;color:#fff;font-weight:700;cursor:pointer}button[disabled]{opacity:.6}.link{background:none;color:#a3a3a3;font-weight:400;margin-top:12px;padding:6px;text-decoration:underline}.msg{min-height:20px;margin-top:16px;font-size:13px}.err{color:#ff6b6b}.ok{color:#6fb3ff}details{margin-top:36px;border-top:1px solid #222;padding-top:16px;color:#a3a3a3;font-size:13px}summary{cursor:pointer}</style>
<main><h1><img src="/studio/assets/solved-puzzle.svg" alt="SOLVED" width="46" height="44" style="display:block"></h1><p id="sub">Sign in to your studio.</p>
<form id="f"><label for="email">Email</label><input id="email" type="email" autocomplete="email" required maxlength="254" autofocus>
<label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required minlength="8" maxlength="128">
<button id="go">Sign in</button><button type="button" class="link" id="mode">Create your account</button>
<div class="msg" id="msg" role="alert">${esc(error)}</div></form>
${pw ? `<details><summary>Use the studio password instead</summary><form method="post" action="/studio/login"><label for="password">Studio password</label><input id="password" name="password" type="password" autocomplete="off" maxlength="256"><button>Continue</button></form></details>` : ''}
</main>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script>
(function(){
 var sb=supabase.createClient(${JSON.stringify(SUPABASE_URL)},${JSON.stringify(SUPABASE_KEY)},{auth:{persistSession:true,storageKey:"sb-solved-auth"}});
 var q=new URLSearchParams(location.search), next=q.get('next'); if(!next||next.charAt(0)!=='/'||next.indexOf('//')===0)next='/studio';
 var f=document.getElementById('f'),msg=document.getElementById('msg'),go=document.getElementById('go'),modeBtn=document.getElementById('mode'),sub=document.getElementById('sub'),create=false;
 function say(t,ok){msg.textContent=t;msg.className='msg '+(ok?'ok':'err');}
 function enter(s){document.cookie='sb_at='+encodeURIComponent(s.access_token)+'; Path=/; Max-Age=3600; Secure; SameSite=Lax';
   var n=+(sessionStorage.getItem('sb-tries')||0); if(n>2){sessionStorage.removeItem('sb-tries');sb.auth.signOut();say('This account does not have access to SOLVED Studio.');return;}
   sessionStorage.setItem('sb-tries',n+1); location.replace(next);}
 modeBtn.onclick=function(){create=!create;go.textContent=create?'Create account':'Sign in';modeBtn.textContent=create?'I already have an account':'Create your account';sub.textContent=create?'Create your SOLVED account. Use a password of 8+ characters.':'Sign in to your studio.';document.getElementById('pw').autocomplete=create?'new-password':'current-password';say('');};
 if(q.has('signedout')){document.cookie='sb_at=; Path=/; Max-Age=0; Secure; SameSite=Lax';sessionStorage.removeItem('sb-tries');sb.auth.signOut();}
 else sb.auth.getSession().then(function(r){var s=r.data&&r.data.session;if(s)sb.auth.refreshSession().then(function(x){if(x.data&&x.data.session)enter(x.data.session);});});
 f.onsubmit=function(e){e.preventDefault();var email=document.getElementById('email').value.trim(),pw=document.getElementById('pw').value;go.disabled=true;say('');
  var p=create?sb.auth.signUp({email:email,password:pw,options:{emailRedirectTo:location.origin+'/studio/login'}}):sb.auth.signInWithPassword({email:email,password:pw});
  p.then(function(r){go.disabled=false;
   if(r.error){say(/not open|Database error/i.test(r.error.message)?'Sign-up is closed for this email.':/confirm/i.test(r.error.message)?'Confirm your email first, then sign in.':r.error.message);return;}
   if(r.data.session){sessionStorage.removeItem('sb-tries');enter(r.data.session);}
   else{say('Account created. Check your email to confirm it, then sign in.',true);create=true;modeBtn.click();}
  },function(){go.disabled=false;say('Could not reach the sign-in service. Try again.');});};
})();
</script></html>`;
}

const open = p => p.startsWith('/studio/assets/') || p === '/favicon.ico' || p === '/robots.txt';

export default async function middleware(request) {
 const url = new URL(request.url), path = url.pathname;
 if (open(path)) return new Response(null, { headers: { 'x-middleware-next': '1' } });
 if (path === '/studio/login' && request.method === 'GET') return new Response(login(), { status: 200, headers });
 if (path === '/studio/login' && request.method === 'POST') {
   if (!process.env.STUDIO_PASSWORD || !process.env.STUDIO_SESSION_SECRET) return new Response(login('Studio password sign-in is turned off. Use your account.'), { status: 403, headers });
   const origin = request.headers.get('origin');
   const allowed = new Set([url.origin, 'https://www.solvedmedia.xyz', 'https://solvedmedia.xyz']);
   if (!origin || !allowed.has(origin)) return new Response('Forbidden', {status:403,headers});
   const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
   const now = Date.now();
   for (const [key, value] of attempts) if (now > value.until) attempts.delete(key);
   const limit = attempts.get(ip) || { count:0, until:now + 15*60*1000 };
   if (limit.count >= 10) return new Response(login('Too many attempts. Try again in 15 minutes.'), {status:429,headers:{...headers,'Retry-After':'900'}});
   if (Number(request.headers.get('content-length') || 0)>4096) return new Response('Request too large',{status:413,headers});
   let password = '';
   try { const body=await request.text(); if(body.length>4096) return new Response('Request too large',{status:413,headers}); password=new URLSearchParams(body).get('password') || ''; } catch {}
   if (!equal(password,process.env.STUDIO_PASSWORD)) {
     limit.count++; attempts.set(ip,limit);
     return new Response(login('Incorrect studio password. Please try again.'),{status:401,headers});
   }
   attempts.delete(ip);
   return new Response(null,{status:303,headers:{...headers,Location:'/studio','Set-Cookie':COOKIE+'='+issueSession()+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+TTL}});
 }
 if (path === '/studio/logout') return new Response(null,{status:303,headers:{...headers,Location:'/studio/login?signedout=1','Set-Cookie':COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}});
 const passOk = process.env.STUDIO_PASSWORD && process.env.STUDIO_SESSION_SECRET && validSession(request.headers.get('cookie'));
 if (passOk || await verifyToken(tokenFrom({ cookie: request.headers.get('cookie'), authorization: request.headers.get('authorization') }))) return new Response(null,{headers:{'x-middleware-next':'1','Cache-Control':'private, no-store'}});
 if (path.startsWith('/api/') || path.startsWith('/studio/api/')) return new Response(JSON.stringify({error:'Sign in required'}),{status:401,headers:{...headers,'Content-Type':'application/json'}});
 if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Sign in required',{status:401,headers});
 return new Response(null,{status:303,headers:{...headers,Location:'/studio/login?next='+encodeURIComponent(path + url.search)}});
}
