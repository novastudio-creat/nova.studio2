import { handler as adminLogin } from '../netlify/functions/admin-login.mjs';
import { handler as orders } from '../netlify/functions/orders.mjs';
import { handler as products } from '../netlify/functions/products.mjs';
import { handler as adminOrders } from '../netlify/functions/admin-orders.mjs';
import { handler as createOrder } from '../netlify/functions/create-order.mjs';
import { handler as manualOrder } from '../netlify/functions/create-manual-order.mjs';
import { handler as getOrder } from '../netlify/functions/get-order.mjs';
import { handler as paypalCreate } from '../netlify/functions/paypal-create-order.mjs';
import { handler as paypalCapture } from '../netlify/functions/paypal-capture-order.mjs';
import { handler as paypalWebhook } from '../netlify/functions/paypal-webhook.mjs';
import { handler as stripeCheckout } from '../netlify/functions/create-stripe-checkout.mjs';
import { handler as stripeWebhook } from '../netlify/functions/stripe-webhook.mjs';

const routes = { 'admin-login': adminLogin, orders, products, 'admin-orders': adminOrders,
  'create-order': createOrder, 'create-manual-order': manualOrder, 'get-order': getOrder,
  'paypal-create-order': paypalCreate, 'paypal-capture-order': paypalCapture,
  'paypal-webhook': paypalWebhook, 'create-stripe-checkout': stripeCheckout,
  'stripe-webhook': stripeWebhook };

export default async function (req, res) {
  const raw = req.query?.path;
  const parts = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split('/') : []);
  const name = parts.filter(Boolean).join('/').replace(/^.*\//, '');
  const fn = routes[name];
  if (!fn) return res.status(404).json({ error: 'API route not found.' });

  let body = req.body;
  if (body && typeof body !== 'string') body = JSON.stringify(body);
  const event = {
    httpMethod: req.method,
    headers: req.headers || {},
    body: body || '',
    path: req.url || ''
  };
  try {
    const out = await fn(event);
    const headers = out?.headers || {};
    Object.entries(headers).forEach(([k,v]) => res.setHeader(k, v));
    return res.status(out?.statusCode || 200).send(out?.body || '');
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'API error.' });
  }
}
