export default async function handler(req, res) {
  const raw = req.query?.path;
  const parts = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const name = parts.join('/');
  if (!name || name.includes('..') || name.includes('/')) return res.status(404).json({ error: 'Not found' });

  try {
    const mod = await import(`../netlify/${name}.mjs`);
    if (typeof mod.handler !== 'function') return res.status(404).json({ error: 'Function not found' });

    const headers = Object.fromEntries(Object.entries(req.headers || {}).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : v]));
    let body = '';
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'string') body = req.body;
      else if (req.body != null) body = JSON.stringify(req.body);
    }
    const qs = new URL(req.url, `http://${headers.host || 'localhost'}`).searchParams;
    const query = Object.fromEntries(qs.entries());
    const event = {
      httpMethod: req.method,
      headers,
      body,
      isBase64Encoded: false,
      queryStringParameters: query,
      pathParameters: req.query || {},
      rawUrl: req.url
    };

    const result = await mod.handler(event);
    if (result?.headers) {
      for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
    }
    const status = result?.statusCode || 200;
    res.status(status);
    if (result?.body == null) return res.end();
    if (result.headers?.['content-type']?.includes('application/json')) {
      try { return res.json(JSON.parse(result.body)); } catch {}
    }
    return res.send(result.body);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error.' });
  }
}
