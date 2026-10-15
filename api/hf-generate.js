import { checkPass } from '../lib/auth.js';
import { hf, imageInput, safeError } from '../lib/hf.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'POST only'});if(!checkPass(req,res))return;
 let input;try{input=imageInput(req.body||{});}catch(e){return res.status(400).json({error:e.message});}
 try{const j=await hf('/marketing-studio/image/flare',input);if(!j.request_id)throw new Error();res.status(200).json({request_id:j.request_id});}
 catch(e){res.status(502).json({error:safeError(e)});}
}
