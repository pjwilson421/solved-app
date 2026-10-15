import { checkPass } from '../lib/auth.js';
export default function handler(req,res){if(!checkPass(req,res))return;res.status(503).json({error:'Image and video generation are temporarily unavailable on the live app.'});}
