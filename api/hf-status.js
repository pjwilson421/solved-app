import { checkPass } from '../lib/auth.js';
import { hf, safeError } from '../lib/hf.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(!checkPass(req,res))return;
 const id=String(req.query.id||'');if(!/^[A-Za-z0-9-]{8,80}$/.test(id))return res.status(400).json({error:'Invalid generation ID.'});
 try{const j=await hf('/requests/'+id+'/status');res.status(200).json({status:j.status,url:j.images?.[0]?.url||j.image?.url||null});}
 catch(e){res.status(502).json({error:safeError(e)});}
}
