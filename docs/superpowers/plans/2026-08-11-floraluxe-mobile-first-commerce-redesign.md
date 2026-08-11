# Floraluxe Mobile-First Commerce Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing multilingual flower catalog into a production-ready Floraluxe commerce experience with seasonal availability, separate mobile-first catalog and detail journeys, dynamic home merchandising, database-managed brand/contact content, and reliable Telegram order delivery.

**Architecture:** Keep Next.js App Router server pages as the data/SEO boundary and use focused client islands for cart, filters, sliders, and admin editors. MongoDB repositories remain the persistence boundary; pure domain modules decide season and purchasability, while explicit cache tags connect admin mutations to public reads. Order creation and notification-outbox creation share one MongoDB transaction, then notification delivery happens after commit and can be retried safely.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript 5.9, MongoDB/Mongoose 9, next-intl 4, NextAuth 4, Zod 4, Vitest/Testing Library, Playwright, Cloudinary, Telegram Bot API, Vercel Cron.

## Global Constraints

- Brand copy is `Floraluxe`; do not replace ordinary Uzbek/Russian words that merely contain `nafis`.
- Public locales are `ru`, `uz`, and `en`; `/ru` is the default locale and every pathname segment remains English.
- Payme and Click are out of scope; checkout keeps cash-on-delivery and card-on-delivery only.
- Public contact, social, logo, SEO, delivery-policy, working-hours, and delivery-fee values come from MongoDB `SiteSettings`; hard-coded values are preview/build fallbacks only.
- Product cards and main media use restrained rectangular geometry; avoid pill-shaped containers and decorative excessive rounding.
- Mobile behavior is the primary acceptance target at 320, 375, 390, and 430 CSS pixels; tablet is checked at 768 and desktop at 1440.
- Product card activation always navigates to `/{locale}/products/{slug}`; public quick-view behavior is removed.
- Out-of-season products remain visible and indexable but cannot enter the cart.
- Seasonal calculations use `Asia/Tashkent`: March-May spring, June-August summer, September-November autumn, December-February winter.
- Existing products are migrated to `seasons: ["all_year"]`; `all_year` cannot be combined with another season.
- A product is purchasable only when published, in season, `stockQuantity > 0`, and `price` is a positive integer.
- Home admin-defined sections never replace the permanent Best Sellers and Recommended sections.
- A Telegram delivery failure must never roll back an accepted order or expose provider tokens, customer PII, or raw provider responses in logs.
- Existing order numbers remain valid; newly generated numbers use the `FL-` prefix.
- Do not perform a real Telegram group delivery until bot token/chat id exist and the user explicitly approves the external test.
- Continue using the current Next.js previous caching model: `unstable_cache` for MongoDB reads and `revalidateTag` after admin writes.
- Use `next/image` with explicit dimensions or `fill` in a sized parent, and keep Cloudinary remote patterns restricted to `res.cloudinary.com`.

---

### Task 1: Seasonal Availability Domain

