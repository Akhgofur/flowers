# Orderable Without a Price — Design

**Date:** 2026-08-12
**Status:** Approved for planning

## Goal

Let a customer order a product that has no price. The order is created like any other; the price simply is not shown. A manager phones the customer and agrees the price outside the system.

Inventory tracking (`stockQuantity`) is removed entirely. It was never a requirement, and it currently blocks orders for products the shop is willing to sell.

## Non-goals

- No separate "lead" or "request" entity, status, or form. A price-less order is an ordinary order.
- The manager does not enter the agreed price into the system. A price-less line stays price-less forever.
- Seasonal availability is **not** removed. An out-of-season product stays unorderable.
- No migration script. Existing documents keep their `stockQuantity` field; the application stops reading it.

## Current behavior and why it blocks

`getProductAvailability` refuses a product for four reasons: `unpublished`, `out_of_season`, `out_of_stock`, `price_missing`. Only an available product can be added to the cart, survives the checkout reconciliation, and passes the reservation filter in `reserveProduct`, which requires `price > 0` and `stockQuantity >= quantity` and atomically decrements stock.

In production 138 of 151 published products carry no price, so they are browsable but unsellable.

## New domain rule

> A published, in-season product is orderable. Price and stock gate nothing.

`ProductAvailabilityReason` loses two members:

| Reason | Now | After |
| --- | --- | --- |
| `available` | orderable | orderable |
| `unpublished` | blocks | blocks |
| `out_of_season` | blocks | blocks |
| `out_of_stock` | blocks | **removed** |
| `price_missing` | blocks | **removed** |

`getProductAvailability` keeps its shape and its callers; only its rules shrink. Its `ProductAvailabilityInput` drops `stockQuantity` and `price`.

## Data model

### Product

Remove `stockQuantity` from `src/models/Product.ts`, `CatalogProduct`, `AdminProduct`, the product input/patch validation schemas, both repository mappers, the admin product form, and the seed and import scripts.

`price` stays optional exactly as today. Nothing else about the product changes.

### Order

An order line may now have no price. `unitPrice` and `lineTotal` become **optional** on `OrderItemSnapshot` and in the Mongoose schema.

An absent price means "price on request". This is deliberate: storing `0` would claim the item is free, and every surface that renders money would silently show a wrong number. With the field absent, each surface is forced to decide what to display, which is what we want.

`subtotal` and `total` sum **only the priced lines**. A price-less line contributes nothing. Consequently an order may have a total that does not cover everything in it; that is expected and is surfaced in the UI as "the operator confirms the final sum".

Remove `stockReleasedAt` from the order schema and record type, together with `claimStockRelease` and `restoreProductStock` from the order store.

### Reservation becomes a read

`reserveProduct` no longer mutates anything. Its filter keeps `_id`, `status: "published"` and the season `$or`, and drops `price: { $gt: 0 }` and `stockQuantity: { $gte: quantity }`. It becomes a projection-backed lookup that returns the product's slug, translated name, price (possibly undefined) and images.

Keep `RESERVED_PRODUCT_PROJECTION` and its regression test: the projection must still satisfy `resolveProductTranslation`.

The MongoDB transaction stays. It no longer protects stock, but it still writes the order and its notification outbox row together, which is what makes delivery retryable.

The cancellation transition keeps working; it simply no longer restores stock.

## Customer-facing behavior

**Product page.** A price-less product shows "price on request" where the price would be and now renders the quantity control and the add-to-cart button. Out-of-season products keep the existing "ask availability" treatment.

**Cart and checkout.** A price-less line renders with "price on request" instead of a sum. `isOrderable` in `CheckoutClient` becomes the availability check alone. The "Товары" row sums the priced lines; the final total keeps the existing `totalPending` copy ("Подтвердит оператор").

Remove `cappedQuantity` from `CheckoutClient` — it caps against stock, which no longer exists. Quantity stays bounded by the existing 1–99 rule.

**Copy.** The `availability.out_of_stock` and `availability.price_missing` strings become unused in all three locales and are deleted.

## Operator-facing behavior

**Telegram.** A price-less line renders as `2. Авторский букет №1 × 1 — narx so'rov bo'yicha`. The order total line continues to show the priced sum.

**Admin orders.** The same treatment in the fulfilment list, so the manager can see at a glance which lines need a call.

**Admin products.** The "Qoldiq" field disappears from both the create form and the inline list editor.

**Admin dashboard.** The overview counts low-stock products (`stockQuantity <= 5`). That metric dies with the field. Replace it with the count of published products that carry no price — the number that now decides how much of the catalog can be sold at a listed price, and the shop's actual backlog. Everything else on the overview is unchanged.

## Error handling

`ProductUnavailableError` and `ProductOutOfSeasonError` remain. `PRODUCT_UNAVAILABLE` now means only: the product vanished, was unpublished, or has no image. `/api/orders` keeps returning the `productId` so the checkout can name the offending line.

`imageUrl` remains required on an order line, so a product with no image is still unorderable. That is unchanged and out of scope.

## Testing

Delete the tests that assert stock and price gating, and replace them with the inverse:

- `product-availability.test.ts`: a price-less product is available; a stock-free product is available; out-of-season still blocks.
- `order-service.test.ts`: an order containing a price-less line is created, its total counts only priced lines, and no stock is touched. Keep the reservation-projection regression test.
- `CheckoutClient.test.tsx`: a price-less line is displayed, submitted, and rendered without a sum. Remove the stock-cap and out-of-stock cases added on 2026-08-12.
- `ProductDetail.test.tsx`: a price-less product offers add-to-cart.
- `order-notification-service.test.ts`: the operator message labels a price-less line.
- `models.test.ts`, `validations.test.ts`: the product schema no longer knows `stockQuantity`; an order line may omit its price.

The five Playwright specs should keep passing untouched.

## Risks

- **Wide blast radius.** 37 files reference the removed concepts, roughly twenty of them tests. The change is mechanical but broad; it should land as one commit so the tree is never half-migrated.
- **Reporting.** Order totals stop representing the full value of an order. Accepted: the manager settles the price by phone.
- **Reversibility.** Existing `stockQuantity` values are left in MongoDB, so restoring the feature later is a code change rather than a data recovery.
