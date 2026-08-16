# Delivery or Collection — Design

**Date:** 2026-08-16
**Status:** Approved for planning

## Goal

Let the shopper say how they will receive the order: a Yandex courier brings it, or they collect it from the shop. The choice is recorded on the order and shown to the florist, who books the courier themselves.

## Non-goals

- **No Yandex Delivery API.** Nothing is priced, booked, or tracked through Yandex. "Yandex" is the name on a radio button; the florist opens Yandex Go and orders the courier by hand.
- **No new payment methods.** `cash_on_delivery` and `card_on_delivery` stay exactly as they are. Only the words shown to a collecting shopper change.
- **No migration script.** Existing orders keep their shape and read as deliveries.
- No collection time slots, no reservation of a collection window. The florist agrees timing by phone, as they already do for the delivery date.

## Current behaviour and why it blocks

Every order is a delivery. `OrderCustomer.address` is required in three places at once:

- `src/models/Order.ts` — `address: { type: String, required: true, minlength: 8 }`
- `src/lib/validations.ts:281` — `address: z.string().trim().min(8).max(500)`
- `src/lib/services/order-notification-service.ts:130` — the Telegram message always prints `Manzil:`

`deliveryFee` is read from site settings and added to every total (`order-service.ts:419`, `:475`). A collecting shopper would be charged for a courier who never rides, and the florist would receive an address and map links for a parcel nobody delivers.

## New domain rule

> An order is either delivered or collected. A delivered order needs an address; a collected one must not carry one.

## Data model

### Order

`fulfilment` is a property of the order, not of the person, so it sits at the top level beside `paymentMethod` — not inside `customer`.

```ts
// src/lib/contracts.ts
export const FULFILMENT_METHODS = ["delivery", "pickup"] as const;
export type FulfilmentMethod = (typeof FULFILMENT_METHODS)[number];
```

```ts
// src/models/Order.ts
fulfilment: {
  type: String,
  required: true,
  enum: FULFILMENT_METHODS,
  default: "delivery",
}
```

`OrderCustomer.address` becomes `address?: string` and the Mongoose field loses `required: true`.

### Why the address rule lives on the parent schema

A conditional `required` on `address` cannot work: `address` belongs to `orderCustomerSchema`, and inside a subdocument validator `this` is the subdocument, which cannot see `fulfilment` on the order above it. The rule therefore moves up to the order:

```ts
orderSchema.pre("validate", function () {
  if (this.fulfilment === "delivery" && !this.customer?.address?.trim()) {
    this.invalidate("customer.address", "A delivery order needs an address.");
  }
});
```

The invariant then holds for any write, not only for writes that came through the API route.

### Reading orders written before this change

Every order read uses `.lean()` (`admin-repository.ts:211` and eight more; `order-service.ts:262`, `:285`). Mongoose does **not** apply schema defaults to a lean read, so `fulfilment` arrives as `undefined` for every existing order rather than as `"delivery"`.

One helper owns that translation, so no read path repeats `?? "delivery"`:

```ts
// src/lib/order-fulfilment.ts
export function resolveFulfilment(value: string | undefined | null): FulfilmentMethod;
```

This mirrors `resolveSiteName` in `src/lib/site-name.ts`, which exists to solve the same class of problem — correcting a stored value on read instead of migrating the collection.

No migration runs. Existing orders all carry an address and resolve to `delivery`, which is what they were.

## Validation

`checkoutSchema` gains `fulfilment: z.enum(FULFILMENT_METHODS)` and `customer.address` becomes `z.string().trim().max(500).optional()`.

The schema stays a `.strict()` object with a `superRefine`; it does **not** become a discriminated union. Restructuring a schema that already composes `.strict()` with a cross-field `superRefine` buys nothing here and risks changing unrelated error shapes. Two rules join the existing refinement:

| Input | Result |
|---|---|
| `delivery`, address missing or shorter than 8 characters | issue on `customer.address` |
| `pickup`, `address` present | issue on `customer.address` — a collected order must not carry one |
| `pickup`, `location` present | issue on `customer.location` — same reason |

## Customer-facing behaviour

The choice renders as a radio group in the existing house pattern — `<label data-selected={…}>` wrapping a radio, as `paymentMethod` already does at `CheckoutClient.tsx:551` — placed **above** the address field, because it decides whether that field applies.

