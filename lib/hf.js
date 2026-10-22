import { hfAuth, HF } from './auth.js';
export function providerError(status) {
 if(status===401||status===403)return 'Higgsfield rejected the saved API key. Replace HF_CREDENTIALS in Vercel with a valid Higgsfield API key.';
 if(status===402)return 'Your Higgsfield API account needs credits.';
 if(status===429)return 'Higgsfield is busy. Please wait before trying again.';
 return 'Higgsfield could not complete the request (HTTP '+status+').';
}
export async function hf(path,body){
 const r=await fetch(HF+path,{method:body?'POST':'GET',headers:{Authorization:hfAuth(),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok){const e=new Error(providerError(r.status));e.status=r.status;throw e;}return data;
}
export function safeError(e){return e.status?e.message:e.message?.startsWith('Higgsfield keys are not set')?e.message:'The Higgsfield connection did not respond. Check your generation history before retrying.';}
export function imageInput(d){
 if(d.model!=='gpt_image_2_5')throw new Error('Select GPT Image 2.5. This saved model is not configured for cloud generation yet.');
 if(typeof d.prompt!=='string'||!d.prompt.trim()||d.prompt.length>5000)throw new Error('Enter a prompt of 1–5000 characters.');
 if(!['low','medium','high','xhigh','max'].includes(d.quality))throw new Error('Choose a valid quality.');
 if(!['1k','2k','4k'].includes(d.resolution))throw new Error('Choose 1K, 2K, or 4K.');
 if(!['auto','1:1','3:2','2:3','4:3','3:4','16:9','9:16','21:9','27:16','16:27','9:8','8:9','4:5','5:4'].includes(d.aspect))throw new Error('Choose a valid aspect ratio.');
 const refs=d.references||[];
 if(!Array.isArray(refs)||refs.length>8||refs.some(u=>typeof u!=='string'||!/^https:\/\//.test(u)))throw new Error('Use up to eight uploaded image references.');
 return {prompt:d.prompt,quality:d.quality,resolution:d.resolution,aspect_ratio:d.aspect,enhance_prompt:false,...(refs.length?{image_urls:refs}:{})};
}
