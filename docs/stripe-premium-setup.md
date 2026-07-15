# Tradox Stripe Premium Setup

This project already contains the main Stripe subscription flow:

- `POST /api/stripe/checkout`
- `POST /api/webhooks/stripe`
- `POST /api/stripe/portal`
- `GET /api/premium/status`

## 1. Stripe Dashboard setup

Use the same Stripe test account currently open in the Dashboard.

1. Use product: `Tradox Standard USD`
2. Use monthly recurring price: `price_1TsS1dENvid26hW3adNSsWqv`
3. Use product: `Tradox Pro USD`
4. Use monthly recurring price: `price_1TsS31ENvid26hW3spgLb262`
5. Add a webhook endpoint:

```text
https://your-domain.com/api/webhooks/stripe
```

6. Subscribe the webhook to these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`

## 2. Environment variables

Add these to your deployment environment:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STANDARD_MONTHLY=price_1TsS1dENvid26hW3adNSsWqv
STRIPE_PRICE_PRO_MONTHLY=price_1TsS31ENvid26hW3spgLb262
```

Ignore these older test products unless you intentionally want JPY billing:

- `Tradox Standard` -> `JPY 1,500`
- the mistaken `Tradox Pro USD` -> `JPY 25`

## 3. Supabase

Run the existing migrations so the billing tables and premium profile fields exist.

Important tables and fields:

- `profiles.plan`
- `profiles.premium_until`
- `profiles.ai_enabled`
- `profiles.auto_sync_enabled`
- `profiles.traderox_enabled`
- `subscriptions`

## 4. Runtime behavior

- Pricing UI lives in `src/components/pricing.tsx`
- Checkout creates a Stripe subscription tied to the authenticated Supabase user
- Webhook writes subscription state into `subscriptions`
- Webhook upgrades `profiles.plan` to `premium`
- Billing portal lets users manage or cancel the subscription later

## 5. What to test in Stripe test mode

1. Sign in with Google
2. Open `/pricing`
3. Start `Standard` checkout
4. Complete payment with a Stripe test card
5. Confirm webhook delivery succeeded
6. Verify the user row in `profiles` changed to premium
7. Open billing portal and confirm it loads
