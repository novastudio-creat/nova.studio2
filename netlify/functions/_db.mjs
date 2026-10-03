import { createClient } from '@supabase/supabase-js';

export function db() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body)
});

export function body(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
}

export function siteUrl() {
  return process.env.SITE_URL || `https://${process.env.URL || ''}`.replace(/\/$/, '');
}

export function safeEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function amountMinor(amount, currency) {
  const zeroDecimal = new Set(['jpy','krw']);
  return zeroDecimal.has(String(currency).toLowerCase()) ? Math.round(Number(amount)) : Math.round(Number(amount) * 100);
}
