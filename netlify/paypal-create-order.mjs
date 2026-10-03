import { db, json, body, siteUrl } from './_db.mjs';

function base() { return process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'; }
async function token() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${base()}/v1/oauth2/token`, { method:'POST', headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'}, body:'grant_type=client_credentials' });
  if (!r.ok) throw new Error(`PayPal token error ${r.status}`);
  return (await r.json()).access_token;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error:'Method not allowed' });
  try {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return json(500,{error:'PayPal is not configured yet.'});
    const b = body(event); const orderId=String(b.orderId||'');
    const {data: order,error}=await db().from('orders').select('*').eq('id',orderId).single();
    if(error||!order) return json(404,{error:'Order not found.'});
    const access=await token();
    const r=await fetch(`${base()}/v2/checkout/orders`,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify({intent:'CAPTURE',purchase_units:[{reference_id:String(order.order_number),custom_id:order.id,description:order.product_name,amount:{currency_code:order.currency.toUpperCase(),value:Number(order.amount).toFixed(2)}}],application_context:{return_url:`${siteUrl()}/paypal-return.html?order_id=${encodeURIComponent(order.id)}`,cancel_url:`${siteUrl()}/?payment=cancelled`}})});
    const data=await r.json(); if(!r.ok) throw new Error(data.message||'PayPal order creation failed');
    const approve=data.links?.find(x=>x.rel==='approve')?.href; if(!approve) throw new Error('PayPal approval link missing.');
    await db().from('orders').update({provider_order_id:data.id,payment_status:'checkout_created',updated_at:new Date().toISOString()}).eq('id',order.id);
    return json(200,{url:approve,providerOrderId:data.id});
  } catch(e){console.error(e);return json(500,{error:e.message||'PayPal checkout could not be created.'});}
}
