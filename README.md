# Nova Studio — Netlify + Payments backend

This project turns the Nova Studio storefront into a deployable Netlify site with serverless payment endpoints and a Supabase order database.

## Stack
- Existing Nova Studio storefront (kept as the visual frontend)
- Netlify Functions for backend/API/webhooks
- Supabase Postgres for real orders and sequential order numbers
- Stripe Checkout + webhook
- PayPal Orders + capture + webhook-ready order records
- BaridiMob manual verification

## 1. Supabase
Create a Supabase project, open SQL Editor, and run `sql/schema.sql`.

## 2. Local test
Install Node.js, then:

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill the values.

## 3. Netlify
Recommended: put this folder in GitHub, then in Netlify choose **Add new project → Import an existing project**. Netlify supports Next.js and serverless functions, but this Nova project is intentionally a simple static frontend + Functions setup, so no framework build is required.

Set these environment variables in Netlify:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SITE_URL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_CURRENCIES
- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET
- PAYPAL_ENV
- PAYPAL_WEBHOOK_ID (reserved for webhook verification)

Never put service-role, Stripe secret, or PayPal secret keys into the HTML/browser.

## 4. Stripe webhook
In Stripe Dashboard create a webhook endpoint:
`https://YOUR-SITE.netlify.app/api/stripe-webhook`

Listen for `checkout.session.completed` and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## 5. PayPal
Create a PayPal app, use Sandbox first, and set its return URL through the generated order flow. Add the PayPal webhook URL:
`https://YOUR-SITE.netlify.app/api/paypal-webhook`

The project also includes `paypal-webhook.mjs`, which verifies PayPal webhook signatures through PayPal's verification API before updating order status. Subscribe to `CHECKOUT.ORDER.APPROVED`, `CHECKOUT.PAYMENT-APPROVAL.REVERSED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.COMPLETED`, and `PAYMENT.CAPTURE.DENIED`.

## 6. RedotPay
The original storefront can still show a RedotPay payment link. No undocumented RedotPay API/webhook is assumed here. If you have an official merchant/API account, its exact API/webhook contract can be added without exposing secrets to the browser.

## Important production note
The current frontend keeps the product catalog in browser storage because the original Nova Studio app was designed as a standalone demo. The payment backend records the amount sent by the storefront. For a fully tamper-resistant production shop, move products, currency-specific prices, coupons, and admin settings into Supabase and calculate the final amount only on the server before creating a payment session.
