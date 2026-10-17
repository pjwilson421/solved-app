import { checkPass } from '../lib/auth.js';
export default async function handler(req,res){if(!(await checkPass(req,res)))return;res.status(503).json({error:'Image and video generation are temporarily unavailable on the live app.'});}
