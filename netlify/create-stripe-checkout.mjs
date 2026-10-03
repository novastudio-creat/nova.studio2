import Stripe from 'stripe';
import { db, json, body, siteUrl, amountMinor } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    if (!process.env.STRIPE_SECRET_KEY) return json(500, { error: 'Stripe is not configured yet.' });
    const b = body(event);
    const orderId = String(b.orderId || '');
    const allowed = String(process.env.STRIPE_CURRENCIES || 'eur,usd').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    const currency = String(b.currency || '').toLowerCase();
    if (!orderId || !allowed.includes(currency)) return json(400, { error: `Stripe is configured for: ${allowed.join(', ')}.` });
    const { data: order, error } = await db().from('orders').select('*').eq('id', orderId).single();
    if (error || !order) return json(404, { error: 'Order not found.' });
    if (order.payment_status === 'paid') return json(409, { error: 'Order is already paid.' });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: order.customer_email,
      line_items: [{ price_data: { currency, product_data: { name: order.product_name }, unit_amount: amountMinor(order.amount, currency) }, quantity: 1 }],
      metadata: { order_id: order.id, order_number: String(order.order_number) },
      success_url: `${siteUrl()}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/?payment=cancelled`
    });
    await db().from('orders').update({ provider_session_id: session.id, payment_status: 'checkout_created', updated_at: new Date().toISOString() }).eq('id', order.id);
    return json(200, { url: session.url });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message || 'Stripe checkout could not be created.' });
  }
}
