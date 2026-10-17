import { checkPass } from '../lib/auth.js';
import { hf, safeError } from '../lib/hf.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'POST only'});if(!(await checkPass(req,res)))return;
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(req.body?.content_type))return res.status(400).json({error:'Use a PNG, JPEG, WebP, or GIF image.'});
 try{const u=await hf('/files/generate-upload-url',{content_type:req.body.content_type});if(!u.upload_url||!u.public_url)throw new Error();res.status(200).json({upload_url:u.upload_url,public_url:u.public_url,upload_headers:u.upload_headers||{}});}
 catch(e){res.status(502).json({error:safeError(e)});}
}
