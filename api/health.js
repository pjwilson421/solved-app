import { checkPass } from '../lib/auth.js';
export default function handler(req,res){if(!checkPass(req,res))return;res.setHeader('Cache-Control','no-store');res.status(200).json({ok:true,higgsfield:false,claude:!!process.env.ANTHROPIC_API_KEY});}
