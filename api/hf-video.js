import { checkPass } from '../lib/auth.js';
import { hf, safeError } from '../lib/hf.js';
// Image-to-video through the Higgsfield cloud API (Kling 3.0 Standard).
// The start frame (and optional end frame) must already be uploaded (public https URLs from /hf-upload).
const MODELS = { kling3: 'kling-video/v3.0/std/image-to-video' };
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'POST only'});if(!(await checkPass(req,res)))return;
 const d=req.body||{}, model=MODELS[d.model||'kling3'];
 if(!model)return res.status(400).json({error:'Choose a supported video model.'});
 if(typeof d.image_url!=='string'||!/^https:\/\//.test(d.image_url))return res.status(400).json({error:'Add a start frame first.'});
 if(d.last_image_url&&(typeof d.last_image_url!=='string'||!/^https:\/\//.test(d.last_image_url)))return res.status(400).json({error:'The end frame must be an uploaded image.'});
 const prompt=String(d.prompt||'').trim();if(!prompt||prompt.length>2500)return res.status(400).json({error:'Describe the shot (1–2500 characters).'});
 const duration=Math.round(Number(d.duration)||5);if(duration<3||duration>15)return res.status(400).json({error:'Duration must be 3–15 seconds.'});
 const input={image_url:d.image_url,prompt,duration,sound:d.sound==='on'?'on':'off',...(d.last_image_url?{last_image_url:d.last_image_url}:{})};
 try{const j=await hf('/'+model,input);if(!j.request_id)throw new Error();res.status(200).json({request_id:j.request_id});}
 catch(e){res.status(502).json({error:safeError(e)});}
}
