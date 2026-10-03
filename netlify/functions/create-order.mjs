import { db, json, body, safeEmail } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const b = body(event);
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const productName = String(b.productName || 'Nova Experience').trim();
    const productId = b.productId ? String(b.productId) : null;
    const currency = String(b.currency || '').toLowerCase();
    const amount = Number(b.amount);
    const paymentMethod = String(b.paymentMethod || '').trim();
    if (!name || !safeEmail(email) || !productName || !currency || !Number.isFinite(amount) || amount < 0 || !paymentMethod) {
      return json(400, { error: 'Invalid order data.' });
    }
    const { data, error } = await db().from('orders').insert({
      customer_name: name, customer_email: email, product_id: productId,
      product_name: productName, currency, amount: Number(amount.toFixed(2)),
      payment_method: paymentMethod, payment_status: 'pending'
    }).select('id,order_number,customer_name,customer_email,product_name,currency,amount,payment_method,payment_status,created_at').single();
    if (error) throw error;
    return json(200, { order: data });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message || 'Could not create order.' });
  }
}
