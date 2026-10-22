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
export const IMAGE_MODELS={
 // Ratios, refsMax and the enhance_prompt/preset_id contract are exactly what
 // docs.higgsfield.ai/docs/models/marketing-studio-image/flare documents for this endpoint.
 gpt_image_2_5:{name:'GPT Image 2.5',path:'/marketing-studio/image/flare',
  ratios:['auto','1:1','3:2','2:3','4:3','3:4','16:9','9:16','21:9'],refs:true,refsMax:16,enhance:true,
  body:(d,refs)=>({prompt:d.prompt,quality:d.quality,resolution:d.resolution,aspect_ratio:d.aspect,
   enhance_prompt:!!d.enhancePrompt,...(d.enhancePrompt?{preset_id:d.presetId}:{}),
   ...(refs.length?{image_urls:refs}:{})})},
 // Not in Higgsfield's current documented model catalog (docs.higgsfield.ai/docs/models/image-generation
 // lists 14 families; Seedream/Bytedance isn't one of them, and site search turns up nothing). Treated as
 // not connected rather than silently failing generations.
 seedream:{name:'Seedream',path:null},
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
 const refsMax=m.refsMax||8;
 const refs=d.references||[];
 if(!Array.isArray(refs)||refs.length>refsMax||refs.some(u=>typeof u!=='string'||!/^https:\/\//.test(u)))throw new Error('Use up to '+refsMax+' uploaded image references.');
 if(refs.length&&!m.refs)throw new Error(m.name+' can’t use reference images yet. Remove them or use GPT Image 2.5.');
 if(d.enhancePrompt){
  if(!m.enhance)throw new Error(m.name+' doesn’t support Enhance Prompt.');
  if(!d.presetId)throw new Error('Choose a preset to use Enhance Prompt.');
  if(refs.length<1||refs.length>2)throw new Error('Enhance Prompt needs 1–2 reference images: the product first, an optional person/model second.');
 }
 return {path:m.path,input:m.body(d,refs)};
}
// Video models on the Higgsfield cloud API. `path: null` = not connected yet (needs the model's endpoint from the Higgsfield console).
// Each model is either image-to-video (needs a start frame, optional end frame) or text-to-video (needs a resolution + aspect ratio instead).
export const VIDEO_MODELS={
 kling3:{name:'Kling 3.0 Standard',path:'/kling-video/v3.0/std/image-to-video',mode:'image-to-video',
  durationMin:3,durationMax:15,sound:true,
  body:d=>({image_url:d.image_url,prompt:d.prompt,duration:d.duration,sound:d.sound==='on'?'on':'off',...(d.last_image_url?{last_image_url:d.last_image_url}:{})})},
 // docs.higgsfield.ai/docs/models/seedance-2-5/text-to-video — confirmed real, connected endpoint.
 seedance:{name:'Seedance 2.5',path:'/bytedance/seedance-2.5/text-to-video',mode:'text-to-video',
  durationMin:4,durationMax:30,sound:true,ratios:['16:9','4:3','1:1','3:4','9:16','21:9'],resolutions:['480p','720p','1080p'],
  body:d=>({prompt:d.prompt,duration:d.duration,resolution:d.resolution,aspect_ratio:d.ratio,generate_audio:d.sound==='on'})},
};
export function videoInput(d){
 const m=VIDEO_MODELS[d.model||'kling3'];
 if(!m)throw new Error('Choose a supported video model.');
 if(!m.path)throw new Error(m.name+' isn’t connected yet. Use Kling 3.0 Standard for now.');
 const prompt=String(d.prompt||'').trim();
 if(!prompt||prompt.length>2500)throw new Error('Describe the shot (1–2500 characters).');
 const duration=Math.round(Number(d.duration)||m.durationMin);
 if(duration<m.durationMin||duration>m.durationMax)throw new Error(m.name+' supports '+m.durationMin+'–'+m.durationMax+' second durations.');
 if(m.mode==='image-to-video'){
  if(typeof d.image_url!=='string'||!/^https:\/\//.test(d.image_url))throw new Error('Add a start frame first.');
  if(d.last_image_url&&(typeof d.last_image_url!=='string'||!/^https:\/\//.test(d.last_image_url)))throw new Error('The end frame must be an uploaded image.');
 } else {
  if(!m.ratios.includes(d.ratio))throw new Error(m.name+' doesn’t support '+d.ratio+'. Choose '+m.ratios.join(', ')+'.');
  if(!m.resolutions.includes(d.resolution))throw new Error(m.name+' doesn’t support that resolution. Choose '+m.resolutions.join(', ')+'.');
 }
 return {path:m.path,input:m.body({...d,prompt,duration})};
}
