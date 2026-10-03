import { db, json } from './_db.mjs';
import { verifyAdmin, authFail } from './_admin.mjs';
export async function handler(event){if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});try{if(!verifyAdmin(event))return authFail();const {data,error}=await db().from('orders').select('*').order('created_at',{ascending:false}).limit(500);if(error)throw error;return json(200,{orders:data||[]});}catch(e){console.error(e);return json(500,{error:'Could not load orders.'});}}
