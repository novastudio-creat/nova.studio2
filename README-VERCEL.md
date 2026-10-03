# Nova Studio — Vercel deployment

This copy keeps the existing storefront and adds a Vercel-compatible serverless bridge.

## Important
Set these Vercel Environment Variables (Production, Preview, Development as needed):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_EMAIL
- ADMIN_PASSWORD
- ADMIN_SESSION_SECRET
- SITE_URL (optional; otherwise Vercel URL is used)
- PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENV / PAYPAL_WEBHOOK_ID (only if PayPal is used)
- STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET (only if Stripe is used)

Run the SQL in `sql/schema.sql` in the Supabase SQL editor. The schema includes the order fields used by the admin order table.

The browser continues to call `/.netlify/functions/...`; `vercel.json` rewrites those requests to `/api/...`, and `api/[...path].js` bridges them to the existing handlers.
