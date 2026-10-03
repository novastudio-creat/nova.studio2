import { json } from './_db.mjs';
import { verifyAdmin, authFail } from './_admin.mjs';

function mapProduct(row) {
  const data = row.data || {};

  return {
    ...data,
    id: row.client_id || row.id,
    title: data.title || row.name || '',
    slug: data.slug || '',
    category: data.category || row.category || '',
    shortDescription: data.shortDescription || row.description || '',
    fullDescription: data.fullDescription || row.description || '',
    regularPrice: Number(data.regularPrice || 0),
    salePrice: data.salePrice == null ? null : Number(data.salePrice),
    prices: data.prices || {
      EUR: { regular: Number(row.price_eur || 0), sale: null },
      DZD: { regular: Number(row.price_dzd || 0), sale: null },
      USD: { regular: Number(row.price_usd || 0), sale: null }
    },
    coverImage: data.coverImage || row.image || '♡',
    screenshots: data.screenshots || [],
    demoUrl: data.demoUrl || '',
    downloadUrl: data.downloadUrl || '',
    features: data.features || [],
    included: data.included || [],
    tags: data.tags || [],
    badge: data.badge || '',
    isFeatured: data.isFeatured ?? !!row.featured,
    isPopular: data.isPopular ?? false,
    isNew: data.isNew ?? false,
    isVisible: row.status === 'active',
    createdAt: data.createdAt || new Date(row.created_at).getTime(),
    updatedAt: data.updatedAt || new Date(row.updated_at).getTime()
  };
}

async function supabase(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase environment variables are missing.');
  }

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

  if (!response.ok) {
    throw new Error(text || `Supabase error ${response.status}`);
  }

  return text ? JSON.parse(text) : null;
}

function productRow(product) {
  const prices = product.prices || {};

  const eur = prices.EUR || {};
  const dzd = prices.DZD || {};
  const usd = prices.USD || {};

  return {
    client_id: String(product.id || ''),
    name: product.title || product.name || '',
    description:
      product.fullDescription ||
      product.shortDescription ||
      product.description ||
      '',
    category: product.category || '',
    price_eur: Number(eur.sale ?? eur.regular ?? 0),
    price_dzd: Number(dzd.sale ?? dzd.regular ?? 0),
    price_usd: Number(usd.sale ?? usd.regular ?? 0),
    image: product.coverImage || product.image || '',
    status: product.isVisible === false ? 'hidden' : 'active',
    featured: !!product.isFeatured,
    data: product,
    updated_at: new Date().toISOString()
  };
}

async function saveProduct(product) {
  if (!product || !product.id) {
    throw new Error('Product id is required.');
  }

  const row = productRow(product);

  const existing = await supabase(
    `products?client_id=eq.${encodeURIComponent(product.id)}&select=id`
  );

  if (existing.length) {
    const rows = await supabase(
      `products?client_id=eq.${encodeURIComponent(product.id)}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=representation'
        },
        body: JSON.stringify(row)
      }
    );

    return mapProduct(rows[0]);
  }

  const rows = await supabase('products', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify(row)
  });

  return mapProduct(rows[0]);
}

export async function handler(event) {
  try {
    const method = event.httpMethod || 'GET';

    /*
     * GET
     * Public users see active products.
     * Admin users see all products.
     */
    if (method === 'GET') {
      const isAdmin = verifyAdmin(event);

      const query = isAdmin
        ? 'products?select=*&order=created_at.desc'
        : 'products?select=*&status=eq.active&order=created_at.desc';

      const rows = await supabase(query);

      return json(200, {
        products: rows.map(mapProduct)
      });
    }

    /*
     * All write operations require admin login.
     */
    if (!verifyAdmin(event)) {
      return authFail();
    }

    const body = JSON.parse(event.body || '{}');
    const action = body.action || '';

    /*
     * UPSERT ONE PRODUCT
     */
    if (method === 'POST' && action === 'upsert') {
      const saved = await saveProduct(body.product);

      return json(200, {
        ok: true,
        product: saved
      });
    }

    /*
     * DELETE ONE PRODUCT
     */
    if (method === 'POST' && action === 'delete') {
      if (!body.id) {
        return json(400, {
          error: 'Product id is required.'
        });
      }

      await supabase(
        `products?client_id=eq.${encodeURIComponent(body.id)}`,
        {
          method: 'DELETE'
        }
      );

      return json(200, {
        ok: true
      });
    }

    /*
     * REPLACE / SYNC ENTIRE LOCAL CATALOG
     */
    if (method === 'POST' && action === 'replace') {
      const products = Array.isArray(body.products)
        ? body.products
        : [];

      for (const product of products) {
        await saveProduct(product);
      }

      return json(200, {
        ok: true,
        count: products.length
      });
    }

    return json(405, {
      error: 'Method not allowed.'
    });

  } catch (error) {
    console.error(error);

    return json(500, {
      error: error.message || 'Products backend error.'
    });
  }
}
