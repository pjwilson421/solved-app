import { checkPass } from '../lib/auth.js';
import { hf, safeError } from '../lib/hf.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(!checkPass(req,res))return;
 try{await hf('/marketing-studio/image/presets?size=1');res.status(200).json({ok:true,higgsfield:true,account:'Higgsfield API',subscription_plan_type:'API',claude:!!process.env.ANTHROPIC_API_KEY});}
 catch(e){res.status(502).json({error:safeError(e),higgsfield:false});}
}
