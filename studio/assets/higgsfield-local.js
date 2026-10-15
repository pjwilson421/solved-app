// Hosted release: generation will be connected separately.
(function(){
 const message='Image generation is temporarily unavailable on the live app.';
 let cfg={model:'gpt_image_2_5',quality:'high',resolution:'1k',enabled:false};
 const emit=()=>window.dispatchEvent(new Event('solved-hf'));
 const unavailable=async()=>{throw new Error(message);};
 window.SOLVED_HF={get:()=>({...cfg,ready:true,live:false,available:false,lastError:message}),set:v=>{cfg={...cfg,...v};emit();},connected:()=>false,generate:unavailable,test:unavailable,disconnect:()=>{cfg.enabled=false;emit();}};
 window.SOLVED_IMAGE_GEN=unavailable;
 window.claude={complete:async({messages,max_tokens})=>{
  const r=await fetch('/studio/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,max_tokens})});
  const b=await r.json();if(!r.ok)throw new Error(b.error||'Could not process this request');return b.text;
 }};
})();