**Files:**
- Create: `src/lib/product-availability.ts`
- Create: `src/lib/product-availability.test.ts`
- Modify: `src/lib/contracts.ts`
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/validations.test.ts`
- Modify: `src/models/Product.ts`
- Modify: `src/models/models.test.ts`
- Modify: `src/lib/repositories/catalog-repository.ts`
- Modify: `src/lib/repositories/admin-repository.ts`
- Modify: `src/lib/services/order-service.ts`
- Modify: `src/lib/services/order-service.test.ts`

**Interfaces:**
- Consumes: existing `CatalogProduct`, `AdminProduct`, `ProductInput`, `ProductPatchInput`, and atomic stock-reservation store operations.
- Produces: `SEASONS`, `Season`, `ProductAvailabilityReason`, `ProductAvailability`, `getTashkentSeason(now: Date): Exclude<Season, "all_year">`, `getProductAvailability(product, now): ProductAvailability`, and `isSeasonActive(seasons, now): boolean`.

- [ ] **Step 1: Write failing domain, schema, mapper, and checkout tests**

```ts
expect(getTashkentSeason(new Date("2026-03-01T00:00:00+05:00"))).toBe("spring");
expect(getTashkentSeason(new Date("2026-12-01T00:00:00+05:00"))).toBe("winter");
expect(isSeasonActive(["all_year"], new Date("2026-08-11T00:00:00+05:00"))).toBe(true);
expect(productInputSchema.safeParse({ ...validProduct, seasons: ["all_year", "summer"] }).success).toBe(false);
expect(mapCatalogProduct({ ...document, seasons: ["summer"] }, "ru").seasons).toEqual(["summer"]);
await expect(service.createOrder(outOfSeasonCheckout)).rejects.toMatchObject({
  code: "PRODUCT_OUT_OF_SEASON",
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm run test:run -- src/lib/product-availability.test.ts src/lib/validations.test.ts src/models/models.test.ts src/lib/services/order-service.test.ts`

Expected: FAIL because the season contracts/functions and schema field do not exist.

- [ ] **Step 3: Add the season contracts and pure availability implementation**

```ts
export const SEASONS = ["spring", "summer", "autumn", "winter", "all_year"] as const;
export type Season = (typeof SEASONS)[number];
export type ProductAvailabilityReason =
  | "available"
  | "unpublished"
  | "out_of_season"
  | "out_of_stock"
  | "price_missing";

export type ProductAvailability = {
  available: boolean;
  currentSeason: Exclude<Season, "all_year">;
  reason: ProductAvailabilityReason;
};

export function getTashkentSeason(now: Date): Exclude<Season, "all_year">;
export function isSeasonActive(seasons: readonly Season[], now: Date): boolean;
export function getProductAvailability(
  product: Pick<CatalogProduct, "status" | "stockQuantity" | "price" | "seasons">,
  now: Date
): ProductAvailability;
```

Implement reason precedence as `unpublished → out_of_season → out_of_stock → price_missing → available` and obtain the Tashkent month with `Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tashkent", month: "numeric" })`.

- [ ] **Step 4: Persist and validate seasons across DTOs and repositories**

Add `seasons: Season[]` to `CatalogProduct`, `AdminProduct`, product create/patch inputs, and `ProductDocument`. The Mongoose path is required with default `["all_year"]`; both Zod and the model reject empty arrays, duplicates, and `all_year` combined with any other value. Public/admin mappers return a defensive array copy.

- [ ] **Step 5: Enforce active season in atomic order reservation**

Pass the current Tashkent season into the store reservation query and add:

```ts
$or: [{ seasons: "all_year" }, { seasons: currentSeason }]
```

If reservation fails, distinguish `PRODUCT_OUT_OF_SEASON` from stock/price failures by reading the product once inside the same transaction and applying `getProductAvailability` before returning the typed domain error.

- [ ] **Step 6: Re-run focused tests and typecheck**

Run: `npm run test:run -- src/lib/product-availability.test.ts src/lib/validations.test.ts src/models/models.test.ts src/lib/services/order-service.test.ts`

Run: `npm run typecheck`

Expected: both commands PASS.

- [ ] **Step 7: Commit the seasonal domain**

```powershell
git add src/lib/product-availability.ts src/lib/product-availability.test.ts src/lib/contracts.ts src/lib/validations.ts src/lib/validations.test.ts src/models/Product.ts src/models/models.test.ts src/lib/repositories/catalog-repository.ts src/lib/repositories/admin-repository.ts src/lib/services/order-service.ts src/lib/services/order-service.test.ts
git commit -m "feat: add seasonal product availability"
```

### Task 2: Dynamic Home-Section Domain and Admin API

**Files:**
- Create: `src/models/HomeSection.ts`
- Create: `src/lib/repositories/home-section-repository.ts`
- Create: `src/lib/services/home-section-service.ts`
- Create: `src/lib/services/home-section-service.test.ts`
- Create: `src/app/api/admin/home-sections/route.ts`
- Create: `src/app/api/admin/home-sections/[id]/route.ts`
- Create: `src/app/api/admin/home-sections/route.test.ts`
- Modify: `src/lib/contracts.ts`
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/validations.test.ts`
- Modify: `src/lib/cache.ts`

**Interfaces:**
- Consumes: `Localized<T>`, ObjectId validation, `requireAdminApiSession`, same-origin checks, and product IDs from the admin repository.
- Produces: `HOME_SECTION_STATUSES`, `HomeSectionStatus`, `HomeSectionTranslation`, `AdminHomeSection`, `PublicHomeSection`, `homeSectionInputSchema`, `homeSectionPatchInputSchema`, `HOME_SECTIONS_CACHE_TAG`, and CRUD service methods.

- [ ] **Step 1: Write failing validation, service-ordering, authorization, and cache-invalidation tests**

```ts
expect(homeSectionInputSchema.parse(validSection).productIds).toEqual([productA, productB]);
expect(homeSectionInputSchema.safeParse({ ...validSection, productIds: [productA, productA] }).success).toBe(false);
expect(await service.listPublic("ru", now)).toEqual([
  expect.objectContaining({ title: "Топ цветов", productIds: [productA, productB] }),
]);
expect(await POST(unauthenticatedRequest)).toMatchObject({ status: 401 });
expect(revalidateTag).toHaveBeenCalledWith(HOME_SECTIONS_CACHE_TAG, "max");
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm run test:run -- src/lib/services/home-section-service.test.ts src/lib/validations.test.ts src/app/api/admin/home-sections/route.test.ts`

Expected: FAIL because the model, contracts, validation, service, and routes are missing.

- [ ] **Step 3: Add strict contracts and validation**

```ts
export const HOME_SECTION_STATUSES = ["draft", "published"] as const;
export type HomeSectionStatus = (typeof HOME_SECTION_STATUSES)[number];
export type HomeSectionTranslation = { title: string; description?: string };
export type AdminHomeSection = {
  id: string;
  translations: Localized<HomeSectionTranslation>;
  productIds: string[];
  sortOrder: number;
  status: HomeSectionStatus;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

`homeSectionInputSchema` requires all three translations, 1-24 unique product IDs, non-negative integer `sortOrder`, valid optional ISO datetimes, and `startsAt < endsAt` when both exist. Patch input remains strict and rejects an empty object.

- [ ] **Step 4: Implement model, repository, and service**

The Mongo model uses timestamps, `{ status: 1, sortOrder: 1 }` and `{ startsAt: 1, endsAt: 1 }` indexes. `listPublic(locale, now)` returns only published sections whose optional window contains `now`, ordered by `sortOrder`, and keeps the explicit `productIds` order.

- [ ] **Step 5: Implement authenticated admin CRUD routes**

`GET/POST /api/admin/home-sections` and `PATCH/DELETE /api/admin/home-sections/:id` use the existing admin auth/error envelope conventions. Every successful mutation calls `revalidateTag(HOME_SECTIONS_CACHE_TAG, "max")` and invalidates the public home path for all three locales.

- [ ] **Step 6: Re-run focused tests and typecheck**

Run: `npm run test:run -- src/lib/services/home-section-service.test.ts src/lib/validations.test.ts src/app/api/admin/home-sections/route.test.ts`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the home-section backend**

```powershell
git add src/models/HomeSection.ts src/lib/repositories/home-section-repository.ts src/lib/services/home-section-service.ts src/lib/services/home-section-service.test.ts src/app/api/admin/home-sections src/lib/contracts.ts src/lib/validations.ts src/lib/validations.test.ts src/lib/cache.ts
git commit -m "feat: add dynamic home sections"
```

### Task 3: Permanent Best-Seller and Recommendation Collections

**Files:**
- Create: `src/lib/services/home-merchandising-service.ts`
- Create: `src/lib/services/home-merchandising-service.test.ts`
- Modify: `src/lib/repositories/catalog-repository.ts`
- Modify: `src/lib/cache.ts`
- Modify: `src/lib/contracts.ts`

**Interfaces:**
- Consumes: `getProductAvailability`, delivered order snapshots, published product mappers, and public `HomeSection` rows.
- Produces: `HomePageCatalogData`, `getHomePageCatalogData(locale, now): Promise<HomePageCatalogData>`, `BEST_SELLERS_CACHE_TAG`, and `RECOMMENDATIONS_CACHE_TAG`.

- [ ] **Step 1: Write failing ranking and fallback tests**

```ts
expect(result.bestSellers.map((product) => product.id)).toEqual([productB, productA]);
expect(result.recommended).toHaveLength(4);
expect(result.recommended.every((product) => product.availability.available)).toBe(true);
expect(result.dynamicSections[0]?.products.map((product) => product.id)).toEqual([
  productC,
  productA,
]);
```

The fixtures must prove delivered quantities are summed across orders, cancelled/pending orders are ignored, ties use most recent delivery then stable product ID, unavailable products are excluded, featured products lead recommendations, and newest available products fill the list to a minimum of four.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm run test:run -- src/lib/services/home-merchandising-service.test.ts`

Expected: FAIL because `getHomePageCatalogData` does not exist.

- [ ] **Step 3: Add aggregate repository reads and orchestration**

```ts
export type HomePageCatalogData = {
  dynamicSections: Array<PublicHomeSection & { products: CatalogProduct[] }>;
  bestSellers: CatalogProduct[];
  recommended: CatalogProduct[];
};
```

Best Sellers returns at most 12 products based on all-time `delivered` item quantity. Recommended returns at most 12 products ordered by `isFeatured`, `sortOrder`, and `updatedAt`, filling to four with newest available products without duplicates. Dynamic sections silently omit unpublished/missing products while preserving administrator order.

- [ ] **Step 4: Cache each public collection with explicit tags**

Add readers keyed by locale and tagged separately with home sections, best sellers, recommendations, and products. Order transition to `delivered` invalidates `BEST_SELLERS_CACHE_TAG`; product mutation invalidates both best sellers and recommendations.

- [ ] **Step 5: Re-run tests and commit**

Run: `npm run test:run -- src/lib/services/home-merchandising-service.test.ts src/lib/services/catalog-service.test.ts`

Run: `npm run typecheck`

```powershell
git add src/lib/services/home-merchandising-service.ts src/lib/services/home-merchandising-service.test.ts src/lib/repositories/catalog-repository.ts src/lib/cache.ts src/lib/contracts.ts src/lib/services/order-service.ts
git commit -m "feat: add home merchandising collections"
```

### Task 4: Transactional Notification Outbox and Telegram Retry

**Files:**
- Create: `src/models/OrderNotification.ts`
- Create: `src/lib/repositories/order-notification-repository.ts`
- Create: `src/lib/services/order-notification-outbox-service.ts`
- Create: `src/lib/services/order-notification-outbox-service.test.ts`
- Create: `src/app/api/internal/order-notifications/retry/route.ts`
- Create: `src/app/api/internal/order-notifications/retry/route.test.ts`
- Create: `src/app/api/admin/orders/[id]/retry-notification/route.ts`
- Create: `src/app/api/admin/orders/[id]/retry-notification/route.test.ts`
- Modify: `src/lib/contracts.ts`
- Modify: `src/lib/services/order-service.ts`
- Modify: `src/lib/services/order-service.test.ts`
- Modify: `src/lib/services/order-notification-service.ts`
- Modify: `src/lib/env.ts`
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/route.test.ts`
- Create: `vercel.json`

**Interfaces:**
- Consumes: order transaction session, Telegram sender, admin auth, `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID`.
- Produces: `OrderNotificationStatus`, `AdminOrderNotification`, `enqueueOrderNotifications(order, session)`, `deliverNotification(id)`, `retryDueNotifications(now, limit)`, and protected internal/admin retry routes.

- [ ] **Step 1: Write failing atomicity, retry, idempotency, and authorization tests**

```ts
expect(store.createPendingOrder).toHaveBeenCalledBefore(store.createNotification);
expect(store.createNotification).toHaveBeenCalledWith(
  expect.objectContaining({ channel: "telegram", status: "pending", attempts: 0 }),
  transaction
);
expect(await service.retryDueNotifications(now, 20)).toEqual({ attempted: 1, sent: 1, failed: 0 });
expect(sendTelegram).toHaveBeenCalledTimes(1);
expect(await retryRoute(requestWithoutBearerSecret)).toMatchObject({ status: 401 });
```

Also prove order creation commits when post-commit delivery fails and that two concurrent workers cannot send the same row twice.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm run test:run -- src/lib/services/order-service.test.ts src/lib/services/order-notification-outbox-service.test.ts src/app/api/internal/order-notifications/retry/route.test.ts src/app/api/admin/orders/[id]/retry-notification/route.test.ts`

Expected: FAIL because the outbox model and retry routes are absent.

- [ ] **Step 3: Add the outbox model and claim-based repository**

```ts
export const ORDER_NOTIFICATION_STATUSES = ["pending", "processing", "sent", "failed"] as const;
export type OrderNotificationStatus = (typeof ORDER_NOTIFICATION_STATUSES)[number];
```

Persist `orderId`, `channel`, `status`, `attempts`, `nextAttemptAt`, `lastErrorCode`, `sentAt`, `claimedAt`, and timestamps. Add a unique `{ orderId: 1, channel: 1 }` index and `{ status: 1, nextAttemptAt: 1 }` retry index. Claims use `findOneAndUpdate` from due `pending/failed` to `processing` so concurrent cron invocations are idempotent.

- [ ] **Step 4: Enqueue in the order transaction and deliver after commit**

`createOrder` writes the Telegram outbox row with the same Mongoose session as the order. The public order route invokes `deliverNotification` only after `createOrder` resolves; delivery errors are converted to a generic result and never change the successful HTTP order response.

- [ ] **Step 5: Implement bounded retry and safe logging**

Use exponential delays of 1, 5, 15, 60, and 240 minutes, cap attempts at 10, reset stale `processing` claims after 10 minutes, store only stable codes such as `TIMEOUT`, `HTTP_REJECTED`, and `CONFIG_MISSING`, and log only notification/order IDs plus the stable code.

- [ ] **Step 6: Add protected retry routes and Vercel schedule**

The internal route accepts only `Authorization: Bearer ${CRON_SECRET}`, processes at most 20 due rows, and returns counts. The admin route requires the existing admin session, resets only a failed/pending row for its order, and immediately attempts delivery. Add a Vercel cron entry for `/api/internal/order-notifications/retry` every five minutes.

- [ ] **Step 7: Re-run focused tests and commit**

Run: `npm run test:run -- src/lib/services/order-service.test.ts src/lib/services/order-notification-outbox-service.test.ts src/app/api/orders/route.test.ts src/app/api/internal/order-notifications/retry/route.test.ts src/app/api/admin/orders/[id]/retry-notification/route.test.ts`

Run: `npm run typecheck`

```powershell
git add src/models/OrderNotification.ts src/lib/repositories/order-notification-repository.ts src/lib/services/order-notification-outbox-service.ts src/lib/services/order-notification-outbox-service.test.ts src/app/api/internal/order-notifications/retry src/app/api/admin/orders/[id]/retry-notification src/lib/contracts.ts src/lib/services/order-service.ts src/lib/services/order-service.test.ts src/lib/services/order-notification-service.ts src/lib/env.ts src/app/api/orders/route.ts src/app/api/orders/route.test.ts vercel.json
git commit -m "feat: add reliable order notification outbox"
```

### Task 5: Admin Merchandising, Seasons, Settings, and Notification Controls

**Files:**
- Create: `src/components/admin/AdminHomeSectionsPanel.tsx`
- Create: `src/components/admin/AdminHomeSectionsPanel.test.tsx`
- Create: `src/app/admin/(dashboard)/home-sections/page.tsx`
- Modify: `src/components/admin/AdminProductsPanel.tsx`
- Modify: `src/components/admin/AdminProductsPanel.test.tsx`
- Modify: `src/components/admin/AdminSettingsPanel.tsx`
- Modify: `src/components/admin/AdminSettingsPanel.test.tsx`
- Modify: `src/components/admin/AdminOrdersPanel.tsx`
- Modify: `src/components/admin/AdminOrdersPanel.test.tsx`
- Modify: `src/components/admin/AdminShell.tsx`
- Modify: `src/app/admin/(dashboard)/products/page.tsx`
- Modify: `src/app/admin/(dashboard)/settings/page.tsx`
- Modify: `src/lib/repositories/admin-repository.ts`
- Modify: `src/lib/services/admin-service.ts`
- Modify: `src/app/api/admin/settings/route.ts`
- Modify: `src/app/api/admin/products/[id]/route.ts`

**Interfaces:**
- Consumes: Task 1 season DTOs, Task 2 home-section CRUD, Task 4 notification status/retry route, existing inline changed-row patch batching, and Cloudinary uploader.
- Produces: accessible admin editors for the new commerce data without product-detail modals.

- [ ] **Step 1: Write failing admin interaction tests**

```tsx
await user.click(screen.getByRole("button", { name: /edit products/i }));
await user.click(screen.getByRole("checkbox", { name: /summer/i }));
await user.click(screen.getByRole("button", { name: /save changed products/i }));
expect(fetch).toHaveBeenCalledTimes(1);
expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({ seasons: ["summer"] });
```

Home-section tests cover create, three-language title entry, searchable product selection, drag/button ordering, schedule validation, publish, and exact payload. Settings tests cover horizontal/compact logo upload and contact/SEO fields. Orders tests cover notification status and retry without opening a modal.

- [ ] **Step 2: Run admin tests and confirm RED**

Run: `npm run test:run -- src/components/admin/AdminProductsPanel.test.tsx src/components/admin/AdminHomeSectionsPanel.test.tsx src/components/admin/AdminSettingsPanel.test.tsx src/components/admin/AdminOrdersPanel.test.tsx`

Expected: FAIL for the missing controls and panel.

- [ ] **Step 3: Extend inline product editing without changing its patch semantics**

Add a compact season checkbox group to each editable list row. Keep one top-level Edit button; rows remain text until editing starts; only rows whose normalized draft differs from the original DTO issue PATCH requests. No modal and no detail-page dependency.

- [ ] **Step 4: Build the home-section page**

Use a list/editor split that becomes a single column below 768px. Product selection uses an accessible searchable list sourced from admin products; selected products appear as ordered rectangular rows with Move up, Move down, and Remove buttons. Save, publish, duplicate, and delete states show pending, success, and inline error feedback.

- [ ] **Step 5: Add settings and order controls**

Site settings gains `brandLogo`, `brandMark`, and inquiry-contact preview fields. Orders display `telegram.status`, `attempts`, `lastErrorCode`, and a Retry button enabled only for failed/pending delivery rows.

- [ ] **Step 6: Re-run admin tests, accessibility smoke, and typecheck**

Run: `npm run test:run -- src/components/admin/AdminProductsPanel.test.tsx src/components/admin/AdminHomeSectionsPanel.test.tsx src/components/admin/AdminSettingsPanel.test.tsx src/components/admin/AdminOrdersPanel.test.tsx`

Run: `npm run typecheck`

Expected: PASS, with no unlabeled form fields or icon-only buttons.

- [ ] **Step 7: Commit admin capabilities**

```powershell
git add src/components/admin src/app/admin/(dashboard)/home-sections src/app/admin/(dashboard)/products/page.tsx src/app/admin/(dashboard)/settings/page.tsx src/lib/repositories/admin-repository.ts src/lib/services/admin-service.ts src/app/api/admin/settings/route.ts src/app/api/admin/products/[id]/route.ts
git commit -m "feat: add Floraluxe merchandising admin"
```

### Task 6: Floraluxe Brand Assets, Settings, and Order Identity

**Files:**
- Create: `public/brand/floraluxe-logo.jpg`
- Create: `public/brand/floraluxe-mark.jpg`
- Create: `src/app/opengraph-image.tsx`
- Modify: `src/app/icon.svg`
- Modify: `src/models/SiteSettings.ts`
- Modify: `src/lib/contracts.ts`
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/services/public-settings-service.ts`
- Create: `src/lib/services/public-settings-service.test.ts`
- Modify: `src/lib/services/order-number.ts`
- Modify: `src/lib/services/order-number.test.ts`
- Modify: `src/lib/services/order-notification-service.ts`
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/robots.ts`
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: user-provided horizontal and circular Floraluxe logos, SiteSettings admin form, environment validation, and existing metadata readers.
- Produces: `brandLogo`, `brandMark`, dynamic Floraluxe metadata assets, and new `FL-YYYYMMDD-XXXXXX` order numbers.

- [ ] **Step 1: Write failing settings, order-number, metadata, and hard-coded-brand tests**

```ts
expect(generateOrderNumber(new Date("2026-08-11T06:00:00Z"), "ABC123")).toBe("FL-20260811-ABC123");
expect(getDefaultPublicSiteSettings("ru").siteName).toBe("Floraluxe");
expect(publicSettings.brandLogo?.url).toContain("/brand/floraluxe-logo.jpg");
```

Add a source scan test that rejects `Nafis Flowers`, `nafis.uz`, and `NF-` outside migration fixtures/documented legacy compatibility.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm run test:run -- src/lib/services/order-number.test.ts src/lib/services/public-settings-service.test.ts src/app/sitemap.test.ts src/app/robots.test.ts`

Expected: FAIL on current Nafis defaults and `NF-` generation.

- [ ] **Step 3: Add logo fields and replace brand identity**

Use the horizontal user logo as `brandLogo`, circular logo as `brandMark`, and retain uploaded Cloudinary URLs when settings override local defaults. Replace brand-visible strings in emails, metadata, admin headings, accessible labels, and fallbacks with Floraluxe; preserve customer data and legacy order numbers unchanged.

- [ ] **Step 4: Update SEO defaults and environment documentation**

Generate an ivory/gold 1200×630 OG image from settings-compatible Floraluxe defaults, use canonical locale URLs, emit Organization/Florist JSON-LD from public settings, and document `MONGODB_URI`, NextAuth, Cloudinary, Telegram, `CRON_SECRET`, and public base URL variable names without values.

- [ ] **Step 5: Re-run focused tests and commit**

Run: `npm run test:run -- src/lib/services/order-number.test.ts src/lib/services/public-settings-service.test.ts src/app/sitemap.test.ts src/app/robots.test.ts`

Run: `npm run typecheck`

```powershell
git add public/brand src/app/opengraph-image.tsx src/app/icon.svg src/models/SiteSettings.ts src/lib/contracts.ts src/lib/validations.ts src/lib/services/public-settings-service.ts src/lib/services/order-number.ts src/lib/services/order-number.test.ts src/lib/services/order-notification-service.ts src/app/sitemap.ts src/app/robots.ts README.md .env.example
git commit -m "feat: rebrand storefront as Floraluxe"
```

### Task 7: Shared Storefront Frame and Separate Page Data Boundaries

**Files:**
- Create: `src/components/storefront/StorefrontFrame.tsx`
- Create: `src/components/storefront/StorefrontFrame.test.tsx`
- Create: `src/features/layout/MobileNavigation.tsx`
- Create: `src/features/layout/MobileNavigation.test.tsx`
- Create: `src/app/(store)/[locale]/catalog/loading.tsx`
- Modify: `src/app/(store)/[locale]/layout.tsx`
- Modify: `src/app/(store)/[locale]/page.tsx`
- Modify: `src/app/(store)/[locale]/catalog/page.tsx`
- Modify: `src/components/storefront/StorefrontShell.tsx`
- Modify: `src/components/storefront/StorefrontClient.tsx`
- Modify: `src/features/layout/Header.tsx`
- Modify: `src/features/layout/Footer.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Delete: `src/features/product/ProductQuickView.tsx`

**Interfaces:**
- Consumes: public settings, locale router, cart storage/reducer, categories, home merchandising data, and catalog data.
- Produces: one shared sticky `StorefrontFrame`, compact-on-scroll `Header`, settings-driven `Footer`, mobile bottom navigation, a home-only client, and a catalog-only client.

- [ ] **Step 1: Write failing route separation and navigation tests**

```tsx
expect(renderedHome.queryByRole("heading", { name: /filters/i })).not.toBeInTheDocument();
expect(renderedCatalog.getByRole("heading", { name: /catalog/i })).toBeInTheDocument();
expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toHaveTextContent(
  /home.*catalog.*favorites.*cart/i
);
```

Also assert header has sticky semantics/classes, product/catalog navigation uses locale-aware English paths, settings values appear in header/footer, and the mobile cart badge reports zero/non-zero accessibly.

- [ ] **Step 2: Run focused UI and page tests and confirm RED**

Run: `npm run test:run -- src/components/storefront/StorefrontFrame.test.tsx src/features/layout/MobileNavigation.test.tsx src/app/(store)/[locale]/page.test.tsx src/app/App.test.tsx`

Expected: FAIL because the home and catalog still share the monolithic `App` experience.

- [ ] **Step 3: Move shared state and chrome into `StorefrontFrame`**

Keep cart persistence, drawer state, favorite storage, header/footer, and mobile nav in the shared client frame. Header starts at full height, applies a compact class after 32px scroll, remains keyboard accessible, and respects `prefers-reduced-motion`.

- [ ] **Step 4: Split route data and clients**

`/[locale]` fetches settings, categories, and `getHomePageCatalogData`; `/[locale]/catalog` parses URL filters and fetches only catalog/settings/categories. Neither page fetches the other page’s product payload. Catalog gets a route-level rectangular skeleton in `loading.tsx`.

- [ ] **Step 5: Remove public quick view and use Links**

Delete the quick-view state/import path from `App.tsx` and product grids. Product card image/title surfaces are locale-aware `<Link href={\`/${locale}/products/${slug}\`}>`; nested favorite controls stop propagation and remain buttons.

- [ ] **Step 6: Re-run focused tests and commit**

Run: `npm run test:run -- src/components/storefront/StorefrontFrame.test.tsx src/features/layout/MobileNavigation.test.tsx src/app/(store)/[locale]/page.test.tsx src/app/App.test.tsx`

Run: `npm run typecheck`

```powershell
git add src/components/storefront src/features/layout src/app/(store)/[locale]/layout.tsx src/app/(store)/[locale]/page.tsx src/app/(store)/[locale]/catalog/page.tsx src/app/(store)/[locale]/catalog/loading.tsx src/app/App.tsx src/app/App.test.tsx
git commit -m "refactor: split Floraluxe storefront routes"
```

### Task 8: Mobile-First Catalog and Product Detail Purchase Rules

**Files:**
- Create: `src/features/catalog/MobileFilterDrawer.tsx`
- Create: `src/features/catalog/MobileFilterDrawer.test.tsx`
- Modify: `src/features/catalog/CatalogFilters.tsx`
- Modify: `src/features/catalog/CatalogGrid.tsx`
- Modify: `src/features/catalog/catalog-utils.ts`
- Modify: `src/features/catalog/catalog-utils.test.ts`
- Modify: `src/components/storefront/ProductDetail.tsx`
- Modify: `src/app/(store)/[locale]/products/[slug]/page.tsx`
- Modify: `src/app/(store)/[locale]/products/[slug]/page.test.tsx`
- Modify: `src/app/(store)/[locale]/products/[slug]/opengraph-image.tsx`
- Modify: `src/messages/ru.json`
- Modify: `src/messages/uz.json`
- Modify: `src/messages/en.json`

**Interfaces:**
- Consumes: Task 1 `ProductAvailability`, Task 6 contact/settings, locale-aware product links, and cart callbacks from `StorefrontFrame`.
- Produces: URL-backed catalog filters, near-full-screen mobile filter drawer, seasonal card labels, sticky product-detail CTA, and availability-inquiry links.

- [ ] **Step 1: Write failing URL, drawer, card-navigation, and CTA-precedence tests**

```tsx
expect(buildCatalogHref("ru", { category: "roses", sale: true, season: "summer" })).toBe(
  "/ru/catalog?category=roses&sale=true&season=summer"
);
await user.click(screen.getByRole("button", { name: /filters/i }));
expect(screen.getByRole("dialog", { name: /filters/i })).toBeVisible();
expect(screen.getByRole("link", { name: product.name })).toHaveAttribute(
  "href",
  `/ru/products/${product.slug}`
);
expect(renderDetail(outOfSeasonProduct).getByRole("link", { name: /check availability/i })).toHaveAttribute(
  "href",
  expect.stringContaining("t.me")
);
```

Also test CTA precedence: out of season, out of stock, missing price, then Add to cart. Verify `aria-modal`, focus trap, Escape close, scroll lock, trigger focus restoration, and back/forward URL state.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm run test:run -- src/features/catalog/catalog-utils.test.ts src/features/catalog/MobileFilterDrawer.test.tsx src/app/(store)/[locale]/products/[slug]/page.test.tsx`

Expected: FAIL for season query, missing drawer, and old purchase behavior.

- [ ] **Step 3: Implement URL-backed filters and mobile drawer**

Desktop keeps a rectangular right-side filter panel. Below 768px, a sticky Filter/Sort bar opens a drawer occupying at least `calc(100dvh - 24px)` with clear Apply and Reset controls. Draft values do not change results until Apply; Apply updates `category`, `sale`, `query`, `season`, `sort`, and `page` in the URL, resets page to 1, and closes the drawer.

- [ ] **Step 4: Make cards navigational and visually rectangular**

Use a two-column grid at 320-430px, three columns at tablet widths where space permits, and four columns plus filters at desktop. Keep title, price/status, season label, and favorite control; remove card-level Add to cart so accidental mobile purchases cannot occur.

- [ ] **Step 5: Enforce product-detail purchase and inquiry behavior**

The product detail page receives public settings and a server-computed availability object. Available products get quantity plus Add to cart; unavailable products get a disabled explanatory status and `Mavjudligini so‘rash`/localized equivalent. The inquiry URL uses configured Telegram with an encoded localized product name and canonical product URL, falling back to `tel:` when Telegram is absent. The sticky mobile CTA leaves content unobscured with safe-area padding.

- [ ] **Step 6: Correct product SEO for availability**

Product JSON-LD uses `OutOfStock` for out-of-season/out-of-stock products, includes `Offer` only for a positive price, and keeps the page indexable. Metadata/OG uses translated title/description and the first valid product image.

- [ ] **Step 7: Re-run focused tests and commit**

Run: `npm run test:run -- src/features/catalog/catalog-utils.test.ts src/features/catalog/MobileFilterDrawer.test.tsx src/app/(store)/[locale]/products/[slug]/page.test.tsx`

Run: `npm run typecheck`

```powershell
git add src/features/catalog src/components/storefront/ProductDetail.tsx src/app/(store)/[locale]/products/[slug] src/messages/ru.json src/messages/uz.json src/messages/en.json
git commit -m "feat: add mobile catalog and seasonal product detail"
```

### Task 9: Premium Home Merchandising and Responsive Visual System

**Files:**
- Create: `src/features/home/ProductRail.tsx`
- Create: `src/features/home/ProductRail.test.tsx`
- Create: `src/features/home/HomePage.tsx`
- Create: `src/features/home/HomePage.test.tsx`
- Modify: `src/features/layout/HeroCarousel.tsx`
- Modify: `src/features/layout/HeroCarousel.ssr.test.tsx`
- Modify: `src/features/layout/CategoryStrip.tsx`
- Modify: `src/features/layout/PromoBanner.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/styles.css`
- Modify: `src/app/fonts.ts`
- Modify: `src/messages/ru.json`
- Modify: `src/messages/uz.json`
- Modify: `src/messages/en.json`

**Interfaces:**
- Consumes: `HomePageCatalogData`, settings-driven brand/contact values, product card links, and locale messages.
- Produces: dynamic admin-defined product rails plus permanent Best Sellers and Recommended rails in one premium mobile-first visual language.

- [ ] **Step 1: Write failing home composition and rail interaction tests**

```tsx
expect(screen.getByRole("heading", { name: /best sellers/i })).toBeVisible();
expect(screen.getByRole("heading", { name: /recommended/i })).toBeVisible();
expect(screen.getByRole("heading", { name: dynamicSection.title })).toBeVisible();
expect(screen.getAllByRole("link", { name: /view product/i })[0]).toHaveAttribute(
  "href",
  `/ru/products/${product.slug}`
);
```

Also test that arrow buttons are disabled at rail boundaries, swipe/scroll works without trapping vertical touch, reduced motion disables automatic hero movement, and empty dynamic sections do not render.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm run test:run -- src/features/home/ProductRail.test.tsx src/features/home/HomePage.test.tsx src/features/layout/HeroCarousel.ssr.test.tsx`

Expected: FAIL because the home rail components are absent.

- [ ] **Step 3: Build semantic home sections**

Render the hero, category editorial strip, each active dynamic section by `sortOrder`, Best Sellers, Recommended, and a settings-backed delivery/contact CTA. `ProductRail` uses native horizontal scrolling with CSS scroll snap on mobile and explicit previous/next controls on larger screens; it does not clone slides or hide focusable cards.

- [ ] **Step 4: Apply the Floraluxe design tokens and geometry**

Define CSS variables for ivory, warm white, magnolia, dark chocolate, antique gold, muted text, border, focus, spacing, and type scales. Use editorial serif headings and neutral sans body text, 0-8px radii only where usability requires, hairline borders, rectangular cards/buttons, visible 2px focus rings, and transitions under 220ms.

- [ ] **Step 5: Implement responsive states**

At 320-430px: content gutters 16px, touch targets at least 44×44px, two-column product cards, horizontal category/section rails, sticky bottom nav, no horizontal body overflow, and CTA text never truncates below meaning. At 768px: balanced three-column content and drawer filters. At 1440px: max-width editorial grid, four product columns, right filter rail, and restrained whitespace.

- [ ] **Step 6: Re-run component tests and commit**

Run: `npm run test:run -- src/features/home/ProductRail.test.tsx src/features/home/HomePage.test.tsx src/features/layout/HeroCarousel.ssr.test.tsx src/app/App.test.tsx`

Run: `npm run typecheck`

```powershell
git add src/features/home src/features/layout src/app/globals.css src/app/styles.css src/app/fonts.ts src/messages/ru.json src/messages/uz.json src/messages/en.json
git commit -m "feat: redesign Floraluxe storefront"
```

### Task 10: Data Migration, Production Configuration, and End-to-End Verification

**Files:**
- Create: `scripts/migrate-floraluxe-commerce.ts`
- Create: `scripts/migrate-floraluxe-commerce.test.ts`
- Create: `tests/e2e/floraluxe-storefront.spec.ts`
- Create: `tests/e2e/floraluxe-admin.spec.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `docs/superpowers/specs/2026-08-11-floraluxe-mobile-first-commerce-redesign-design.md`

**Interfaces:**
- Consumes: existing MongoDB catalog, SiteSettings, Cloudinary assets, all prior tasks, current Git remote, and Vercel project configuration.
- Produces: idempotent migration command, production runbook, responsive E2E evidence, and a deployable verified branch.

- [ ] **Step 1: Write failing migration tests against isolated model fakes**

```ts
expect(await migrate({ dryRun: true })).toMatchObject({ productsUpdated: existingCount });
expect(existingProducts.every((product) => product.seasons?.length)).toBe(true);
expect(await migrate({ dryRun: false })).toEqual(await migrate({ dryRun: false }));
expect(settings.siteName).toBe("Floraluxe");
```

Prove dry-run performs no writes, existing season values are preserved, missing seasons become `all_year`, missing brand/logo defaults are applied once, and legacy order numbers are untouched.

- [ ] **Step 2: Run the migration test and confirm RED**

Run: `npm run test:run -- scripts/migrate-floraluxe-commerce.test.ts`

Expected: FAIL because the migration command is absent.

- [ ] **Step 3: Implement the idempotent migration and package script**

Add `npm run migrate:floraluxe -- --dry-run` and `npm run migrate:floraluxe`. The script loads environment variables with `@next/env`, requires an explicit `--apply` for writes, reports counts only, updates products with missing/empty seasons, and upserts settings fields without overwriting administrator changes.

- [ ] **Step 4: Add critical Playwright journeys**

`floraluxe-storefront.spec.ts` covers default `/ → /ru`, header compaction, locale preservation, home rail links, catalog URL filters/back-forward, mobile filter focus/scroll lock, detail navigation, unavailable inquiry, available cart/checkout, and no horizontal overflow at 320/375/390/430/768/1440. `floraluxe-admin.spec.ts` covers login, inline season edit with only changed PATCH requests, home-section create/order/publish, settings update, and notification retry using mocked external delivery.

- [ ] **Step 5: Run the full local verification gate**

Run: `npm run lint`

Run: `npm run typecheck`

Run: `npm run test:run`

Run: `npm run build`

Run: `npm run test:e2e`

Expected: all commands exit 0; browser console has no uncaught errors, failed first-party requests, hydration errors, missing images, or accessibility violations introduced by the change.

- [ ] **Step 6: Perform real responsive browser QA**

Run the production build locally and inspect `/ru`, `/ru/catalog`, at least one available product, one unavailable product, checkout, `/admin/products`, `/admin/home-sections`, `/admin/settings`, and `/admin/orders` at all required widths. Capture screenshots for 320, 390, 768, and 1440, verify keyboard-only filters/drawers, and stop the preview server afterward.

- [ ] **Step 7: Dry-run then apply the MongoDB migration**

Run the dry-run first and record counts. Apply only after counts match the expected catalog population, then read back product season coverage and SiteSettings from MongoDB. This step changes database state and must not run against an unidentified connection string.

- [ ] **Step 8: Configure Vercel without exposing secrets**

Confirm the linked Vercel project and Git repository are the intended `flowers` targets. Add secret values through Vercel environment controls, not Git; deploy through the connected branch; verify production metadata, MongoDB reads, image delivery, order creation, and cron authorization. Perform the real Telegram group test only after the separate explicit approval required by the global constraints.

- [ ] **Step 9: Commit migration, tests, and documentation**

```powershell
git add scripts/migrate-floraluxe-commerce.ts scripts/migrate-floraluxe-commerce.test.ts tests/e2e/floraluxe-storefront.spec.ts tests/e2e/floraluxe-admin.spec.ts package.json README.md .env.example docs/superpowers/specs/2026-08-11-floraluxe-mobile-first-commerce-redesign-design.md
git commit -m "chore: prepare Floraluxe production rollout"
```

- [ ] **Step 10: Final review and push**

Inspect `git status --short`, `git diff --check`, and the complete commit range against the remote branch. Push only the intended commits after all gates pass; report exact commit SHA, Vercel deployment URL, migration counts, and clearly separate local verification from production verification.
