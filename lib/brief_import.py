"""Local document reading and explicit-label matching; never executes document content."""
import base64, io, json, pathlib, re, sys, zipfile, xml.etree.ElementTree as ET
from html.parser import HTMLParser
ALIASES={
 'CLIENT NAME':['client name','client','brand','company'], 'PROJECT NAME':['project name','project title','project','campaign'],
 'SUMMARY':['summary','overview','background','objective','objectives'], 'CONCEPT':['concept','creative direction','creative concept','idea','approach'],
 'AUDIENCE':['audience','target audience','target demographic'], 'DELIVERABLES':['deliverables','deliverable','outputs','scope of work'],
 'BUDGET':['budget','project budget','production budget'], 'TIMELINE':['timeline','schedule','milestones','key dates'], 'GENDER':['gender'], 'AGE':['age','age range'], 'LOCATION':['location','geography','region'], 'INCOME':['income','income range','household income'], 'ADDITIONAL':['additional information','additional audience information','audience notes']}
LOOKUP={alias:key for key,aliases in ALIASES.items() for alias in aliases}
HEAD=re.compile(r'^(?:'+ '|'.join(re.escape(a) for a in sorted(LOOKUP,key=len,reverse=True))+r')$',re.I)

def match_fields(text):
 sections={};current=None
 for line in text.replace('\r','').split('\n'):
  clean=line.strip().strip('#* ').strip()
  pair=re.split(r'\s*[:\t|]\s*',clean,maxsplit=1)
  if len(pair)==1:pair=re.split(r'\s+[–—-]\s+',clean,maxsplit=1)
  key=LOOKUP.get(pair[0].strip().lower())
  if key:
   current=key;sections.setdefault(key,[])
   if len(pair)>1 and pair[1].strip():sections[key].append(pair[1].strip())
  elif current and clean:
   sections[current].append(line.strip())
 result={k:'\n'.join(v).strip() for k,v in sections.items() if v}
 # Names must not swallow unrelated prose that follows them.
 for k in ('CLIENT NAME','PROJECT NAME'):
  if k in result:result[k]=result[k].split('\n')[0]
 audience={k.lower():result.pop(k) for k in ('GENDER','AGE','LOCATION','INCOME','ADDITIONAL') if k in result}
 return {'fields':result,'audience':audience}

class TextHTML(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,t,a):
  if t in ('script','style'):self.skip+=1
  if t in ('p','div','br','li','tr','h1','h2','h3'):self.parts.append('\n')
 def handle_endtag(self,t):
  if t in ('script','style'):self.skip=max(0,self.skip-1)
  if t in ('p','div','li','tr','h1','h2','h3'):self.parts.append('\n')
 def handle_data(self,d):
  if not self.skip:self.parts.append(d)

def extract(data):
 name=str(data.get('name',''));ext=pathlib.Path(name).suffix.lower()
 raw=base64.b64decode(data.get('data',''),validate=True)
 if len(raw)>15*1024*1024:raise ValueError('Use files smaller than 15 MB.')
 if ext=='.pdf':
  from pypdf import PdfReader
  reader=PdfReader(io.BytesIO(raw))
  if reader.is_encrypted:raise ValueError('This PDF is password protected. Upload an unlocked copy.')
  if len(reader.pages)>150:raise ValueError('Use a PDF with 150 pages or fewer.')
  text='\n'.join(p.extract_text() or '' for p in reader.pages)
 elif ext=='.docx':
  with zipfile.ZipFile(io.BytesIO(raw)) as z:
   if z.getinfo('word/document.xml').file_size>20*1024*1024:raise ValueError('Document is too large.')
   root=ET.fromstring(z.read('word/document.xml'))
   ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
   text='\n'.join(''.join(p.itertext()) for p in root.findall('.//w:p',ns))
 elif ext in ('.txt','.md','.markdown','.csv','.json','.html','.htm'):
  text=raw.decode('utf-16' if raw[:2] in (b'\xff\xfe',b'\xfe\xff') else 'utf-8-sig')
  if ext in ('.html','.htm'):
   p=TextHTML();p.feed(text);text=''.join(p.parts)
  if ext=='.csv':
   import csv
   text='\n'.join(': '.join(row) for row in csv.reader(io.StringIO(text)))
  if ext=='.json':
   obj=json.loads(text)
   if isinstance(obj,dict):text='\n'.join(f'{k}: '+ ('\n'.join(map(str,v)) if isinstance(v,list) else str(v)) for k,v in obj.items())
 else:raise ValueError('Use PDF, DOCX, TXT, Markdown, CSV, JSON, or HTML files.')
 if not text.strip():raise ValueError('No readable text found. Scanned PDFs and images need a text-based copy.')
 if len(text)>200000:raise ValueError('Document text is too long. Split it into smaller files.')
 result=match_fields(text);result['text']=text;return result

if __name__=='__main__':
 try:print(json.dumps(extract(json.load(sys.stdin))))
 except Exception as e:
  msg=str(e) if isinstance(e,(ValueError,UnicodeError)) else 'This document could not be read. Try exporting it as PDF, DOCX, or text.'
  print(json.dumps({'error':msg}));sys.exit(1)
