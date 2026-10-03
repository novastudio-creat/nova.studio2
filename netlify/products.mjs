import { db, json, body } from './_db.mjs';
import { verifyAdmin, authFail } from './_admin.mjs';

// The storefront keeps a local catalog by default. If a products table exists in Supabase,
// this endpoint can sync it across devices; otherwise it returns a clear fallback error.
export async function handler(event) {
  try {
    if (event.httpMethod === 'GET') {
      const { data, error } = await db().from('products').select('*').order('created_at', { ascending: false });
      if (error) return json(200, { products: [] });
      return json(200, { products: data || [] });
    }
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!verifyAdmin(event)) return authFail();
    const b = body(event);
    if (b.action === 'replace') {
      const { error: delError } = await db().from('products').delete().neq('id', '');
      if (delError) throw delError;
      if (Array.isArray(b.products) && b.products.length) {
        const { error } = await db().from('products').insert(b.products);
        if (error) throw error;
      }
      return json(200, { ok: true });
    }
    if (b.action === 'upsert' && b.product) {
      const { data, error } = await db().from('products').upsert(b.product).select('*').single();
      if (error) throw error;
      return json(200, { product: data });
    }
    if (b.action === 'delete' && b.id) {
      const { error } = await db().from('products').delete().eq('id', b.id);
      if (error) throw error;
      return json(200, { ok: true });
    }
    return json(400, { error: 'Unsupported catalog action.' });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message || 'Catalog backend error.' });
  }
}
