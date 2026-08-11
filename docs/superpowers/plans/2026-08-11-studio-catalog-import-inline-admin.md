# Studio Catalog Import and Inline Admin Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import visually grouped studio flower images as production products with price-on-request support and add safe partial inline editing to the admin product list.

**Architecture:** Products have an optional UZS price. The server treats absent price as inquiry-only and preserves purchase semantics for all priced products. A deterministic import manifest maps every local studio image to a Cloudinary-backed grouped product, while the admin client calculates a whitelisted partial patch against an immutable row snapshot.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Zod 4, Mongoose 9, Cloudinary 2, Vitest, Testing Library, Playwright.

## Global Constraints

- Keep `CLOUDINARY_API_SECRET`, MongoDB credentials, and all `.env*` values out of commits, API responses, logs, and test snapshots.
- Preserve existing priced product/cart/checkout behavior exactly.
- Use `price: undefined` for inquiry-only products; do not use 0 or 1 as a sentinel.
- All product image URLs remain HTTPS and galleries contain 1–8 images.
- Keep Next.js admin mutations in Node.js route handlers and retain `requireAdmin` plus `assertSameOrigin` checks.
- Use a strict PATCH schema; never validate partial input with the full product-create schema.
- Inline edit has no modal or detail route and sends only changed whitelisted fields.
- Every implementation step follows RED → GREEN → refactor and runs its focused test before the next step.

---

### Task 1: Model optional price and inquiry-only purchase boundary

**Files:**
- Modify: `src/lib/contracts.ts`
- Modify: `src/models/Product.ts`
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/repositories/catalog-repository.ts`
- Modify: `src/lib/services/catalog-service.ts`
- Modify: `src/lib/services/order-service.ts`
- Modify: `src/lib/seo.ts`
- Test: `src/lib/validations.test.ts`
- Test: `src/models/models.test.ts`
- Test: `src/lib/services/order-service.test.ts`
- Test: `src/lib/seo.test.ts`

**Interfaces:**
- Produces: `CatalogProduct.price?: number`, `AdminProduct.price?: number`, `ProductInput.price?: number`, and a complete `ProductPatchInput` for Task 3.
- Produces: order service rejection for a product whose persisted `price` is missing.
- Consumes: existing `ProductModel`, `productInputSchema`, catalog mappings, and checkout order creation service.

- [ ] **Step 1: Write the failing model, schema, order, and SEO tests**

```ts
it("accepts a published inquiry-only product without a price", () => {
  expect(productInputSchema.safeParse({ ...validProduct, price: undefined })).toMatchObject({ success: true });
});

it("rejects a sale flag when an inquiry-only product has no price", () => {
  expect(productInputSchema.safeParse({ ...validProduct, price: undefined, isOnSale: true })).toMatchObject({ success: false });
});

it("refuses checkout when the database product has no price", async () => {
  await expect(createOrder(validCheckoutForUnpricedProduct)).rejects.toThrow(/narx/i);
});

it("does not emit an Offer price for an inquiry-only product", () => {
  expect(productJsonLd({ ...catalogProduct, price: undefined })).not.toHaveProperty("offers.price");
});
```

- [ ] **Step 2: Run the focused tests and verify expected RED failures**

Run: `npm run test:run -- src/lib/validations.test.ts src/models/models.test.ts src/lib/services/order-service.test.ts src/lib/seo.test.ts`

Expected: failures show that price is mandatory or that purchase/SEO assumes a numeric price.

- [ ] **Step 3: Implement the smallest optional-price contract**

```ts
const optionalMoneySchema = z.number().int().positive().optional();

export const productInputSchema = z.object({
  // existing required fields
  price: optionalMoneySchema,
  originalPrice: optionalMoneySchema,
  isOnSale: z.boolean().default(false),
}).superRefine((input, context) => {
  if (input.price === undefined && (input.originalPrice !== undefined || input.isOnSale)) {
    context.addIssue({ code: "custom", path: ["price"], message: "Inquiry-only products cannot have sale pricing." });
  }
});
```

Update `ProductDocument`, Mongoose `price`, public/admin DTO mappings, schema.org generation, filter logic, and `order-service` so unpriced products are excluded/rejected before totals or stock mutations.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm run test:run -- src/lib/validations.test.ts src/models/models.test.ts src/lib/services/order-service.test.ts src/lib/seo.test.ts`

Expected: PASS.

- [ ] **Step 5: Refactor shared inquiry predicates and commit**

Extract one `hasPurchasablePrice(product)` predicate only if at least two call sites need identical null checks. Re-run the focused tests, then commit:

