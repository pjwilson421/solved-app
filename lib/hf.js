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
// Image models on the Higgsfield cloud API. `path: null` = not connected yet (needs the model's endpoint from the Higgsfield console).
const ALL_RATIOS=['auto','1:1','3:2','2:3','4:3','3:4','16:9','9:16','21:9','27:16','16:27','9:8','8:9','4:5','5:4'];
export const IMAGE_MODELS={
 gpt_image_2_5:{name:'GPT Image 2.5',path:'/marketing-studio/image/flare',ratios:ALL_RATIOS,refs:true,
  body:(d,refs)=>({prompt:d.prompt,quality:d.quality,resolution:d.resolution,aspect_ratio:d.aspect,enhance_prompt:false,...(refs.length?{image_urls:refs}:{})})},
 // Path from Higgsfield's official Python SDK example (bytedance/seedream/v4/text-to-image). Text-only until the edit path is confirmed.
 seedream:{name:'Seedream',path:'/bytedance/seedream/v4/text-to-image',ratios:['1:1','4:3','3:4','16:9','9:16','3:2','2:3','21:9'],refs:false,
  body:d=>({prompt:d.prompt,aspect_ratio:d.aspect,resolution:d.resolution==='4k'?'4K':'2K'})},
 nano_banana:{name:'Nano Banana',path:null},
 flux_pro:{name:'Flux Pro',path:null},
};
export function imageInput(d){
 const m=IMAGE_MODELS[d.model];
 if(!m)throw new Error('Choose a supported image model.');
 if(!m.path)throw new Error(m.name+' isn’t connected yet. Use GPT Image 2.5 for now.');
 if(typeof d.prompt!=='string'||!d.prompt.trim()||d.prompt.length>5000)throw new Error('Enter a prompt of 1–5000 characters.');
 if(!['low','medium','high','xhigh','max'].includes(d.quality))throw new Error('Choose a valid quality.');
 if(!['1k','2k','4k'].includes(d.resolution))throw new Error('Choose 1K, 2K, or 4K.');
 if(!m.ratios.includes(d.aspect))throw new Error(m.name+' doesn’t support '+d.aspect+'. Choose '+m.ratios.filter(r=>r!=='auto').join(', ')+'.');
 const refs=d.references||[];
 if(!Array.isArray(refs)||refs.length>8||refs.some(u=>typeof u!=='string'||!/^https:\/\//.test(u)))throw new Error('Use up to eight uploaded image references.');
 if(refs.length&&!m.refs)throw new Error(m.name+' can’t use reference images yet. Remove them or use GPT Image 2.5.');
 return {path:m.path,input:m.body(d,refs)};
}
