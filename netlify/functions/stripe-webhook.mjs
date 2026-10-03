import Stripe from 'stripe';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return { statusCode: 500, body: 'Stripe webhook not configured' };
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    const eventObj = stripe.webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (eventObj.type === 'checkout.session.completed') {
      const session = eventObj.data.object;
      const orderId = session.metadata?.order_id;
      if (orderId) await db().from('orders').update({ payment_status: 'paid', provider_session_id: session.id, updated_at: new Date().toISOString() }).eq('id', orderId);
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 400, body: `Webhook Error: ${e.message}` };
  }
}