```bash
git add src/lib/contracts.ts src/models/Product.ts src/lib/validations.ts src/lib/repositories/catalog-repository.ts src/lib/services/catalog-service.ts src/lib/services/order-service.ts src/lib/seo.ts src/lib/validations.test.ts src/models/models.test.ts src/lib/services/order-service.test.ts src/lib/seo.test.ts
git commit -m "feat: support inquiry-only catalog products"
```

### Task 2: Render inquiry-only catalog products without cart access

**Files:**
- Modify: `src/features/catalog/CatalogGrid.tsx`
- Modify: `src/features/product/ProductQuickView.tsx`
- Modify: `src/components/storefront/ProductDetail.tsx`
- Modify: `src/features/cart/cart-reducer.ts`
- Modify: `src/features/cart/CartDrawer.tsx`
- Modify: `src/components/checkout/CheckoutClient.tsx`
- Modify: `src/i18n/messages/*.json`
- Test: `src/features/catalog/catalog-utils.test.ts`
- Test: `src/features/cart/cart-reducer.test.ts`
- Test: `src/components/storefront/StorefrontClient.test.tsx`
- Test: `src/components/checkout/CheckoutClient.test.tsx`

**Interfaces:**
- Consumes: optional `CatalogProduct.price` from Task 1.
- Produces: localized `priceOnRequest` copy and no add-to-cart affordance for any unpriced item.
- Produces: cart reducer refusal to add inquiry-only products even when invoked outside visible UI.

- [ ] **Step 1: Write failing storefront and reducer tests**

```tsx
it("renders price-on-request and no cart button for an unpriced catalog product", () => {
  render(<CatalogGrid products={[{ ...product, price: undefined }]} locale="ru" />);
  expect(screen.getByText(/цен[ау] по запросу/i)).toBeVisible();
  expect(screen.queryByRole("button", { name: /cart|savat|корзин/i })).not.toBeInTheDocument();
});

it("does not add an inquiry-only item to cart state", () => {
  expect(cartReducer(emptyCart, addItem({ ...product, price: undefined }))).toEqual(emptyCart);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm run test:run -- src/features/catalog/catalog-utils.test.ts src/features/cart/cart-reducer.test.ts src/components/storefront/StorefrontClient.test.tsx src/components/checkout/CheckoutClient.test.tsx`

Expected: existing components attempt to format/add a missing price.

- [ ] **Step 3: Implement localised inquiry presentation**

```tsx
const purchasable = product.price !== undefined;
return purchasable ? (
  <><strong>{formatSum(product.price, locale)}</strong><AddToCartButton product={product} /></>
) : (
  <a href="#contact" className="product-card__inquiry">{t("priceOnRequest")}</a>
);
```

Apply the same purchase guard in quick view, detail, cart, checkout, and price filtering. Ensure each message catalog has `priceOnRequest` and a clear contact CTA in RU/UZ/EN.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm run test:run -- src/features/catalog/catalog-utils.test.ts src/features/cart/cart-reducer.test.ts src/components/storefront/StorefrontClient.test.tsx src/components/checkout/CheckoutClient.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run browser-responsive QA and commit**

Verify one priced and one unpriced product at 1440 px and 375 px: clear price vs inquiry copy, correct CTA, keyboard focus, and no cart entry for the unpriced product. Then commit:

```bash
git add src/features/catalog/CatalogGrid.tsx src/features/product/ProductQuickView.tsx src/components/storefront/ProductDetail.tsx src/features/cart/cart-reducer.ts src/features/cart/CartDrawer.tsx src/components/checkout/CheckoutClient.tsx src/i18n/messages src/features/catalog/catalog-utils.test.ts src/features/cart/cart-reducer.test.ts src/components/storefront/StorefrontClient.test.tsx src/components/checkout/CheckoutClient.test.tsx
git commit -m "feat: render price-on-request products"
```

### Task 3: Add strict partial PATCH and modal-free inline admin editing

