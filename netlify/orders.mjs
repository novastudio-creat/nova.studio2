import { db, json, body } from './_db.mjs';
import { verifyAdmin, authFail } from './_admin.mjs';

function toFrontend(row) {
  if (!row) return null;
  return {
    id: row.order_number != null ? String(row.order_number) : String(row.id || ''),
    orderNumber: row.order_number,
    date: row.created_at,
    customer: row.customer_name,
    email: row.customer_email,
    productId: row.product_id,
    product: row.product_name,
    originalPrice: Number(row.original_price ?? row.amount ?? 0),
    discount: Number(row.discount ?? 0),
    promoCode: row.promo_code || '',
    finalPrice: Number(row.amount ?? 0),
    currency: row.currency,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    downloadStatus: row.download_status || 'Pending verification',
    reference: row.payment_reference || ''
  };
}

export async function handler(event) {
  try {
    if (event.httpMethod === 'GET') {
      if (!verifyAdmin(event)) return authFail();
      const { data, error } = await db().from('orders').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return json(200, { orders: (data || []).map(toFrontend) });
    }

    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const b = body(event);
    const incoming = b.order || b;
    if (b.action && b.action !== 'create') return json(400, { error: 'Unsupported order action.' });

    const name = String(incoming.customer || incoming.name || '').trim();
    const email = String(incoming.email || '').trim().toLowerCase();
    const productName = String(incoming.product || incoming.productName || 'Nova Experience').trim();
    const productId = incoming.productId ? String(incoming.productId) : null;
    const currency = String(incoming.currency || '').toLowerCase();
    const amount = Number(incoming.finalPrice ?? incoming.amount);
    const paymentMethod = String(incoming.paymentMethod || 'Demo').trim();
    const paymentStatus = String(incoming.paymentStatus || 'pending').trim();
    const reference = String(incoming.reference || incoming.paymentReference || '').trim() || null;

    if (!name || !email || !productName || !currency || !Number.isFinite(amount) || amount < 0 || !paymentMethod) {
      return json(400, { error: 'Invalid order data.' });
    }

    const row = {
      customer_name: name,
      customer_email: email,
      product_id: productId,
      product_name: productName,
      currency,
      amount: Number(amount.toFixed(2)),
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      payment_reference: reference,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db().from('orders').insert(row).select('*').single();
    if (error) throw error;
    return json(200, { order: toFrontend(data) });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message || 'Could not process order.' });
  }
}
