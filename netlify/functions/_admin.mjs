import crypto from 'node:crypto';
import { json } from './_db.mjs';

function secret(){if(!process.env.ADMIN_SESSION_SECRET)throw new Error('ADMIN_SESSION_SECRET is missing.');return process.env.ADMIN_SESSION_SECRET;}
export function signAdmin(email){const payload=Buffer.from(JSON.stringify({email,exp:Date.now()+1000*60*60*24})).toString('base64url');const sig=crypto.createHmac('sha256',secret()).update(payload).digest('base64url');return `${payload}.${sig}`;}
export function verifyAdmin(event){const h=event.headers||{};const auth=h.authorization||h.Authorization||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';const [payload,sig]=token.split('.');if(!payload||!sig)return false;const expected=crypto.createHmac('sha256',secret()).update(payload).digest('base64url');if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;try{const p=JSON.parse(Buffer.from(payload,'base64url').toString());return p.exp>Date.now();}catch{return false;}}
export function authFail(){return json(401,{error:'Admin authentication required.'});}
