---
sidebar_position: 9
---

# Coupon System

The Tenant Coupon System allows organizations to manage their own discounts and promotions independently.

## Features

-   **Tenant Isolation**: Coupons are unique to a tenant and cannot be used elsewhere.
-   **Discount Types**:
    -   **Percentage**: e.g., 20% off.
    -   **Fixed Amount**: e.g., $10 off.
-   **Constraints**: Max redemptions, Expiration dates.

## API Usage

All endpoints are under `/api/v1/admin/subscription/coupons` (Tenant Admin).

### Create Coupon

```http
POST /api/v1/admin/subscription/coupons
Authorization: Bearer <tenant_admin_token>

{
  "code": "WELCOME20",
  "name": "Welcome Discount",
  "discount_type": "percent",
  "discount_value": 2000,
  "duration": "once",
  "max_redemptions": 100
}
```
*Note: `discount_value` for percentage is in basis points (2000 = 20.00%).*

### Validate Coupon

```http
GET /api/v1/admin/subscription/coupons/WELCOME20/validate
```

## Data Model

-   **Code**: Unique identifier (within tenant).
-   **IsActive**: Whether the coupon can be redeemed.
-   **RedeemedCount**: Tracks usage.
