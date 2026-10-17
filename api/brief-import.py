from http.server import BaseHTTPRequestHandler
import base64, hashlib, hmac, json, os, time, urllib.request, urllib.parse
from lib.brief_import import extract

SUPABASE_URL=os.environ.get('SUPABASE_URL','https://wetzjfsdumraslfojcva.supabase.co')
SUPABASE_KEY=os.environ.get('SUPABASE_PUBLISHABLE_KEY','sb_publishable_bw0_xjD26NDCDCUAYKM0TA_NS9DE_D1')
ALLOWED=[e.strip() for e in os.environ.get('STUDIO_ALLOWED_EMAILS','pj@pjwilson.me').lower().split(',') if e.strip()]

def account_ok(headers):
    auth=headers.get('Authorization','') or ''
    token=auth[7:].strip() if auth.lower().startswith('bearer ') else ''
    if not token:
        token=next((p.strip()[6:] for p in (headers.get('Cookie','') or '').split(';') if p.strip().startswith('sb_at=')), '')
    if not token or token.count('.')!=2 or len(token)>4096: return False
    try:
        req=urllib.request.Request(SUPABASE_URL+'/auth/v1/user',headers={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+urllib.parse.unquote(token)})
        with urllib.request.urlopen(req,timeout=5) as r:
            u=json.loads(r.read())
        return str(u.get('email','')).lower() in ALLOWED
    except Exception: return False

def authorized(cookie):
    secret=os.environ.get('STUDIO_SESSION_SECRET','')
    if not secret or not os.environ.get('STUDIO_PASSWORD'): return False
    token=next((p.strip().split('=',1)[1] for p in cookie.split(';') if p.strip().startswith('__Host-solved_session=')), '')
    try:
        expires,nonce,signature=token.split('.')
        now=int(time.time())
        if not now<int(expires)<=now+43200: return False
        expected=base64.urlsafe_b64encode(hmac.new(secret.encode(),(expires+'.'+nonce).encode(),hashlib.sha256).digest()).decode().rstrip('=')
        return hmac.compare_digest(expected,signature)
    except (ValueError,TypeError): return False

class handler(BaseHTTPRequestHandler):
    def reply(self,status,body):
        data=json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store')
        self.end_headers();self.wfile.write(data)
    def do_POST(self):
        if not (authorized(self.headers.get('Cookie','')) or account_ok(self.headers)): return self.reply(401,{'error':'Sign in required'})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size<=0 or size>4300000: return self.reply(413,{'error':'Use files smaller than 3 MB.'})
            data=json.loads(self.rfile.read(size))
            if not isinstance(data,dict): raise ValueError('Invalid document')
            self.reply(200,extract(data))
        except Exception as e:
            message=str(e) if isinstance(e,(ValueError,UnicodeError)) else 'Could not read this file. Upload a text-based PDF, DOCX, or text file.'
            self.reply(400,{'error':message})
    def do_GET(self): self.reply(405,{'error':'POST only'})
