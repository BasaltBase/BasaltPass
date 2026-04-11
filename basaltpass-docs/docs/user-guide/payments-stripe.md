---
sidebar_position: 10
---

# Payments (Stripe)

This document explains the current BasaltPass payment flow using tenant-level Stripe configuration.

## Overview

BasaltPass supports **tenant-isolated Stripe billing**:

- Each tenant stores and manages its own Stripe keys.
- User checkout requests use the user’s tenant Stripe secret key.
- Stripe webhook callbacks update payment/order/subscription state in BasaltPass.

## Tenant Stripe Configuration

Tenant console page:

- Path: `/tenant/info`
- Section: `Stripe 收款配置`

API endpoints:

- `GET /api/v1/tenant/stripe-config`
- `PUT /api/v1/tenant/stripe-config`

Required access:

- `GET`: tenant console authenticated user
- `PUT`: tenant admin/owner (tenant user middleware)

Request body example:

```json
{
  "enabled": true,
  "publishable_key": "pk_test_xxx",
  "secret_key": "sk_test_xxx",
  "webhook_secret": "whsec_xxx"
}
```

Notes:

- `publishable_key` must start with `pk_`.
- `secret_key` must start with `sk_`.
- Stripe cannot be enabled until both publishable and secret keys are configured.

## User Purchase Flow

User APIs:

- `POST /api/v1/payment/intents`
- `POST /api/v1/payment/sessions`
- `GET /api/v1/payment/checkout/:session_id` (redirects to Stripe Checkout)

Required access:

- Standard **user JWT** (no tenant admin role required)

Typical sequence:

1. Create payment intent (`/payment/intents`)
2. Create checkout session (`/payment/sessions`)
3. Open checkout URL (`/payment/checkout/:session_id`)
4. Pay on Stripe-hosted page
5. Stripe webhook updates local status

## Webhook Integration

Public webhook endpoint:

- `POST /api/v1/payment/webhook/stripe`

Debug/status endpoint:

- `GET /api/v1/payment/webhook/stripe/events/:event_id` (super admin scope)

Handled Stripe events:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.processing`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

Signature verification:

- Uses Stripe `Stripe-Signature` header
- Verifies against tenant `webhook_secret`

## Data Consistency Notes

BasaltPass stores payment-related JSON fields in MySQL JSON columns. To avoid JSON parse errors:

- Empty JSON values are normalized to `{}` at model layer.
- Payment intent creation explicitly initializes `next_action` with `{}`.

## Common Errors

### Tenant not configured

```json
{
  "error": "当前租户未配置可用的 Stripe Key，请先在租户控制台完成配置"
}
```

Action:

- Open tenant console `/tenant/info`
- Fill Stripe publishable/secret keys and enable Stripe

### Scope mismatch (`admin_scope_required`)

If user checkout returns:

```json
{
  "code": "admin_scope_required"
}
```

Action:

- Ensure backend version includes payment route middleware fix
- User purchase APIs should be reachable with standard user scope

### Invalid JSON text (`market_payment_intents.next_action`)

If you see MySQL 3140 JSON errors, backend is likely outdated.

Action:

- Deploy latest backend with JSON normalization hooks

## Quick Test Checklist

1. Configure tenant Stripe keys in `/tenant/info`
2. Create test product/plan/price (using project helper command)
3. Place order from user console
4. Confirm checkout redirect to Stripe
5. Verify webhook received and processed
6. Query webhook status endpoint (super admin) if troubleshooting is needed
