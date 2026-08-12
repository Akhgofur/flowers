# Orderable Without a Price — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers order a product that has no price, and delete inventory tracking entirely.

**Architecture:** One domain rule replaces four: a published, in-season product is orderable. `getProductAvailability` keeps its shape but loses its `out_of_stock` and `price_missing` rules. An order line may carry no price at all — the fields are absent rather than zero — and order totals sum only the priced lines. The MongoDB reservation stops mutating stock and becomes a read; the transaction stays because it still writes the order and its notification outbox row together.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript 5.9, MongoDB/Mongoose 9, next-intl 4, Zod 4, Vitest/Testing Library, Playwright.

## Global Constraints

- Seasons remain a hard gate. An out-of-season product stays unorderable; do not touch `isSeasonActive` or `getTashkentSeason`.
- A price-less order line stores **no** `unitPrice` and **no** `lineTotal`. Never write `0` — it would claim the item is free.
- `subtotal` and `total` sum only priced lines. An order total may be less than the value of its contents.
- Do not write a data migration. Existing `stockQuantity` and `stockReleasedAt` values stay in MongoDB; the application simply stops reading them.
- `imageUrl` stays required on an order line. A product with no image remains unorderable.
- Reuse the existing `Product.priceOnRequest` copy ("Narx so'rov bo'yicha" / "Стоимость уточнит флорист" / "Price confirmed by a florist" wording already present in `messages/{ru,uz,en}.json`). Do not invent new copy keys for the price-less label.
- Every task must end with `npm run typecheck`, `npm run lint` and `npm run test:run` all passing. The tree is never left half-migrated.
- Task order matters: the `stockQuantity` field is deleted **last**, once nothing reads it.

---

### Task 1: Shrink the availability rules

**Files:**
- Modify: `src/lib/contracts.ts:40-45`
- Modify: `src/lib/product-availability.ts`
- Modify: `src/lib/product-availability.test.ts`
- Modify: `messages/ru.json`, `messages/uz.json`, `messages/en.json` (the `Product.availability` block)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ProductAvailabilityReason = "available" | "unpublished" | "out_of_season"`; `ProductAvailabilityInput = { status: ProductStatus; seasons: readonly Season[] }`; `getProductAvailability(product: ProductAvailabilityInput, now: Date): ProductAvailability` unchanged in shape.

Callers pass whole product objects (variables, not object literals), so TypeScript's excess-property check does not fire and every existing call site keeps compiling.

- [ ] **Step 1: Write the failing tests**

In `src/lib/product-availability.test.ts`, replace the `out_of_stock` and `price_missing` cases with:

```ts
const summer = new Date("2026-08-12T09:00:00+05:00");

it("treats a product without a price as orderable", () => {
  expect(
    getProductAvailability({ status: "published", seasons: ["all_year"] }, summer)
  ).toEqual({ available: true, currentSeason: "summer", reason: "available" });
});

it("ignores inventory entirely", () => {
  // Still carries a zero stock, which used to block it outright.
  const soldOut = {
    status: "published",
    seasons: ["summer"],
    stockQuantity: 0,
  } as ProductAvailabilityInput;

  expect(getProductAvailability(soldOut, summer)).toEqual({
    available: true,
    currentSeason: "summer",
    reason: "available",
  });
});

it("still refuses an out-of-season product", () => {
  expect(
    getProductAvailability({ status: "published", seasons: ["winter"] }, summer).reason
  ).toBe("out_of_season");
});

