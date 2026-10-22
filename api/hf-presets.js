import { checkPass } from '../lib/auth.js';
import { hf, safeError } from '../lib/hf.js';
// Marketing Studio image presets, used by GPT Image 2.5's Enhance Prompt mode (enhance_prompt + preset_id).
// docs.higgsfield.ai/docs/models/marketing-studio-image/flare
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(!(await checkPass(req,res)))return;
 try{const j=await hf('/marketing-studio/image/presets');res.status(200).json(j);}
 catch(e){res.status(502).json({error:safeError(e)});}
}
