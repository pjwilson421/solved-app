// Hosted Higgsfield bridge. Credentials remain on the server.
(function(){
 const KEY='solved-hf2',defaults={model:'gpt_image_2_5',quality:'high',resolution:'1k',enabled:true};
 let cfg;try{cfg={...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{cfg={...defaults};}
 let ready=false,live=false,lastError='';
 const emit=()=>window.dispatchEvent(new Event('solved-hf'));
 const save=()=>{localStorage.setItem(KEY,JSON.stringify(cfg));emit();};
 async function api(path,body){
  const r=await fetch('/studio/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const b=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(b.error||'Higgsfield request failed');e.status=r.status;throw e;}return b;
 }
 async function test(){try{const b=await api('/health');live=!!b.higgsfield;lastError='';cfg={...cfg,account:b.account,credits:null};save();return b;}catch(e){live=false;lastError=e.message;throw e;}finally{ready=true;emit();}}
 async function reference(src){
  if(/^https:\/\//.test(src))return src;
  if(!/^(blob:|data:image\/)/.test(src))throw new Error('Attach a supported reference image.');
  const r=await fetch(src);if(!r.ok)throw new Error('Could not read the reference image.');const blob=await r.blob();
  if(blob.size>15*1024*1024)throw new Error('Each reference must be smaller than 15 MB.');
  const u=await api('/hf-upload',{content_type:blob.type==='image/jpg'?'image/jpeg':blob.type});
  const put=await fetch(u.upload_url,{method:'PUT',headers:{'Content-Type':blob.type,...u.upload_headers},body:blob,credentials:'omit'});
  if(!put.ok)throw new Error('Reference upload failed. No generation was submitted.');return u.public_url;
 }
 async function generate({prompt,references=[],aspect='1:1',model,quality,resolution,onStatus}={}){
  if(!live||cfg.enabled===false)throw new Error(lastError||'Connect Higgsfield in the sidebar first.');
  if(references.filter(Boolean).length>8)throw new Error('Use up to eight references.');
  onStatus?.('Uploading references');const refs=await Promise.all(references.filter(Boolean).map(reference));
  // Submit once only. An uncertain response must never trigger an automatic duplicate.
  const j=await api('/hf-generate',{prompt,references:refs,aspect,model:model||cfg.model,quality:quality||cfg.quality,resolution:resolution||cfg.resolution});
  const deadline=Date.now()+22*60*1000;let failures=0;
  while(Date.now()<deadline){
   await new Promise(r=>setTimeout(r,failures?8000:3000));let s;
   try{s=await api('/hf-status?id='+encodeURIComponent(j.request_id));failures=0;}catch(e){if(e.status===401)throw e;if(++failures>10)throw new Error('Status checks failed. Check Higgsfield history before retrying.');onStatus?.('Checking generation');continue;}
   onStatus?.(s.status||'Working');
   if(s.status==='completed'){if(!s.url)throw new Error('Higgsfield returned no image.');return s.url;}
   if(['failed','nsfw','canceled','cancelled'].includes(s.status))throw new Error(s.status==='nsfw'?'Higgsfield blocked this generation.':'Higgsfield generation '+s.status+'.');
  }
  throw new Error('Generation is still pending. Check Higgsfield history before retrying.');
 }
 window.SOLVED_HF={get:()=>({...cfg,ready,live,available:live,lastError}),set:v=>{cfg={...cfg,...v};save();},connected:()=>live&&cfg.enabled!==false,generate,test,disconnect:()=>{cfg.enabled=false;save();}};
 window.SOLVED_IMAGE_GEN=generate;
 window.claude={complete:async({messages,max_tokens})=>(await api('/claude',{messages,max_tokens})).text};
 test().catch(()=>{});
})();