`delivery` is the default, so today's behaviour is unchanged for a shopper who ignores the control.

Choosing `pickup`:

- the address field (`CheckoutClient.tsx:413-424`) is hidden
- the whole location block (`:425-460`) is hidden, including *detect my position* and *pick on the map*
- the shop's address and working hours appear in its place
- the payment labels read "in cash at the shop" / "by card at the shop"
- the submitted body omits `customer.address` and `customer.location`

### New plumbing: the shop's address

`CheckoutClientProps` currently carries only `products`, `isDemoCatalog` and `catalogTruncated`; the component has no access to site settings. The checkout page passes them in:

```ts
// src/app/(store)/[locale]/checkout/page.tsx
const settings = await getPublicSiteSettings(locale);
// → <CheckoutClient … shop={{ address: settings.address, workingHours: settings.workingHours }} />
```

The page already calls `getPublicSiteSettings` in `generateMetadata`, and the reader is cached (`cacheSiteSettingsReader`), so the second call costs nothing. Both fields are optional on `PublicSiteSettings`; when either is missing the panel shows only what exists, and when both are missing it shows the collection label alone rather than an empty box.

## Operator-facing behaviour

### Telegram

`formatNewOrderNotification` (`order-notification-service.ts:100`) gains a row after `To'lov:`:

```
Olish usuli: Yandex yetkazib berish
Olish usuli: Do'kondan olib ketadi
```

For `pickup` the `Manzil:` row and `locationRows(...)` are both omitted. This is the point of the feature for the florist: an address and a map link on a collected order would send a courier to the shop's own door.

`NewOrderNotification.customer.address` becomes optional and the type gains `fulfilment: FulfilmentMethod`. Notifications stored before this change deserialise with `fulfilment` undefined and go through `resolveFulfilment`, exactly like orders — the type already carries `items?` for the same backward-compatible reason.

### Admin

`AdminOrdersPanel` (`:207`) shows the method next to the payment label. For `pickup` the address block is replaced by "Do'kondan olib ketadi"; `OrderLocation` is not rendered.

## Error handling

- A `delivery` body without an address fails validation at the API boundary and returns the existing field-level error shape; the checkout form shows it against the address input as it does today.
- A `pickup` body that smuggles an address or location is rejected rather than silently cleaned, so a broken client is visible instead of quietly writing a half-truth.
- Switching from `delivery` to `pickup` in the form clears any typed address and any chosen map pin from component state, so re-switching back cannot resurrect a stale pin the shopper believes they removed.

## Testing

| Area | Case |
|---|---|
| `validations` | `delivery` without an address rejected; with one accepted |
| `validations` | `pickup` without an address accepted; with an address or a location rejected |
| `Order` model | `pre("validate")` invalidates a `delivery` order whose address is blank |
| `order-fulfilment` | `resolveFulfilment` maps `undefined`, `null` and an unknown string to `delivery` |
| `order-service` | `deliveryFee` is 0 for `pickup` and the settings value for `delivery` |
| `order-notification-service` | `pickup` message names the method and contains neither `Manzil:` nor a map link; `delivery` message is unchanged |
| `CheckoutClient` | choosing collection hides the address and the map, shows the shop panel, switches the payment wording, and submits a body with no address or location |
| `CheckoutClient` | switching to collection and back leaves the address and pin empty |
| `AdminOrdersPanel` | a `pickup` order shows the collection label and no map; an order with no `fulfilment` renders as a delivery |

## Risks

- **A lean read that skips `resolveFulfilment`** would treat an old order as having no method and could render an empty label. Mitigated by routing every read through the helper and by the admin test that renders an order with `fulfilment` absent.
- **`deliveryFee` is invisible to the shopper.** The checkout never displays it, so a collecting shopper cannot confirm the courier charge was dropped. The stored total is correct, and the operator confirms the final figure by phone, but nothing on screen proves it. Showing a fee line is deliberately out of scope.
- **The two payment values keep saying `_on_delivery`** while the words on screen say "at the shop". Reports read from the enum will show a collected order as paid on delivery. Accepted knowingly: adding `cash_on_pickup` and `card_on_pickup` would touch the model, validation, admin and Telegram for a naming gain, and a wrong migration there costs more than the confusion it removes.
