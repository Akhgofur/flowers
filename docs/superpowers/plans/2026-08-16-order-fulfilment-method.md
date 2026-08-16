# Delivery or Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record whether an order is delivered by a Yandex courier or collected from the shop, and stop sending the florist an address and map link for orders nobody delivers.

**Architecture:** A top-level `fulfilment` field on the order, beside `paymentMethod`. `customer.address` becomes optional and a delivery-needs-an-address rule moves to an `orderSchema.pre("validate")` hook, because a subdocument validator cannot see the parent's `fulfilment`. Orders written before this change read back with `fulfilment` undefined (every read uses `.lean()`, which skips schema defaults), so one helper — `resolveFulfilment` — maps that to `"delivery"` on every read path.

**Tech Stack:** Next.js 16 (App Router), Mongoose 9, zod 4, next-intl 4, vitest 3 + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-08-16-order-fulfilment-method-design.md`

## Global Constraints

- **No Yandex API.** "Yandex" is a label on a radio button. Nothing is priced, booked or tracked through Yandex.
- **`PAYMENT_METHODS` is not changed.** It stays `["cash_on_delivery", "card_on_delivery"]`. Only the words shown to a collecting shopper change.
- **No migration script.** Existing order documents are not rewritten.
- **`delivery` is the default** everywhere a value is absent, so current behaviour is unchanged for anyone who ignores the new control.
- **Three locales.** Every user-facing string lands in `messages/ru.json`, `messages/uz.json` and `messages/en.json`. Uzbek uses the turned comma (`o‘`, `g‘`, `Do‘kon`), not a straight apostrophe.
- Operator-facing strings in Telegram and the admin panel are Uzbek only and hardcoded, matching `paymentMethodLabel` and `STATUS_LABELS`.
- Gates that must pass before each commit: `npm run test:run`, `npm run typecheck`, `npm run lint` (runs with `--max-warnings 0`).

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/contracts.ts` (modify) | `FULFILMENT_METHODS`, `FulfilmentMethod`; `AdminOrder` gains the field, its `address` becomes optional |
| `src/lib/order-fulfilment.ts` (create) | `resolveFulfilment` — the one place a missing stored value becomes `"delivery"` |
| `src/models/Order.ts` (modify) | `fulfilment` field, optional `address`, the parent-level invariant |
| `src/lib/validations.ts` (modify) | `checkoutSchema`: the field, optional address, the two cross-field rules |
| `src/lib/services/order-service.ts` (modify) | `PendingOrderRecord.fulfilment`, fee of 0 for collection, conditional address |
| `src/lib/services/order-notification-service.ts` (modify) | notification type + the `Olish usuli` row, address and map rows suppressed |
| `src/lib/repositories/order-notification-repository.ts` (modify) | reads `fulfilment` through the helper |
| `src/lib/repositories/admin-repository.ts` (modify) | `toAdminOrder` reads `fulfilment` through the helper |
| `src/components/admin/AdminOrdersPanel.tsx` (modify) | shows the method; collection replaces the address block |
| `src/components/checkout/CheckoutClient.tsx` (modify) | the radio group, hiding, payment copy, submit body, shop panel |
| `src/app/(store)/[locale]/checkout/page.tsx` (modify) | passes the shop address and hours in |
| `messages/{ru,uz,en}.json` (modify) | the `Checkout` strings |

---

### Task 1: The fulfilment vocabulary and the read helper

**Files:**
- Modify: `src/lib/contracts.ts:21-24` (beside `PAYMENT_METHODS`) and `:36-39` (beside the type aliases)
- Create: `src/lib/order-fulfilment.ts`
- Test: `src/lib/order-fulfilment.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `FULFILMENT_METHODS: readonly ["delivery", "pickup"]`, `type FulfilmentMethod = "delivery" | "pickup"` from `@/lib/contracts`; `resolveFulfilment(value: string | undefined | null): FulfilmentMethod` from `@/lib/order-fulfilment`. Every later task uses both.

- [ ] **Step 1: Write the failing test**

Create `src/lib/order-fulfilment.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FULFILMENT_METHODS } from "@/lib/contracts";
import { resolveFulfilment } from "./order-fulfilment";

