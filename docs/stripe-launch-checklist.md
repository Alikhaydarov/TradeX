# Tradox Stripe Launch Checklist

Use this when moving from local setup to a real hosted test run.

## Required environment

- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STANDARD_MONTHLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Stripe test values currently prepared

- Standard USD monthly: `price_1TsS1dENvid26hW3adNSsWqv`
- Pro USD monthly: `price_1TsS31ENvid26hW3spgLb262`

## Dashboard checks

1. Confirm the account is still the Stripe test account for `Tradox sandbox`
2. Confirm the app is using the USD prices, not the older JPY test products
3. Add webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
4. Enable events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Enable Stripe Billing customer portal if you want `Manage billing` to work

## App checks

1. Open `/pricing`
2. Verify no Stripe configuration warning appears
3. Start `Standard`
4. Complete checkout in test mode
5. Confirm `/api/webhooks/stripe` receives and verifies the event
6. Confirm `profiles.plan` becomes `premium`
7. Confirm `subscriptions.provider_subscription_id` is saved
8. Open billing portal from the pricing page

## Clean-up notes

- Ignore or archive the older JPY test products once the USD flow is confirmed
- Keep all Stripe secret values server-side only
