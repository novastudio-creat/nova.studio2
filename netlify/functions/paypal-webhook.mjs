import { db, json } from './_db.mjs';

function base(){return process.env.PAYPAL_ENV==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';}
async function token(){const auth=Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');const r=await fetch(`${base()}/v1/oauth2/token`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});if(!r.ok)throw new Error('PayPal authentication failed');return (await r.json()).access_token;}

export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 try{
  if(!process.env.PAYPAL_WEBHOOK_ID)return json(500,{error:'PAYPAL_WEBHOOK_ID is not configured.'});
  const raw=event.isBase64Encoded?Buffer.from(event.body,'base64').toString('utf8'):event.body;
  const webhookEvent=JSON.parse(raw||'{}');
  const h=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
  const access=await token();
  const verifyBody={auth_algo:h['paypal-auth-algo'],cert_url:h['paypal-cert-url'],transmission_id:h['paypal-transmission-id'],transmission_sig:h['paypal-transmission-sig'],transmission_time:h['paypal-transmission-time'],webhook_id:process.env.PAYPAL_WEBHOOK_ID,webhook_event:webhookEvent};
  const vr=await fetch(`${base()}/v1/notifications/verify-webhook-signature`,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify(verifyBody)});
  const verification=await vr.json();
  if(!vr.ok||verification.verification_status!=='SUCCESS')return json(400,{error:'Invalid PayPal webhook signature.'});
  const type=webhookEvent.event_type;const resource=webhookEvent.resource||{};
  const paypalOrderId=resource?.supplementary_data?.related_ids?.order_id||resource?.id;
  if(paypalOrderId){
   if(type==='PAYMENT.CAPTURE.COMPLETED') await db().from('orders').update({payment_status:'paid',provider_order_id:paypalOrderId,updated_at:new Date().toISOString()}).eq('provider_order_id',paypalOrderId);
   if(type==='PAYMENT.CAPTURE.DENIED'||type==='CHECKOUT.PAYMENT-APPROVAL.REVERSED') await db().from('orders').update({payment_status:'failed',provider_order_id:paypalOrderId,updated_at:new Date().toISOString()}).eq('provider_order_id',paypalOrderId);
  }
  return json(200,{received:true});
 }catch(e){console.error(e);return json(400,{error:'Webhook processing failed.'});}
}