describe("resolveFulfilment", () => {
  it("keeps a stored method that the schema allows", () => {
    expect(resolveFulfilment("delivery")).toBe("delivery");
    expect(resolveFulfilment("pickup")).toBe("pickup");
  });

  it("reads an order written before the field existed as a delivery", () => {
    // Every order read uses .lean(), which does not apply schema defaults, so
    // the field arrives undefined rather than as "delivery".
    expect(resolveFulfilment(undefined)).toBe("delivery");
    expect(resolveFulfilment(null)).toBe("delivery");
  });

  it("falls back rather than trusting an unknown value", () => {
    expect(resolveFulfilment("courier")).toBe("delivery");
    expect(resolveFulfilment("")).toBe("delivery");
  });

  it("offers exactly the two methods", () => {
    expect(FULFILMENT_METHODS).toEqual(["delivery", "pickup"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/order-fulfilment.test.ts`
Expected: FAIL — cannot resolve `./order-fulfilment`, and `FULFILMENT_METHODS` is not exported from contracts.

- [ ] **Step 3: Add the vocabulary to contracts**

In `src/lib/contracts.ts`, directly after the `PAYMENT_METHODS` block (line 24):

```ts
export const FULFILMENT_METHODS = ["delivery", "pickup"] as const;
```

And beside the other aliases, after `export type PaymentMethod = ...` (line 38):

```ts
export type FulfilmentMethod = (typeof FULFILMENT_METHODS)[number];
```

- [ ] **Step 4: Write the helper**

Create `src/lib/order-fulfilment.ts`:

```ts
import { FULFILMENT_METHODS, type FulfilmentMethod } from "@/lib/contracts";

const KNOWN = new Set<string>(FULFILMENT_METHODS);

/**
 * Presents a stored fulfilment method, defaulting anything unusable to delivery.
 *
 * Orders are read with `.lean()`, which skips schema defaults, so every order
 * written before this field existed arrives with it undefined. Those orders were
 * deliveries — they all carry an address — so that is what they read back as.
 * Mirrors `resolveSiteName` in `@/lib/site-name`, which corrects a stored value
 * on read for the same reason: to avoid rewriting the collection.
 */
export function resolveFulfilment(value: string | undefined | null): FulfilmentMethod {
  const trimmed = value?.trim() ?? "";
  return KNOWN.has(trimmed) ? (trimmed as FulfilmentMethod) : "delivery";
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/order-fulfilment.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/contracts.ts src/lib/order-fulfilment.ts src/lib/order-fulfilment.test.ts
git commit -m "Name the two ways an order reaches the customer"
```

---

### Task 2: The Order model carries the method and guards the address

**Files:**
- Modify: `src/models/Order.ts:10-17` (`OrderCustomer`), `:29-42` (`OrderDocument`), `:93` (the address field), `:103-145` (the schema), `:147` (before the indexes)
- Test: `src/models/models.test.ts`

**Interfaces:**
- Consumes: `FULFILMENT_METHODS`, `FulfilmentMethod` from `@/lib/contracts` (Task 1).
- Produces: `OrderDocument.fulfilment: FulfilmentMethod`; `OrderCustomer.address?: string`. Tasks 4, 5, 6 read both.

- [ ] **Step 1: Write the failing test**

Append to `src/models/models.test.ts` (it already imports `OrderModel`; if not, add `import { OrderModel } from "@/models/Order";`):

```ts
function orderDraft(overrides: Record<string, unknown> = {}) {
  return new OrderModel({
    number: "FL-260816-0001",
    locale: "ru",
    customer: { fullName: "Aziza Karimova", phone: "+998901234567" },
    items: [
      {
        productId: "507f1f77bcf86cd799439011",
        slug: "azure-surprise",
        name: "Azure surprise",
        imageUrl: "https://example.com/a.png",
        quantity: 1,
      },
    ],
    subtotal: 0,
    deliveryFee: 0,
    total: 0,
    paymentMethod: "cash_on_delivery",
    ...overrides,
  });
}

**Use `validate()`, never `validateSync()`, for the address cases.**
`validateSync()` skips middleware, so a `pre("validate")` hook never runs under
it and every one of these assertions would pass whether the hook exists or not.

```ts
async function validationErrors(overrides: Record<string, unknown> = {}) {
  try {
    await orderDraft(overrides).validate();
    return null;
  } catch (error) {
    return error as { errors: Record<string, unknown> };
  }
}

it("defaults an order to delivery", () => {
  expect(orderDraft().fulfilment).toBe("delivery");
});

it("refuses a delivery with no address", async () => {
  const error = await validationErrors({ fulfilment: "delivery" });

  expect(error?.errors["customer.address"]).toBeDefined();
});

it("accepts a collection with no address", async () => {
  const error = await validationErrors({ fulfilment: "pickup" });

  expect(error?.errors["customer.address"]).toBeUndefined();
});

it("accepts a delivery that carries an address", async () => {
  const error = await validationErrors({
    fulfilment: "delivery",
    customer: {
      fullName: "Aziza Karimova",
      phone: "+998901234567",
      address: "Yunusobod 19, Toshkent",
    },
  });

  expect(error?.errors["customer.address"]).toBeUndefined();
});

it("rejects a method outside the two on offer", async () => {
  const error = await validationErrors({ fulfilment: "drone" });

  expect(error?.errors.fulfilment).toBeDefined();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/models/models.test.ts -t "delivery"`
Expected: FAIL — `fulfilment` is undefined (no such path), and a customer with no address is currently rejected by the subdocument's own `required: true`, so the "accepts a collection" case fails.

- [ ] **Step 3: Loosen the address and add the field**

In `src/models/Order.ts`, change the `OrderCustomer` type (line 13) to make the address optional:

```ts
export type OrderCustomer = {
  fullName: string;
  phone: string;
  /** Absent on a collected order; the shopper comes to the shop. */
  address?: string;
  location?: GeoPoint;
  deliveryDate?: Date;
  comment?: string;
};
```

Add to `OrderDocument`, directly after `customer` (line 32):

```ts
  fulfilment: FulfilmentMethod;
```

Replace the contracts import on line 2 — one statement, not two, or `no-duplicate-imports` fails the lint gate:

```ts
import {
  FULFILMENT_METHODS,
  type FulfilmentMethod,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/contracts";
```

Drop `required: true` from the address field (line 93), keeping the length bounds for when a value is present:

```ts
    address: { type: String, trim: true, minlength: 8, maxlength: 500 },
```

Add the schema field after `customer` (line 112):

```ts
    fulfilment: {
      type: String,
      required: true,
      enum: FULFILMENT_METHODS,
      default: "delivery",
    },
```

- [ ] **Step 4: Add the parent-level invariant**

In `src/models/Order.ts`, between the schema definition and the indexes (before line 147):

```ts
/**
 * The rule cannot live on `address` itself. That field belongs to
 * `orderCustomerSchema`, and inside a subdocument validator `this` is the
 * subdocument, which cannot see `fulfilment` on the order above it. Raising the
 * check to the parent also means it holds for any write, not only for writes
 * that arrived through the checkout route.
 */
orderSchema.pre("validate", function () {
  if (this.fulfilment === "delivery" && !this.customer?.address?.trim()) {
    this.invalidate("customer.address", "A delivery order needs an address.");
  }
});
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/models/models.test.ts`
Expected: PASS — the 5 new cases plus every case already in the file.

- [ ] **Step 6: Commit**

```bash
git add src/models/Order.ts src/models/models.test.ts
git commit -m "Let an order be collected instead of delivered"
```

---

### Task 3: The checkout boundary enforces the rule

**Files:**
- Modify: `src/lib/validations.ts:274-314` (`checkoutSchema`)
- Test: `src/lib/validations.test.ts`

**Interfaces:**
- Consumes: `FULFILMENT_METHODS` from `@/lib/contracts` (Task 1).
- Produces: `CheckoutInput` gains `fulfilment: FulfilmentMethod`; `CheckoutInput["customer"]["address"]` becomes `string | undefined`. Tasks 4 and 7 rely on both.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/validations.test.ts`. Match the file's existing helper style; if it has no checkout builder, add this one:

```ts
function checkoutBody(overrides: Record<string, unknown> = {}) {
  return {
    locale: "ru",
    fulfilment: "delivery",
    customer: {
      fullName: "Aziza Karimova",
      phone: "+998901234567",
      address: "Yunusobod 19, Toshkent",
    },
    paymentMethod: "cash_on_delivery",
    items: [{ productId: "507f1f77bcf86cd799439011", quantity: 1 }],
    ...overrides,
  };
}

it("accepts a delivery that carries an address", () => {
  expect(checkoutSchema.safeParse(checkoutBody()).success).toBe(true);
});

it("refuses a delivery with no address", () => {
  const result = checkoutSchema.safeParse(
    checkoutBody({ customer: { fullName: "Aziza Karimova", phone: "+998901234567" } })
  );

  expect(result.success).toBe(false);
  expect(result.error?.issues.some((issue) => issue.path.join(".") === "customer.address")).toBe(
    true
  );
});

it("accepts a collection with no address", () => {
  const result = checkoutSchema.safeParse(
    checkoutBody({
      fulfilment: "pickup",
      customer: { fullName: "Aziza Karimova", phone: "+998901234567" },
    })
  );

  expect(result.success).toBe(true);
});

it("refuses a collection that smuggles an address", () => {
  const result = checkoutSchema.safeParse(checkoutBody({ fulfilment: "pickup" }));

  expect(result.success).toBe(false);
  expect(result.error?.issues.some((issue) => issue.path.join(".") === "customer.address")).toBe(
    true
  );
});

it("refuses a collection that smuggles a map pin", () => {
  const result = checkoutSchema.safeParse(
    checkoutBody({
      fulfilment: "pickup",
      customer: {
        fullName: "Aziza Karimova",
        phone: "+998901234567",
        location: { latitude: 41.3, longitude: 69.2 },
      },
    })
  );

  expect(result.success).toBe(false);
  expect(result.error?.issues.some((issue) => issue.path.join(".") === "customer.location")).toBe(
    true
  );
});

it("still refuses a body with no fulfilment at all", () => {
  const { fulfilment: _omitted, ...withoutMethod } = checkoutBody();

  expect(checkoutSchema.safeParse(withoutMethod).success).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/validations.test.ts -t "collection"`
Expected: FAIL — `.strict()` rejects the unknown key `fulfilment`, so even the delivery cases fail.

- [ ] **Step 3: Add the field and loosen the address**

In `src/lib/validations.ts`, add the field to `checkoutSchema` beside `locale` (line 276) and relax the address (line 281):

```ts
    locale: z.enum(LOCALES),
    fulfilment: z.enum(FULFILMENT_METHODS),
```

```ts
        address: z.string().trim().min(8).max(500).optional(),
```

Extend the contracts import at the top of the file to include `FULFILMENT_METHODS` alongside `PAYMENT_METHODS`.

- [ ] **Step 4: Add the two cross-field rules**

The schema stays a `.strict()` object with a `superRefine` — it does not become a discriminated union. Add to the existing `superRefine` body (after the `items.forEach` block, before its closing brace at line 313):

```ts
    if (input.fulfilment === "delivery" && !input.customer.address) {
      context.addIssue({
        code: "custom",
        path: ["customer", "address"],
        message: "A delivery needs an address.",
      });
    }

    // Rejected rather than quietly dropped: a client that sends these is broken,
    // and silently cleaning the body would write a half-truth instead.
    if (input.fulfilment === "pickup") {
      if (input.customer.address !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["customer", "address"],
          message: "A collected order must not carry an address.",
        });
      }
      if (input.customer.location !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["customer", "location"],
          message: "A collected order must not carry a map point.",
        });
      }
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/validations.test.ts`
Expected: PASS — the 6 new cases plus every case already in the file.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations.ts src/lib/validations.test.ts
git commit -m "Require an address only when the order is delivered"
```

---

### Task 4: Collection is stored, and costs no delivery fee

**Files:**
- Modify: `src/lib/services/order-service.ts:54-61` (`StoredOrderCustomer`), `:63-74` (`PendingOrderRecord`), `:419-422` (the fee), `:478-501` (the stored draft)
- Test: `src/lib/services/order-service.test.ts`

**Interfaces:**
- Consumes: `FulfilmentMethod` (Task 1); `CheckoutInput.fulfilment` (Task 3).
- Produces: `PendingOrderRecord.fulfilment: FulfilmentMethod`, `StoredOrderCustomer.address?: string`. Task 6's repository mapping reads the same shape back.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/services/order-service.test.ts`, reusing the fake store the file already builds:

```ts
it("charges no delivery fee on a collected order", async () => {
  const { service, store } = buildService({ deliveryFee: 25000 });

  await service.createPendingOrder(
    checkoutInput({
      fulfilment: "pickup",
      customer: { fullName: "Aziza Karimova", phone: "+998901234567" },
    })
  );

  expect(store.lastCreatedOrder?.deliveryFee).toBe(0);
  expect(store.lastCreatedOrder?.fulfilment).toBe("pickup");
  expect(store.lastCreatedOrder?.customer.address).toBeUndefined();
});

it("still charges the settings fee on a delivery", async () => {
  const { service, store } = buildService({ deliveryFee: 25000 });

  await service.createPendingOrder(checkoutInput({ fulfilment: "delivery" }));

  expect(store.lastCreatedOrder?.deliveryFee).toBe(25000);
  expect(store.lastCreatedOrder?.fulfilment).toBe("delivery");
});
```

If the existing file has no `buildService`/`checkoutInput`/`lastCreatedOrder` seam, extend its current fake store to capture the draft passed to `createOrder` and add a `fulfilment` argument to its checkout-input builder, keeping `delivery` as that builder's default so no existing case changes.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/services/order-service.test.ts -t "collected order"`
Expected: FAIL — the fee is 25000 for a collection and `fulfilment` is absent from the stored draft.

- [ ] **Step 3: Widen the types**

In `src/lib/services/order-service.ts`, make the address optional (line 57) and add the field to the draft (after line 66):

```ts
export type StoredOrderCustomer = {
  fullName: string;
  phone: string;
  address?: string;
  location?: GeoPoint;
  deliveryDate?: Date;
  comment?: string;
};
```

```ts
export type PendingOrderRecord = {
  number: string;
  locale: Locale;
  customer: StoredOrderCustomer;
  fulfilment: FulfilmentMethod;
  items: StoredOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid";
  status: "pending";
};
```

Import `FulfilmentMethod` from `@/lib/contracts` alongside the types already imported there.

- [ ] **Step 4: Drop the fee and store the method**

Replace the fee lookup (lines 419-422):

```ts
            // A courier who never rides is not charged for.
            const deliveryFee =
              checkout.fulfilment === "pickup"
                ? 0
                : ensureMoney(
                    await dependencies.store.getDeliveryFee(transaction),
                    "Delivery fee"
                  );
```

In the stored draft (lines 480-493), make the address conditional and add the method after the `customer` block:

```ts
                customer: {
                  fullName: checkout.customer.fullName,
                  phone: checkout.customer.phone,
                  ...(checkout.customer.address === undefined
                    ? {}
                    : { address: checkout.customer.address }),
                  ...(checkout.customer.location === undefined
                    ? {}
                    : { location: roundGeoPoint(checkout.customer.location) }),
                  ...(checkout.customer.deliveryDate === undefined
                    ? {}
                    : { deliveryDate: parseDeliveryDate(checkout.customer.deliveryDate) }),
                  ...(checkout.customer.comment === undefined
                    ? {}
                    : { comment: checkout.customer.comment }),
                },
                fulfilment: checkout.fulfilment,
```

If `normalizeCheckoutInput` copies customer fields explicitly, carry `fulfilment` and the now-optional `address` through it too.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/services/order-service.test.ts`
Expected: PASS — the 2 new cases plus every case already in the file.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/order-service.ts src/lib/services/order-service.test.ts
git commit -m "Charge no courier fee when the shopper collects"
```

---

### Task 5: The florist is told how the order leaves

**Files:**
- Modify: `src/lib/services/order-notification-service.ts:17-32` (the type), `:80-82` (beside `paymentMethodLabel`), `:100-134` (`formatNewOrderNotification`)
- Modify: `src/lib/repositories/order-notification-repository.ts:90-119` (`loadOrderNotification`)
- Test: `src/lib/services/order-notification-service.test.ts`

**Interfaces:**
- Consumes: `FulfilmentMethod` (Task 1), `resolveFulfilment` (Task 1).
- Produces: `NewOrderNotification.fulfilment: FulfilmentMethod` and `NewOrderNotification["customer"]["address"]?: string`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/services/order-notification-service.test.ts`:

```ts
const baseNotification = {
  orderNumber: "FL-260816-0001",
  total: 350000,
  paymentMethod: "cash_on_delivery" as const,
  fulfilment: "delivery" as const,
  customer: {
    fullName: "Aziza Karimova",
    phone: "+998901234567",
    address: "Yunusobod 19, Toshkent",
    location: { latitude: 41.3, longitude: 69.2 },
  },
};

it("names Yandex delivery and keeps the address and map links", () => {
  const text = formatNewOrderNotification(baseNotification);

  expect(text).toContain("Olish usuli: Yandex yetkazib berish");
  expect(text).toContain("Manzil: Yunusobod 19, Toshkent");
  expect(text).toContain("Xarita: ");
});

it("names collection and prints no address or map links", () => {
  const text = formatNewOrderNotification({
    ...baseNotification,
    fulfilment: "pickup",
    customer: { fullName: "Aziza Karimova", phone: "+998901234567" },
  });

  expect(text).toContain("Olish usuli: Do‘kondan olib ketadi");
  expect(text).not.toContain("Manzil:");
  expect(text).not.toContain("Xarita:");
  expect(text).not.toContain("Taksi:");
});

it("reads a notification stored before the field existed as a delivery", () => {
  const { fulfilment: _omitted, ...legacy } = baseNotification;
  const text = formatNewOrderNotification(legacy as typeof baseNotification);

  expect(text).toContain("Olish usuli: Yandex yetkazib berish");
  expect(text).toContain("Manzil: Yunusobod 19, Toshkent");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/services/order-notification-service.test.ts -t "Olish usuli"`
Expected: FAIL — no `Olish usuli` row exists, and the collection case still prints `Manzil:`.

- [ ] **Step 3: Extend the type and add the label**

In `src/lib/services/order-notification-service.ts`, add to `NewOrderNotification` after `paymentMethod` (line 20) and make the address optional (line 24):

```ts
  /** Absent on notifications stored before collection existed; read as delivery. */
  fulfilment?: FulfilmentMethod;
```

```ts
    /** Absent on a collected order. */
    address?: string;
```

Import `type FulfilmentMethod` from `@/lib/contracts` beside `PaymentMethod`, and `resolveFulfilment` from `@/lib/order-fulfilment`.

Add beside `paymentMethodLabel` (after line 82):

```ts
function fulfilmentLabel(fulfilment: FulfilmentMethod): string {
  return fulfilment === "pickup" ? "Do‘kondan olib ketadi" : "Yandex yetkazib berish";
}
```

- [ ] **Step 4: Rewrite the message body**

Replace the return block of `formatNewOrderNotification` (lines 122-133):

```ts
  const fulfilment = resolveFulfilment(order.fulfilment);
  // An address and a taxi link on a collected order would send the courier to
  // the shop's own door, which is the whole point of telling the florist.
  const destinationRows =
    fulfilment === "pickup"
      ? []
      : [`Manzil: ${order.customer.address ?? "—"}`, ...locationRows(order.customer.location)];

  return [
    `Yangi buyurtma: ${order.orderNumber}`,
    `Jami: ${formatSum(order.total, "uz")}`,
    `To'lov: ${paymentMethodLabel(order.paymentMethod)}`,
    `Olish usuli: ${fulfilmentLabel(fulfilment)}`,
    ...itemRows,
    "",
    `Mijoz: ${order.customer.fullName}`,
    `Telefon: ${order.customer.phone}`,
    ...destinationRows,
    ...optionalRows,
  ].join("\n");
```

- [ ] **Step 5: Carry the field out of the database**

In `src/lib/repositories/order-notification-repository.ts`, add to the returned object after `paymentMethod` (line 93) and make the address conditional (line 103):

```ts
    fulfilment: resolveFulfilment(document.fulfilment),
```

```ts
      ...(document.customer.address === undefined
        ? {}
        : { address: document.customer.address }),
```

Import `resolveFulfilment` from `@/lib/order-fulfilment`. If `OrderRecord` is declared locally in this file, add `fulfilment?: string` to it and make its `customer.address` optional.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/lib/services/order-notification-service.test.ts`
Expected: PASS — the 3 new cases plus every case already in the file.

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/order-notification-service.ts src/lib/repositories/order-notification-repository.ts src/lib/services/order-notification-service.test.ts
git commit -m "Tell the florist when nobody needs to deliver"
```

---

### Task 6: The admin panel shows the method

**Files:**
- Modify: `src/lib/contracts.ts:214-225` (`AdminOrder`)
- Modify: `src/lib/repositories/admin-repository.ts:89-111` (`toAdminOrder`)
- Modify: `src/components/admin/AdminOrdersPanel.tsx:207` (the order card)
- Test: `src/components/admin/AdminOrdersPanel.test.tsx`

**Interfaces:**
- Consumes: `FulfilmentMethod`, `resolveFulfilment` (Task 1).
- Produces: `AdminOrder.fulfilment: FulfilmentMethod`, `AdminOrder["customer"]["address"]?: string`.

- [ ] **Step 1: Write the failing test**

Append to `src/components/admin/AdminOrdersPanel.test.tsx`, using the order fixture the file already builds:

```ts
it("marks a collected order and shows no address or map", () => {
  render(
    <AdminOrdersPanel
      orders={[
        {
          ...adminOrder,
          fulfilment: "pickup",
          customer: { fullName: "Aziza Karimova", phone: "+998901234567" },
        },
      ]}
    />
  );

  expect(screen.getByText("Do‘kondan olib ketadi")).toBeVisible();
  expect(screen.queryByRole("link", { name: /xarita/i })).not.toBeInTheDocument();
});

it("marks a delivery and keeps the address", () => {
  render(<AdminOrdersPanel orders={[{ ...adminOrder, fulfilment: "delivery" }]} />);

  expect(screen.getByText("Yetkazib berish")).toBeVisible();
  expect(screen.getByText(adminOrder.customer.address!)).toBeVisible();
});

it("falls back to delivery if a raw order ever reaches it unresolved", () => {
  // `toAdminOrder` always resolves the method, so this state should be
  // unreachable. The panel defends anyway: a future read path that forgets the
  // helper would otherwise render a blank label rather than fail loudly.
  const unresolved = { ...adminOrder, fulfilment: undefined } as unknown as AdminOrder;
  render(<AdminOrdersPanel orders={[unresolved]} />);

  expect(screen.getByText("Yetkazib berish")).toBeVisible();
});
```

Match the props the existing tests pass to `AdminOrdersPanel` — reuse their render helper rather than inventing one.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/admin/AdminOrdersPanel.test.tsx -t "collected order"`
Expected: FAIL — no such text is rendered, and TypeScript rejects `fulfilment` on the fixture.

- [ ] **Step 3: Extend the contract**

In `src/lib/contracts.ts`, inside `AdminOrder`, make the address optional (line 221) and add the field after the `customer` block (line 225):

```ts
  customer: {
    fullName: string;
    phone: string;
    address?: string;
    location?: GeoPoint;
    deliveryDate?: string;
    comment?: string;
  };
  fulfilment: FulfilmentMethod;
```

- [ ] **Step 4: Map it in the repository**

In `src/lib/repositories/admin-repository.ts`, make the address conditional (line 100) and add the field after the `customer` block:

```ts
      ...(document.customer.address === undefined
        ? {}
        : { address: document.customer.address }),
```

```ts
    fulfilment: resolveFulfilment(document.fulfilment),
```

Import `resolveFulfilment` from `@/lib/order-fulfilment`. Note the file already reads defensively one line above (`locale: document.locale ?? "ru"`), so this follows an established habit. If `OrderRecord` is declared in this file, add `fulfilment?: string` and make `customer.address` optional.

- [ ] **Step 5: Render it**

In `src/components/admin/AdminOrdersPanel.tsx`, add a label map beside `STATUS_LABELS`:

```tsx
const FULFILMENT_LABELS: Record<FulfilmentMethod, string> = {
  delivery: "Yetkazib berish",
  pickup: "Do‘kondan olib ketadi",
};
```

Resolve the method once at the top of the card's render, so the panel degrades to
delivery instead of rendering a blank label if a read path ever skips the helper:

```tsx
const fulfilment = resolveFulfilment(order.fulfilment);
```

In the order card, append the method to the meta line that already carries the item count and payment:

```tsx
<span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} ta mahsulot · {order.paymentMethod === "cash_on_delivery" ? "Naqd" : "Karta"} · {FULFILMENT_LABELS[fulfilment]}</span>
```

And replace the address block so a collected order shows the label instead of an address or a map:

```tsx
<div className="admin-order__address">
  {fulfilment === "pickup" ? (
    <p>{FULFILMENT_LABELS.pickup}</p>
  ) : (
    <>
      <p>{order.customer.address}</p>
      {order.customer.location ? <OrderLocation location={order.customer.location} /> : null}
    </>
  )}
</div>
```

Import `type FulfilmentMethod` from `@/lib/contracts` and `resolveFulfilment` from `@/lib/order-fulfilment`. The card body is a single long JSX expression in this file; declare `fulfilment` in the `.map` callback that yields it, not at component scope.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/components/admin/AdminOrdersPanel.test.tsx`
Expected: PASS — the 2 new cases plus every case already in the file.

- [ ] **Step 7: Commit**

```bash
git add src/lib/contracts.ts src/lib/repositories/admin-repository.ts src/components/admin/AdminOrdersPanel.tsx src/components/admin/AdminOrdersPanel.test.tsx
git commit -m "Show the operator how each order leaves the shop"
```

---

### Task 7: The shopper chooses, and the form follows

**Files:**
- Modify: `messages/ru.json`, `messages/uz.json`, `messages/en.json` (the `Checkout` namespace, beside `cashOnDelivery`)
- Modify: `src/components/checkout/CheckoutClient.tsx:45-53` (`CheckoutForm`), `:84-88` (the initial form), `:96-108` (`toCheckoutInput`), `:413-460` (address and location blocks), `:550-575` (the payment options)
- Test: `src/components/checkout/CheckoutClient.test.tsx`

**Interfaces:**
- Consumes: `CheckoutInput.fulfilment` (Task 3).
- Produces: `CheckoutForm.fulfilment: FulfilmentMethod`. Task 8 adds the shop panel inside the block this task creates.

- [ ] **Step 1: Add the strings**

Add to the `Checkout` namespace of all three files, directly after `cashHelp`/`cardHelp` so the payment strings stay together.

`messages/ru.json`:

```json
    "fulfilmentLabel": "Способ получения",
    "fulfilmentDelivery": "Доставка Яндексом",
    "fulfilmentDeliveryHelp": "Курьер привезёт по адресу.",
    "fulfilmentPickup": "Забрать из магазина",
    "fulfilmentPickupHelp": "Вы заберёте заказ сами.",
    "cashAtShop": "Наличными в магазине",
    "cashAtShopHelp": "Оплатите при получении.",
    "cardAtShop": "Картой в магазине",
    "cardAtShopHelp": "Оплатите через терминал в магазине.",
```

`messages/uz.json`:

```json
    "fulfilmentLabel": "Olish usuli",
    "fulfilmentDelivery": "Yandex yetkazib berish",
    "fulfilmentDeliveryHelp": "Kuryer manzilingizga olib boradi.",
    "fulfilmentPickup": "Do‘kondan olib ketaman",
    "fulfilmentPickupHelp": "Buyurtmani o‘zingiz olib ketasiz.",
    "cashAtShop": "Do‘konda naqd pul bilan",
    "cashAtShopHelp": "Olayotganda naqd to‘lang.",
    "cardAtShop": "Do‘konda karta bilan",
    "cardAtShopHelp": "Do‘kondagi terminal orqali to‘lang.",
```

`messages/en.json`:

```json
    "fulfilmentLabel": "How you receive it",
    "fulfilmentDelivery": "Yandex delivery",
    "fulfilmentDeliveryHelp": "A courier brings it to your address.",
    "fulfilmentPickup": "Collect from the shop",
    "fulfilmentPickupHelp": "You collect the order yourself.",
    "cashAtShop": "In cash at the shop",
    "cashAtShopHelp": "Pay when you collect.",
    "cardAtShop": "By card at the shop",
    "cardAtShopHelp": "Pay by terminal at the shop.",
```

- [ ] **Step 2: Write the failing test**

Append to `src/components/checkout/CheckoutClient.test.tsx`, reusing the file's existing render helper and fetch stub:

```ts
it("hides the address and the map once the shopper chooses to collect", async () => {
  const user = userEvent.setup();
  renderCheckout();

  await user.click(screen.getByRole("radio", { name: /Забрать из магазина/i }));

  expect(screen.queryByLabelText(/адрес/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /на карте/i })).not.toBeInTheDocument();
  expect(screen.getByText("Наличными в магазине")).toBeVisible();
});

it("submits a collected order with no address or map point", async () => {
  const user = userEvent.setup();
  const { fetchMock } = renderCheckout();

  await user.click(screen.getByRole("radio", { name: /Забрать из магазина/i }));
  await fillRequiredFields(user);
  await user.click(screen.getByRole("button", { name: /подтвердить/i }));

  const body = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
  expect(body.fulfilment).toBe("pickup");
  expect(body.customer.address).toBeUndefined();
  expect(body.customer.location).toBeUndefined();
});

it("forgets a typed address and a chosen pin when the shopper switches to collection", async () => {
  const user = userEvent.setup();
  renderCheckout();

  await user.type(screen.getByLabelText(/адрес/i), "Yunusobod 19, Toshkent");
  await user.click(screen.getByRole("radio", { name: /Забрать из магазина/i }));
  await user.click(screen.getByRole("radio", { name: /Доставка Яндексом/i }));

  expect(screen.getByLabelText(/адрес/i)).toHaveValue("");
});
```

Add `fillRequiredFields` next to the helpers already in the file if it has no equivalent; it should fill the name and phone only, since the address is what these cases are about.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/checkout/CheckoutClient.test.tsx -t "collect"`
Expected: FAIL — there is no such radio to click.

- [ ] **Step 4: Add the field to the form state**

In `src/components/checkout/CheckoutClient.tsx`, extend `CheckoutForm` (line 52):

```ts
  paymentMethod: CheckoutInput["paymentMethod"];
  fulfilment: CheckoutInput["fulfilment"];
```

Add to the initial form (after line 88):

```ts
  fulfilment: "delivery",
```

Rewrite `toCheckoutInput` (lines 96-108) so a collection sends neither field:

```ts
  const collecting = form.fulfilment === "pickup";

  return {
    locale,
    fulfilment: form.fulfilment,
    customer: {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      ...(collecting || !form.address.trim() ? {} : { address: form.address.trim() }),
      ...(collecting || !form.location ? {} : { location: form.location }),
      ...(form.deliveryDate ? { deliveryDate: form.deliveryDate } : {}),
      ...(form.comment.trim() ? { comment: form.comment.trim() } : {}),
    },
    paymentMethod: form.paymentMethod,
    items: items.map((item) => ({ ...item })),
  };
```

- [ ] **Step 5: Render the choice and hide what it makes irrelevant**

Add a radio group immediately above the address label (before line 413), in the same house pattern the payment options use:

```tsx
<div
  className="checkout-fields__full checkout-payment-options"
  role="radiogroup"
  aria-label={t("fulfilmentLabel")}
>
  <label data-selected={form.fulfilment === "delivery"}>
    <input
      type="radio"
      name="fulfilment"
      value="delivery"
      checked={form.fulfilment === "delivery"}
      onChange={() => selectFulfilment("delivery")}
    />
    <span aria-hidden="true">⇢</span>
    <strong>{t("fulfilmentDelivery")}</strong>
    <small>{t("fulfilmentDeliveryHelp")}</small>
  </label>
  <label data-selected={form.fulfilment === "pickup"}>
    <input
      type="radio"
      name="fulfilment"
      value="pickup"
      checked={form.fulfilment === "pickup"}
      onChange={() => selectFulfilment("pickup")}
    />
    <span aria-hidden="true">⌂</span>
    <strong>{t("fulfilmentPickup")}</strong>
    <small>{t("fulfilmentPickupHelp")}</small>
  </label>
</div>
```

Add the handler beside `updateForm`. It clears both fields, so switching back cannot resurrect a pin the shopper believes they removed:

```tsx
const selectFulfilment = (fulfilment: CheckoutInput["fulfilment"]) => {
  setForm((current) => ({ ...current, fulfilment, address: "", location: null }));
  setIsMapOpen(false);
};
```

Match the real setter name in the file if it is not `setForm`.

Wrap the address label (lines 413-424) and the whole location block (lines 425-460) in `{form.fulfilment === "delivery" ? ( … ) : null}`.

- [ ] **Step 6: Switch the payment wording**

In the payment options (lines 560-573), pick the label by fulfilment:

```tsx
<strong>{form.fulfilment === "pickup" ? t("cashAtShop") : t("cashOnDelivery")}</strong>
<small>{form.fulfilment === "pickup" ? t("cashAtShopHelp") : t("cashHelp")}</small>
```

```tsx
<strong>{form.fulfilment === "pickup" ? t("cardAtShop") : t("cardOnDelivery")}</strong>
<small>{form.fulfilment === "pickup" ? t("cardAtShopHelp") : t("cardHelp")}</small>
```

The `value` and `checked` attributes keep using `cash_on_delivery` and `card_on_delivery`. The enum does not change.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/components/checkout/CheckoutClient.test.tsx`
Expected: PASS — the 3 new cases plus every case already in the file.

- [ ] **Step 8: Commit**

```bash
git add messages/ru.json messages/uz.json messages/en.json src/components/checkout/CheckoutClient.tsx src/components/checkout/CheckoutClient.test.tsx
git commit -m "Let the shopper say they will collect the order"
```

---

### Task 8: Tell the shopper where to come

**Files:**
- Modify: `messages/ru.json`, `messages/uz.json`, `messages/en.json` (two more `Checkout` keys)
- Modify: `src/app/(store)/[locale]/checkout/page.tsx` (the page component that renders `CheckoutClient`)
- Modify: `src/components/checkout/CheckoutClient.tsx:38-43` (`CheckoutClientProps`), plus the collection branch from Task 7
- Test: `src/components/checkout/CheckoutClient.test.tsx`

**Interfaces:**
- Consumes: `CheckoutForm.fulfilment` and the collection branch (Task 7).
- Produces: `CheckoutClientProps.shop?: { address?: string; workingHours?: string }`.

- [ ] **Step 1: Add the strings**

`messages/ru.json`: `"pickupPoint": "Адрес магазина"`, `"pickupHours": "Часы работы"`
`messages/uz.json`: `"pickupPoint": "Do‘kon manzili"`, `"pickupHours": "Ish vaqti"`
`messages/en.json`: `"pickupPoint": "Shop address"`, `"pickupHours": "Opening hours"`

- [ ] **Step 2: Write the failing test**

Append to `src/components/checkout/CheckoutClient.test.tsx`:

```ts
it("shows where and when to collect", async () => {
  const user = userEvent.setup();
  renderCheckout({ shop: { address: "Yunusobod 19, Toshkent", workingHours: "08:00–22:00" } });

  await user.click(screen.getByRole("radio", { name: /Забрать из магазина/i }));

  expect(screen.getByText("Yunusobod 19, Toshkent")).toBeVisible();
  expect(screen.getByText("08:00–22:00")).toBeVisible();
});

it("shows the collection label alone when the shop has no address on file", async () => {
  const user = userEvent.setup();
  const { container } = renderCheckout({ shop: {} });

  await user.click(screen.getByRole("radio", { name: /Забрать из магазина/i }));

  // Scoped to the panel on purpose: "Забрать из магазина" is also the radio's
  // own label, so an unscoped getByText would match two elements and throw.
  const panel = container.querySelector(".checkout-pickup");
  expect(panel).not.toBeNull();
  expect(panel).toHaveTextContent("Забрать из магазина");
  expect(screen.queryByText("Адрес магазина")).not.toBeInTheDocument();
  expect(screen.queryByText("Часы работы")).not.toBeInTheDocument();
});
```

Extend the file's render helper to accept and forward props if it does not already.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/checkout/CheckoutClient.test.tsx -t "collect"`
Expected: FAIL — `shop` is not a prop, and nothing renders the address.

- [ ] **Step 4: Accept the prop and render the panel**

In `src/components/checkout/CheckoutClient.tsx`, extend the props (line 43):

```ts
type CheckoutClientProps = {
  products: readonly CatalogProduct[];
  isDemoCatalog?: boolean;
  /** The catalog outgrew the page budget, so `products` is not the whole catalog. */
  catalogTruncated?: boolean;
  /** Where to collect from; either field may be missing from site settings. */
  shop?: { address?: string; workingHours?: string };
};
```

Destructure `shop` in the component signature, then render in the collection branch created in Task 7 — each row appears only if its value exists, so an unconfigured shop shows no empty box:

```tsx
{form.fulfilment === "pickup" ? (
  <div className="checkout-fields__full checkout-pickup">
    <strong>{t("fulfilmentPickup")}</strong>
    {shop?.address ? (
      <p>
        <span>{t("pickupPoint")}</span> {shop.address}
      </p>
    ) : null}
    {shop?.workingHours ? (
      <p>
        <span>{t("pickupHours")}</span> {shop.workingHours}
      </p>
    ) : null}
  </div>
) : null}
```

- [ ] **Step 5: Pass the settings from the page**

In `src/app/(store)/[locale]/checkout/page.tsx`, the page component already has `locale`; `getPublicSiteSettings` is imported and its reader is cached, so calling it again costs nothing:

```tsx
const settings = await getPublicSiteSettings(locale);
```

Then on the `<CheckoutClient … />` element:

```tsx
shop={{ address: settings.address, workingHours: settings.workingHours }}
```

Both are optional on `PublicSiteSettings`, so no fallback is invented here — the component handles absence.

- [ ] **Step 6: Style the panel**

In `src/app/styles.css`, beside the other `checkout-` rules:

```css
.checkout-pickup {
  display: grid;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--color-line);
  border-left: 3px solid var(--color-accent);
  background: #fbf5ed;
}

.checkout-pickup p {
  margin: 0;
}

.checkout-pickup span {
  color: var(--color-muted);
}
```

This reuses the panel treatment `.product-detail__availability` already established, so the block reads as part of the same system.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/components/checkout/CheckoutClient.test.tsx`
Expected: PASS — the 2 new cases plus every case already in the file.

- [ ] **Step 8: Run every gate**

```bash
npm run test:run
npm run typecheck
npm run lint
npm run build
```

Expected: all four exit 0. Check the exit code, not the tail of the output — `npm run x | tail -3` reports `tail`'s status, so a failing gate can read as green.

- [ ] **Step 9: Commit**

```bash
git add messages/ru.json messages/uz.json messages/en.json src/app/\(store\)/\[locale\]/checkout/page.tsx src/components/checkout/CheckoutClient.tsx src/components/checkout/CheckoutClient.test.tsx src/app/styles.css
git commit -m "Tell a collecting shopper where and when to come"
```

---

## Verification after the last task

Run the dev server through the preview tooling — never `npm run dev` in a shell — and walk the checkout in one locale:

1. The two methods appear above the address, delivery preselected.
2. Choosing collection hides the address and the whole map block, and shows the shop panel.
3. The payment labels change wording while the radio values stay `cash_on_delivery` / `card_on_delivery`.
4. Placing a collected order stores `fulfilment: "pickup"`, `deliveryFee: 0` and no address.
5. The Telegram message names the method and carries no `Manzil:` row.

`npm run test:e2e` starts its own dev server and fails if one is already running; stop the preview first.