it("still refuses an unpublished product", () => {
  expect(
    getProductAvailability({ status: "draft", seasons: ["all_year"] }, summer).reason
  ).toBe("unpublished");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/product-availability.test.ts`
Expected: FAIL — the first case still returns `reason: "price_missing"`.

- [ ] **Step 3: Narrow the reason union**

In `src/lib/contracts.ts`, replace lines 40-45 with:

```ts
export type ProductAvailabilityReason =
  | "available"
  | "unpublished"
  | "out_of_season";
```

- [ ] **Step 4: Shrink the domain function**

Replace the body of `src/lib/product-availability.ts` from `export type ProductAvailabilityInput` and `getProductAvailability` with:

```ts
export type ProductAvailabilityInput = {
  status: ProductStatus;
  seasons: readonly Season[];
};

export function getProductAvailability(
  product: ProductAvailabilityInput,
  now: Date
): ProductAvailability {
  const currentSeason = getTashkentSeason(now);

  if (product.status !== "published") {
    return { available: false, currentSeason, reason: "unpublished" };
  }
  if (!isSeasonActive(product.seasons, now)) {
    return { available: false, currentSeason, reason: "out_of_season" };
  }

  return { available: true, currentSeason, reason: "available" };
}
```

Leave `getTashkentSeason` and `isSeasonActive` untouched.

- [ ] **Step 5: Delete the unused copy**

Remove the `out_of_stock` and `price_missing` entries from the `Product.availability` object in all three of `messages/ru.json`, `messages/uz.json`, `messages/en.json`. Keep `available`, `out_of_season` and `unpublished`.

- [ ] **Step 5b: Delete the checkout tests this rule change obsoletes**

Three tests in `src/components/checkout/CheckoutClient.test.tsx` assert the gating that Step 4 just removed, so they now fail by design. A test belongs to the rule it describes; delete these three with the rule:

- `"posts only the lines it can price, ignoring stale cart entries"`
- `"does not post a line that is out of stock"` (one of the two `it.each` cases — keep the `"out of season"` case, which still passes and must keep passing)
- `"drops unpriceable lines from browser storage so the cart count stays honest"`

If the `it.each` block is left with a single case, collapse it into a plain `it(...)` for the out-of-season case. Change nothing in `CheckoutClient.tsx` — the source belongs to Task 4.

Do not delete `"caps a line at the stock the catalog reports"`; it still passes because `cappedQuantity` is untouched, and Task 4 removes it along with that helper.

- [ ] **Step 6: Run the gates**

Run: `npx vitest run src/lib/product-availability.test.ts && npm run typecheck && npm run lint`
Expected: tests PASS, typecheck clean, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/contracts.ts src/lib/product-availability.ts src/lib/product-availability.test.ts messages
git commit -m "Let price and stock stop gating product availability"
```

---

### Task 2: Let an order line carry no price

**Files:**
- Modify: `src/lib/contracts.ts` (`OrderItemSnapshot`)
- Modify: `src/models/Order.ts:64,74` (`unitPrice`, `lineTotal`)
- Modify: `src/lib/services/order-service.ts` (`ReservedProduct`, the item-building loop near line 486-506)
- Modify: `src/lib/services/order-service.test.ts`

**Interfaces:**
- Consumes: Task 1's `getProductAvailability`.
- Produces: `OrderItemSnapshot.unitPrice?: number` and `.lineTotal?: number`; `ReservedProduct.price?: number`. A line with no price omits both keys.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/services/order-service.test.ts`, inside `describe("transactional order service", ...)`:

```ts
it("accepts a line with no price and counts only priced lines in the total", async () => {
  const store = new InMemoryOrderStore();
  const priceless = product(tulipId, "Narxsiz buket", 0, 5);
  priceless.price = undefined as unknown as number;
  store.products.set(tulipId, priceless);

  const result = await makeService(store).createPendingOrder(checkoutInput);
  const order = store.orders.get(result.orderId);

  expect(order?.items).toEqual([
    expect.objectContaining({ productId: redRoseId, unitPrice: 150_000, lineTotal: 300_000 }),
    expect.objectContaining({ productId: tulipId, quantity: 1 }),
  ]);
  expect(order?.items[1]).not.toHaveProperty("unitPrice");
  expect(order?.items[1]).not.toHaveProperty("lineTotal");
  expect(order?.subtotal).toBe(300_000);
  expect(order?.total).toBe(320_000);
});
```

Then relax `InMemoryOrderStore.reserveProduct` so it no longer rejects a missing price: delete the `!Number.isSafeInteger(record.price) || record.price <= 0 ||` clause from its guard.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/services/order-service.test.ts -t "no price"`
Expected: FAIL — the service still throws `ProductUnavailableError`, or writes `unitPrice: NaN`.

- [ ] **Step 3: Make the contract fields optional**

In `src/lib/contracts.ts`, change `OrderItemSnapshot` so both money fields are optional:

```ts
  unitPrice?: number;
  lineTotal?: number;
```

In `src/models/Order.ts`, change the two money fields on `orderItemSchema` to be optional by spreading the shared definition with `required: false`:

```ts
    unitPrice: { ...integerMoneyField, required: false },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "Quantity must be an integer between 1 and 99.",
      },
    },
    lineTotal: { ...integerMoneyField, required: false },
```

- [ ] **Step 4: Let the reservation return a price-less product**

In `src/lib/services/order-service.ts`, change `ReservedProduct.price` to `price?: number`, and delete the guard that throws when a reserved product has no price:

```ts
      if (!document) return null;
```

(that is, remove the `if (document.price === undefined) { throw new Error("Reserved product is missing a price."); }` block).

- [ ] **Step 5: Build the line without inventing a price**

Replace the line-total block in the item loop with:

```ts
              const lineTotal =
                product.price === undefined
                  ? undefined
                  : ensureMoney(product.price * item.quantity, "Line total");
              if (lineTotal !== undefined) {
                subtotal = ensureMoney(subtotal + lineTotal, "Subtotal");
              }
              items.push({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                imageUrl: image.url,
                quantity: item.quantity,
                ...(product.price === undefined || lineTotal === undefined
                  ? {}
                  : { unitPrice: product.price, lineTotal }),
              });
```

- [ ] **Step 6: Run the gates**

Run: `npx vitest run src/lib/services/order-service.test.ts && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/contracts.ts src/models/Order.ts src/lib/services/order-service.ts src/lib/services/order-service.test.ts
git commit -m "Store no price on an order line the shop has not priced"
```

---

### Task 3: Take stock out of the order transaction

**Files:**
- Modify: `src/lib/services/order-service.ts` (`OrderStore`, `reserveProduct`, `claimStockRelease`, `restoreProductStock`, the cancellation branch near line 571-591, `StoredOrder`)
- Modify: `src/models/Order.ts` (`stockReleasedAt`)
- Modify: `src/lib/contracts.ts` (`AdminOrder.stockReleasedAt` if present)
- Modify: `src/lib/services/order-service.test.ts`

**Interfaces:**
- Consumes: Task 2's optional-price `ReservedProduct`.
- Produces: an `OrderStore` without `claimStockRelease` and `restoreProductStock`; `reserveProduct(productId, quantity, locale, currentSeason, transaction)` keeps its signature but performs a read.

`quantity` stays in the signature even though the read ignores it: it keeps the store interface stable for the in-memory test double and reads naturally at the call site.

- [ ] **Step 1: Write the failing test**

In `src/lib/services/order-service.test.ts`, replace the cancellation test's stock assertions with:

```ts
it("cancels an order without touching any product record", async () => {
  const store = new InMemoryOrderStore();
  const service = makeService(store);
  const created = await service.createPendingOrder(checkoutInput);
  const before = new Map(
    [...store.products].map(([id, value]) => [id, { ...value }])
  );

  await service.transitionOrderStatus(created.orderId, "confirmed");
  await expect(
    service.transitionOrderStatus(created.orderId, "cancelled")
  ).resolves.toMatchObject({ status: "cancelled" });

  expect([...store.products]).toEqual([...before]);
});
```

Delete `claimStockRelease` and `restoreProductStock` from `InMemoryOrderStore`, and delete its `stockQuantity` mutation inside `reserveProduct`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/services/order-service.test.ts -t "without touching"`
Expected: FAIL — `dependencies.store.claimStockRelease is not a function`.

- [ ] **Step 3: Turn the reservation into a read**

In `src/lib/services/order-service.ts`, replace the `findOneAndUpdate` call in `reserveProduct` with a plain read that keeps the same projection:

```ts
      const document = (await ProductModel.findOne({
        _id: productId,
        status: "published",
        $or: [
          { seasons: "all_year" },
          { seasons: currentSeason },
          { seasons: { $exists: false } },
          { seasons: { $size: 0 } },
        ],
      })
        .select(RESERVED_PRODUCT_PROJECTION)
        .session(asClientSession(transaction))
        .lean()
        .exec()) as unknown as ProductRecord | null;
```

Keep `RESERVED_PRODUCT_PROJECTION` and its regression test exactly as they are — the projection must still satisfy `resolveProductTranslation`.

- [ ] **Step 4: Delete the release machinery**

Remove `claimStockRelease` and `restoreProductStock` from the `OrderStore` type and from `createMongoOrderStore`. Replace the cancellation branch inside `transitionOrderStatus` with:

```ts
        if (!updated) throw new OrderStateConflictError();

        return updated;
```

Remove `stockReleasedAt` from `StoredOrder`, from the document mapper near line 241, from `src/models/Order.ts`, and from `AdminOrder` in `src/lib/contracts.ts` if it appears there.

- [ ] **Step 5: Run the gates**

Run: `npm run test:run && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/order-service.ts src/lib/services/order-service.test.ts src/models/Order.ts src/lib/contracts.ts
git commit -m "Stop reserving and restoring stock when an order moves"
```

---

### Task 4: Show and submit price-less lines in the storefront

**Files:**
- Modify: `src/features/cart/CartDrawer.tsx`
- Modify: `src/features/cart/CartDrawer.test.tsx`
- Modify: `src/components/checkout/CheckoutClient.tsx`
- Modify: `src/components/checkout/CheckoutClient.test.tsx`
- Modify: `src/components/storefront/ProductDetail.test.tsx`

**Interfaces:**
- Consumes: Task 1's `getProductAvailability`.
- Produces: no new exports. `isPricedProduct` and `cappedQuantity` are deleted from `CheckoutClient`; `isOrderable(product, now)` becomes the availability check alone.

`ProductDetail` needs no source change: it already gates on `availability.available`, which Task 1 made true for price-less products, and it already renders `t("priceOnRequest")` when `product.price` is undefined.

- [ ] **Step 1: Write the failing tests**

In `src/features/cart/CartDrawer.test.tsx`, replace the "omits cart lines whose product has no price" test with:

```ts
it("keeps a price-less line and labels it instead of a sum", () => {
  renderDrawer({
    lines: [
      { productId: "roses", quantity: 1 },
      { productId: "on-request", quantity: 1 },
    ] as CartLine[],
  });

  expect(screen.getByRole("heading", { name: "Qirmizi atirgul" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Narxsiz buket" })).toBeVisible();
  expect(screen.getAllByText("Narx so‘rov bo‘yicha").length).toBeGreaterThan(0);
});
```

In `src/components/checkout/CheckoutClient.test.tsx`, delete the `"caps a line at the stock the catalog reports"` test — Step 4 of this task removes the `cappedQuantity` helper it covers. Task 1 already removed the three tests that asserted price and stock gating; the out-of-season case stays and must keep passing. Then add:

```ts
it("submits a price-less line and shows it without a sum", async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify([
      { productId: products[0]?.id, quantity: 2 },
      { productId: products[1]?.id, quantity: 1 },
    ])
  );

  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        order: {
          orderId: "507f191e810c19729de860ea",
          orderNumber: "FL-20260812-ORDER1234",
          total: 300_000,
          status: "pending",
        },
      }),
      { status: 201, headers: { "content-type": "application/json" } }
    )
  );
  vi.stubGlobal("fetch", fetchMock);

  render(<CheckoutClient products={products} />, { locale: "uz" });

  await screen.findByText(/gul savati №79/i);
  await user.type(screen.getByLabelText(/ism va familiya/i), "Ali Valiyev");
  await user.type(screen.getByLabelText(/telefon raqami/i), "+998901234567");
  await user.type(
    screen.getByLabelText(/yetkazib berish manzili/i),
    "Toshkent shahri, Chilonzor tumani"
  );
  await user.click(screen.getByRole("button", { name: /buyurtmani tasdiqlash/i }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  const [, request] = fetchMock.mock.calls[0] ?? [];
  const body = JSON.parse(String((request as RequestInit).body)) as {
    items: Array<{ productId: string; quantity: number }>;
  };
  expect(body.items).toEqual([
    { productId: products[0]?.id, quantity: 2 },
    { productId: products[1]?.id, quantity: 1 },
  ]);
});
```

In `src/components/storefront/ProductDetail.test.tsx`, add a case using the file's existing top-level `product` fixture and its `locale: "en"` convention. `ProductDetail` reads the cart through `useOptionalStorefront`, so it renders standalone without a provider:

```tsx
it("offers add-to-cart for a product with no price", () => {
  render(<ProductDetail product={{ ...product, price: undefined }} />, {
    locale: "en",
  });

  expect(screen.getByText("Price on request")).toBeVisible();
  expect(screen.getByRole("button", { name: "Add to cart" })).toBeVisible();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/cart src/components/checkout src/components/storefront/ProductDetail.test.tsx`
Expected: FAIL — price-less lines are filtered out of both the drawer and the checkout payload.

- [ ] **Step 3: Render price-less lines in the cart drawer**

In `src/features/cart/CartDrawer.tsx`, delete `isPricedProduct` and keep every line whose product exists:

```ts
  const items = useMemo(() => {
    const productsById = new Map(products.map((product) => [product.id, product]));

    return lines.flatMap((line) => {
      const product = productsById.get(line.productId);
      return product ? [{ line, product }] : [];
    });
  }, [lines, products]);

  const total = items.reduce(
    (sum, { line, product }) => sum + (product.price ?? 0) * line.quantity,
    0
  );
```

Add `const tProduct = useTranslations("Product");` beside the existing `t`, and render the two money spots conditionally:

```ts
                    <p>
                      {product.price === undefined
                        ? tProduct("priceOnRequest")
                        : `${formatSum(product.price, locale)} / ${t("each")}`}
                    </p>
```

```ts
                      <strong>
                        {product.price === undefined
                          ? tProduct("priceOnRequest")
                          : formatSum(product.price * line.quantity, locale)}
                      </strong>
```

- [ ] **Step 4: Stop gating the checkout on price and stock**

In `src/components/checkout/CheckoutClient.tsx`:

Delete `cappedQuantity` entirely, and replace `isPricedProduct` with:

```ts
/**
 * Mirrors the server: a published, in-season product is orderable. Price is not a
 * gate — an unpriced line is ordered and the operator agrees the price by phone.
 */
function isOrderable(product: CatalogProduct | undefined, now: Date): product is CatalogProduct {
  return product !== undefined && getProductAvailability(product, now).available;
}
```

Simplify the hydration effect and the items memo, dropping every quantity cap:

```ts
  useEffect(() => {
    // Browser-only cart storage must be read after SSR hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(readCart(orderableIds));
    setIsHydrated(true);
  }, [orderableIds]);
```

```ts
  const items = useMemo(
    () =>
      lines.flatMap((line) => {
        const product = productsById.get(line.productId);
        return isOrderable(product, now) ? [{ line, product }] : [];
      }),
    [lines, now, productsById]
  );
  const subtotal = items.reduce(
    (sum, { line, product }) => sum + (product.price ?? 0) * line.quantity,
    0
  );
```

Restore `updateQuantity` to its uncapped form:

```ts
  const updateQuantity = (productId: string, quantity: number) => {
    setLines((current) => setCartQuantity(current, productId, quantity));
    setError(null);
  };
```

Render the summary line price with `tProduct("priceOnRequest")` when `product.price` is undefined, exactly as in Step 3.

- [ ] **Step 5: Run the gates**

Run: `npm run test:run && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/cart src/components/checkout src/components/storefront/ProductDetail.test.tsx
git commit -m "Let a shopper cart and order a product with no price"
```

---

### Task 5: Label price-less lines for the operator and drop the stock UI

**Files:**
- Modify: `src/lib/services/order-notification-service.ts` (`formatNewOrderNotification`)
- Modify: `src/lib/services/order-notification-service.test.ts`
- Modify: `src/lib/repositories/order-notification-repository.ts` (item mapping)
- Modify: `src/components/admin/AdminOrdersPanel.tsx`
- Modify: `src/components/admin/AdminOrdersPanel.test.tsx`
- Modify: `src/components/admin/AdminProductsPanel.tsx:300,366,552,703,740`
- Modify: `src/components/admin/AdminProductsPanel.test.tsx`
- Modify: `src/app/admin/(dashboard)/page.tsx:17-19`

**Interfaces:**
- Consumes: Task 2's optional `unitPrice`/`lineTotal`.
- Produces: `NewOrderNotificationItem.lineTotal?: number`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/services/order-notification-service.test.ts`:

```ts
it("labels a line the shop has not priced", () => {
  const text = formatNewOrderNotification({
    ...order,
    items: [
      {
        name: "Авторский букет №1",
        quantity: 1,
        imageUrl: "https://res.cloudinary.com/demo/bouquet.png",
      },
    ],
  });

  expect(text).toContain("Авторский букет №1 × 1 — narx so‘rov bo‘yicha");
});
```

In `src/components/admin/AdminOrdersPanel.test.tsx`:

```ts
it("marks an order line the shop has not priced", () => {
  const priceless: AdminOrder = {
    ...order,
    items: [{ ...order.items[0]!, unitPrice: undefined, lineTotal: undefined }],
  };

  render(<AdminOrdersPanel initialOrders={[priceless]} />);

  expect(screen.getByText(/narx so‘rov bo‘yicha/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/services/order-notification-service.test.ts src/components/admin/AdminOrdersPanel.test.tsx`
Expected: FAIL — both render an empty or `NaN` sum.

- [ ] **Step 3: Label the line in the operator message**

In `src/lib/services/order-notification-service.ts`, make `lineTotal` optional on `NewOrderNotificationItem` and render it conditionally:

```ts
        ...order.items.map(
          (item, index) =>
            `${index + 1}. ${item.name} × ${item.quantity} — ${
              item.lineTotal === undefined
                ? "narx so‘rov bo‘yicha"
                : formatSum(item.lineTotal, "uz")
            }`
        ),
```

In `src/lib/repositories/order-notification-repository.ts`, map the field through only when present:

```ts
    items: document.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
      ...(item.lineTotal === undefined ? {} : { lineTotal: item.lineTotal }),
    })),
```

- [ ] **Step 4: Label the line in the admin fulfilment list**

In `src/components/admin/AdminOrdersPanel.tsx`, extend the order line to show the price state beside the name:

```tsx
                    <span>{item.quantity}× {item.name}{item.lineTotal === undefined ? " · Narx so‘rov bo‘yicha" : ""}</span>
```

- [ ] **Step 5: Remove the stock field from the admin product editor**

In `src/components/admin/AdminProductsPanel.tsx`, delete: the `stockQuantity` parse at line 300, the one at line 366, the `<label><span>Qoldiq</span>…</label>` block at line 552, the `<th>Qoldiq</th>` header at line 703, and the `<td data-label="Qoldiq">…</td>` cell at line 740. Remove `stockQuantity` from the draft/row state shapes and from any payload the panel posts. Update `AdminProductsPanel.test.tsx` fixtures and assertions accordingly.

- [ ] **Step 6: Replace the dashboard metric**

In `src/app/admin/(dashboard)/page.tsx`, replace the low-stock computation at lines 17-19 with:

```tsx
  const unpricedProducts = products.filter(
    (product) => product.status === "published" && product.price === undefined
  ).length;
```

Rename the card label to `Narxsiz mahsulotlar` and render `unpricedProducts`. Leave every other metric alone.

- [ ] **Step 7: Run the gates**

Run: `npm run test:run && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/services/order-notification-service.ts src/lib/services/order-notification-service.test.ts src/lib/repositories/order-notification-repository.ts src/components/admin "src/app/admin/(dashboard)/page.tsx"
git commit -m "Say which order lines still need a price, and retire the stock UI"
```

---

### Task 6: Delete the stockQuantity field

**Files:**
- Modify: `src/models/Product.ts:23,167-176`
- Modify: `src/lib/contracts.ts:106,191`
- Modify: `src/lib/validations.ts:193,242`
- Modify: `src/lib/repositories/catalog-repository.ts:82`
- Modify: `src/lib/repositories/admin-repository.ts:61,247,279`
- Modify: `src/components/storefront/storefront-mappers.ts:86`
- Modify: `scripts/seed-catalog.ts`, `scripts/import-studio-catalog.ts`
- Modify: every remaining test fixture that sets `stockQuantity`

**Interfaces:**
- Consumes: Tasks 1-5 — by this point nothing reads the field.
- Produces: `CatalogProduct` and `AdminProduct` without `stockQuantity`.

- [ ] **Step 1: Write the failing test**

In `src/models/models.test.ts`, assert the field is gone:

```ts
it("no longer tracks inventory on a product", () => {
  expect(ProductModel.schema.path("stockQuantity")).toBeUndefined();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/models/models.test.ts -t "inventory"`
Expected: FAIL — the schema path still exists.

- [ ] **Step 3: Remove the field everywhere**

Delete `stockQuantity` from the `ProductDocument` type and the schema block in `src/models/Product.ts`; from `CatalogProduct` and `AdminProduct` in `src/lib/contracts.ts`; from both Zod schemas in `src/lib/validations.ts`; from the mappers in `catalog-repository.ts:82`, `admin-repository.ts:61` and `storefront-mappers.ts:86`; from the patch builder at `admin-repository.ts:247`; and from the archive update at `admin-repository.ts:279`, which becomes:

```ts
    { $set: { status: "archived" } }
```

Remove the field from both seed scripts and from every remaining test fixture.

- [ ] **Step 4: Find any stragglers**

Run: `grep -rn "stockQuantity\|stockReleasedAt\|out_of_stock\|price_missing" src scripts messages`
Expected: no matches.

- [ ] **Step 5: Run the full gates**

Run: `npm run test:run && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
Expected: all PASS. Stop any dev server first — the e2e suite starts its own on port 41757.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Remove inventory tracking from the product"
```

---

## Verification

After Task 6, confirm against a real product before calling this done:

- [ ] A published product with no price shows "price on request" and an add-to-cart button on its detail page.
- [ ] That product reaches checkout, submits, and creates an order.
- [ ] The Telegram message lists it as `— narx so'rov bo'yicha` and the order total counts only the priced lines.
- [ ] The admin orders page marks the line, and the admin product form no longer offers a stock field.
- [ ] An out-of-season product is still refused.
