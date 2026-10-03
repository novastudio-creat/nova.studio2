import { json } from './_db.mjs';
import { verifyAdmin, authFail } from './_admin.mjs';

function supabaseUrl(){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase environment variables are missing.');
  return { url, key };
}

async function supabase(path, options = {}){
  const {url, key} = supabaseUrl();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase error ${response.status}`);
  return text ? JSON.parse(text) : null;
}

function mapOrder(row){
  return {
    orderNumber: row.order_number,
    id: `NS-${String(row.order_number).padStart(4, '0')}`,
    clientOrderId: row.client_order_id,
    customer: row.customer_name || '',
    email: row.customer_email || '',
    productId: row.product_id || '',
    product: row.product_name || '',
    originalPrice: Number(row.original_price || 0),
    discount: Number(row.discount || 0),
    promoCode: row.promo_code || '',
    finalPrice: Number(row.amount || 0),
    currency: row.currency || 'USD',
    paymentMethod: row.payment_method || '',
    paymentStatus: row.payment_status || 'pending',
    downloadStatus: row.download_status || 'Pending verification',
    reference: row.payment_reference || '',
    providerOrderId: row.provider_order_id || '',
    providerSessionId: row.provider_session_id || '',
    date: row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function orderRow(order){
  if (!order || !order.clientOrderId) throw new Error('clientOrderId is required.');
  return {
    client_order_id: String(order.clientOrderId),
    customer_name: String(order.customer || ''),
    customer_email: String(order.email || ''),
    product_id: order.productId ? String(order.productId) : null,
    product_name: String(order.product || 'Nova Experience'),
    original_price: Number(order.originalPrice || 0),
    discount: Number(order.discount || 0),
    promo_code: order.promoCode ? String(order.promoCode) : null,
    amount: Number(order.finalPrice || 0),
    currency: String(order.currency || 'USD'),
    payment_method: String(order.paymentMethod || 'Demo'),
    payment_status: String(order.paymentStatus || 'pending'),
    payment_reference: order.reference ? String(order.reference) : null,
    provider_order_id: order.providerOrderId ? String(order.providerOrderId) : null,
    provider_session_id: order.providerSessionId ? String(order.providerSessionId) : null,
    download_status: String(order.downloadStatus || 'Pending verification'),
    updated_at: new Date().toISOString()
  };
}

async function createOrder(order){
  const clientId = encodeURIComponent(String(order.clientOrderId));
  const existing = await supabase(`orders?client_order_id=eq.${clientId}&select=*`);
  if (Array.isArray(existing) && existing.length) return mapOrder(existing[0]);

  const rows = await supabase('orders', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(orderRow(order))
  });
  return mapOrder(rows[0]);
}

export async function handler(event){
  try {
    const method = event.httpMethod || 'GET';

    if (method === 'GET') {
      if (!verifyAdmin(event)) return authFail();
      const rows = await supabase('orders?select=*&order=created_at.desc');
      return json(200, { orders: rows.map(mapOrder) });
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (body.action !== 'create') return json(400, { error: 'Unsupported order action.' });
      const order = await createOrder(body.order);
      return json(200, { ok: true, order });
    }

    return json(405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error(error);
    return json(500, { error: error.message || 'Orders backend error.' });
  }
}
