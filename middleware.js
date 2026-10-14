import { COOKIE, TTL, equal, issueSession, validSession } from './lib/session.js';
export const config = { runtime: 'nodejs', matcher: '/:path*' };
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' };
const attempts = new Map();
function login(error = '') {
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOLVED Studio — Sign in</title><style>body{margin:0;background:#f7f7f5;color:#111;font:16px Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh}main{width:min(340px,calc(100vw - 64px))}h1{font-size:30px;letter-spacing:-1px}p{color:#666;line-height:1.5}label{display:block;margin:28px 0 10px}input,button{box-sizing:border-box;width:100%;padding:15px;border-radius:6px;font:inherit}input{border:1px solid #ccc}button{margin-top:14px;border:0;background:#1985ff;color:white;cursor:pointer}.error{color:#b21}</style><main><h1>SOLVED STUDIO</h1><p>Enter your password to access your workspace.</p><form method="post" action="/studio/login"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256" autofocus><button>Sign in</button><p class="error" role="alert">' + error + '</p></form></main></html>';
}
export default async function middleware(request) {
 const url = new URL(request.url), path = url.pathname;
 if (!process.env.STUDIO_PASSWORD || !process.env.STUDIO_SESSION_SECRET) return new Response('Studio access is temporarily unavailable.', { status:503, headers });
 if (path === '/studio/login' && request.method === 'POST') {
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
     return new Response(login('Incorrect password. Please try again.'),{status:401,headers});
   }
   attempts.delete(ip);
   return new Response(null,{status:303,headers:{...headers,Location:'/studio','Set-Cookie':COOKIE+'='+issueSession()+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+TTL}});
 }
 if (path === '/studio/logout' && request.method === 'POST') return new Response(null,{status:303,headers:{...headers,Location:'/studio','Set-Cookie':COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}});
 if (validSession(request.headers.get('cookie'))) return new Response(null,{headers:{'x-middleware-next':'1','Cache-Control':'private, no-store'}});
 if (path.startsWith('/api/') || path.startsWith('/studio/api/')) return new Response(JSON.stringify({error:'Sign in required'}),{status:401,headers:{...headers,'Content-Type':'application/json'}});
 if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Sign in required',{status:401,headers});
 return new Response(request.method === 'HEAD' ? null : login(),{status:200,headers});
}