**Files:**
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/repositories/admin-repository.ts`
- Modify: `src/lib/services/admin-service.ts`
- Modify: `src/app/api/admin/products/[id]/route.ts`
- Modify: `src/components/admin/AdminProductsPanel.tsx`
- Modify: `src/app/admin/admin.css` or the existing stylesheet that defines `.admin-table`
- Test: `src/lib/validations.test.ts`
- Test: `src/lib/repositories/update-fields.test.ts`
- Test: `src/app/api/admin/products/[id]/route.test.ts`
- Test: `src/components/admin/AdminProductsPanel.test.tsx`

**Interfaces:**
- Produces: `productPatchInputSchema` containing exactly `translations.ru.name`, `categoryId`, `price`, `stockQuantity`, `sortOrder`, `status`, `isFeatured`, and `isNew`.
- Produces: `editAdminProduct(id, patch: ProductPatchInput)` that updates only supplied fields and invalidates the public catalog cache.
- Consumes: Task 1 optional price semantics.

- [ ] **Step 1: Write failing partial validation, API, and UI tests**

```ts
it("accepts a patch containing only price", () => {
  expect(productPatchInputSchema.safeParse({ price: 450_000 })).toMatchObject({ success: true });
});

it("rejects an empty patch and an unknown patch key", () => {
  expect(productPatchInputSchema.safeParse({}).success).toBe(false);
  expect(productPatchInputSchema.safeParse({ price: 1, images: [] }).success).toBe(false);
});

it("forwards only changed fields from an inline row save", async () => {
  render(<AdminProductsPanel initialProducts={[product]} categories={[category]} />);
  await user.click(screen.getByRole("button", { name: /tahrirlash|edit/i }));
  await user.clear(screen.getByLabelText(/narx/i));
  await user.type(screen.getByLabelText(/narx/i), "450000");
  await user.click(screen.getByRole("button", { name: /saqlash|save/i }));
  expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: JSON.stringify({ price: 450000 }) }));
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm run test:run -- src/lib/validations.test.ts src/lib/repositories/update-fields.test.ts src/app/api/admin/products/[id]/route.test.ts src/components/admin/AdminProductsPanel.test.tsx`

Expected: existing PATCH requires a full product and existing panel opens the modal-style editor.

- [ ] **Step 3: Implement server-only partial updates**

```ts
export const productPatchInputSchema = z.object({
  translations: z.object({ ru: z.object({ name: textSchema.max(140) }).strict() }).strict().optional(),
  categoryId: objectIdSchema.optional(),
  price: z.number().int().positive().nullable().optional(),
  stockQuantity: nonNegativeIntegerSchema.optional(),
  sortOrder: nonNegativeIntegerSchema.optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
}).strict().refine((patch) => Object.keys(patch).length > 0, "At least one field is required");
```

Map `price: null` to `$unset: { price: 1, originalPrice: 1 }` and `$set: { isOnSale: false }`; otherwise construct `$set` only from supplied fields. The route must parse this patch schema, retain auth/origin/id checks, and return the updated admin DTO.

- [ ] **Step 4: Implement one-row edit state and diff serialization**

```ts
const [editing, setEditing] = useState<{ id: string; original: QuickRowDraft; draft: QuickRowDraft } | null>(null);
const patch = diffQuickRow(editing.original, editing.draft);
if (Object.keys(patch).length === 0) return cancelEdit();
await fetch(`/api/admin/products/${editing.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
```

Replace the current form-opening edit action with inputs/selects in the matching `<tr>`. Keep Add Product as its existing full form. Add labeled Save and Cancel controls only while a row is active, a pending state, and a row-local `role="alert"` failure. Add CSS that preserves horizontal scrolling and 44 px controls on mobile.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm run test:run -- src/lib/validations.test.ts src/lib/repositories/update-fields.test.ts src/app/api/admin/products/[id]/route.test.ts src/components/admin/AdminProductsPanel.test.tsx`

Expected: PASS, including no fetch for Cancel and unchanged Save.

- [ ] **Step 6: Refactor, browser QA, and commit**

Verify desktop/tablet/mobile admin list: only one row enters edit mode; focus moves to the first input; category/status/select controls work; price can be cleared; Cancel produces no request; save response updates the row without a modal or route change. Then commit:

```bash
git add src/lib/validations.ts src/lib/repositories/admin-repository.ts src/lib/services/admin-service.ts src/app/api/admin/products/[id]/route.ts src/components/admin/AdminProductsPanel.tsx src/app/admin src/lib/validations.test.ts src/lib/repositories/update-fields.test.ts src/app/api/admin/products/[id]/route.test.ts src/components/admin/AdminProductsPanel.test.tsx
git commit -m "feat: add inline product quick editing"
```

### Task 4: Build deterministic studio manifest and import into Cloudinary/Atlas

**Files:**
- Create: `scripts/studio-catalog-manifest.ts`
- Create: `scripts/import-studio-catalog.ts`
- Create: `scripts/studio-catalog-manifest.test.ts`
- Modify: `src/lib/env.ts`
- Modify: `src/lib/services/image-upload-service.ts`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Produces: `StudioProductGroup` with `slug`, localized content, category slug, 1–8 local image paths, flower types, colors, stock, and `price: undefined`.
- Produces: `npm run import:studio-catalog`, an idempotent Node.js script with a non-secret summary.
- Consumes: optional-price product schema (Task 1), category repository/model, Cloudinary credentials, and Atlas `MONGODB_URI`.

- [ ] **Step 1: Write failing manifest integrity tests**

```ts
it("covers each discovered studio image exactly once", () => {
  expect(findUnassignedImages(STUDIO_IMAGE_ROOT, STUDIO_PRODUCT_GROUPS)).toEqual([]);
  expect(findDuplicateImageAssignments(STUDIO_PRODUCT_GROUPS)).toEqual([]);
});

it("limits every bouquet gallery to between one and eight images", () => {
  expect(STUDIO_PRODUCT_GROUPS.every((group) => group.sourceImages.length >= 1 && group.sourceImages.length <= 8)).toBe(true);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:run -- scripts/studio-catalog-manifest.test.ts`

Expected: FAIL because no manifest exists.

- [ ] **Step 3: Create reviewed groups and a safe idempotent importer**

```ts
for (const group of STUDIO_PRODUCT_GROUPS) {
  const images = await Promise.all(group.sourceImages.map((path, index) => uploadLocalStudioImage(path, group.translations.ru.name, index)));
  await ProductModel.findOneAndUpdate(
    { slug: group.slug },
    { $set: { ...group, images, price: undefined, originalPrice: undefined, isOnSale: false } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}
```

Use a generated contact sheet or direct visual review to define groups; never infer grouping from filenames alone. Check required Cloudinary/MongoDB configuration before connecting. Add the localized `baskets` category with upsert semantics. Make upload reuse a deterministic public id from the source hash so reruns do not duplicate Cloudinary assets.

- [ ] **Step 4: Run the focused manifest test and verify GREEN**

Run: `npm run test:run -- scripts/studio-catalog-manifest.test.ts`

Expected: PASS with every valid image assigned exactly once.

- [ ] **Step 5: Execute a dry report, perform Atlas import, and verify**

Run: `npm run import:studio-catalog -- --dry-run`

Expected: source count, product-group count, per-category counts, zero unassigned files, and no credentials in output.

Run: `npm run import:studio-catalog`

Expected: Cloudinary uploads/upserts succeed, summary has zero failed paths, and a rerun reports updates rather than duplicate products.

- [ ] **Step 6: Validate storefront data and commit code only**

Run: `npm run test:run && npm run typecheck && npm run lint && npm run build`

Verify Atlas count/category distribution, a representative grouped product gallery, RU/UZ/EN cards, and no purchase path for unpriced products. Commit scripts/schema/example configuration but never `.env.local`:

```bash
git add scripts/studio-catalog-manifest.ts scripts/import-studio-catalog.ts scripts/studio-catalog-manifest.test.ts src/lib/env.ts src/lib/services/image-upload-service.ts package.json .env.example
git commit -m "feat: import grouped studio flower catalog"
```

## Final verification

- [ ] Run `npm run test:run` and record the full pass count.
- [ ] Run `npm run typecheck`, `npm run lint`, and `npm run build` with exit code 0.
- [ ] Confirm `git status --short` has no `.env*` or secret-bearing content staged.
- [ ] Run `npm run import:studio-catalog -- --dry-run` after import and confirm each source is accounted for exactly once.
- [ ] Verify one group with multiple images, one basket, one pre-existing priced product, and one unpriced product in desktop and mobile storefront.
- [ ] Verify inline admin save emits a partial PATCH payload and cancel/unchanged save emits no request.
- [ ] Add the three Cloudinary variables to Vercel Production and Preview, deploy from `main`, then recheck the live public catalog and protected admin route.

## Plan self-review

- **Spec coverage:** Tasks 1–2 cover optional price and storefront/checkout; Task 3 covers strict diff PATCH and inline editing; Task 4 covers visual grouping, Cloudinary upload, Atlas import, and the `baskets` category; final verification covers security, quality gates, responsive QA, and Vercel deployment.
- **Placeholder scan:** No task leaves an unspecified implementation step; visual grouping is explicitly reviewed rather than filename-inferred, and its completeness is mechanically tested.
- **Type consistency:** `ProductPatchInput` is produced in Task 1/3 and consumed by the service, route, and panel in Task 3. `StudioProductGroup` is produced in Task 4 and consumes Task 1's optional-price contract.
