# Nafis Flowers Next.js + MongoDB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing Nafis Flowers Vite storefront into a SEO-optimized Next.js App Router commerce application with MongoDB catalog/order persistence, protected admin CRUD, Cloudinary image uploads, and non-payment guest checkout.

**Architecture:** Next.js App Router hosts server-rendered public storefront pages, Route Handlers, and protected admin pages in one codebase. Mongoose models/repositories own MongoDB data access; server services own order transactions, cache invalidation, and notifications; client components own only interactive filters, cart, favorites, quick-view, and forms.

**Tech Stack:** Next.js App Router, React, TypeScript strict, Mongoose/MongoDB Atlas, Auth.js/NextAuth Credentials, Zod, bcryptjs, Cloudinary, Nodemailer, Telegram Bot API, Vitest/Testing Library, Playwright.

## Global Constraints

- Preserve the original Uzbek Nafis visual language, accessible interactions, local favorites/cart UX, and desktop/tablet/mobile layout quality.
- Use Next.js App Router, Server Components by default, and Client Components only for browser state or event handling.
- Checkout creates only unpaid `pending` orders; Payme, Click, and every online-payment claim are out of scope.
- All public product/category data comes from MongoDB; client prices and stock are never trusted at checkout.
- Use MongoDB Atlas replica-set transactions for stock reservation and one-time cancellation stock restoration.
- Store secrets only in `.env.local`; ship `.env.example` with names and safe example values only.
- Admin credentials use `ADMIN_PASSWORD_HASH` and `NEXTAUTH_SECRET`, never a plain-text password or a browser-exposed environment variable.
- Reuse the reference project’s cached Mongoose connection and Route Handler pattern, but strengthen auth and validation where this plan specifies it.
- Existing workspace is intentionally not a Git repository. Do not initialize Git or include commit commands; each task ends with explicit test/build evidence instead.
- Do not add a payment SDK, a separate backend service, or an unneeded global state library.

---

## Target File Structure

```text
src/
  app/
    (store)/
      layout.tsx
      page.tsx
      gullar/page.tsx
      gullar/[slug]/page.tsx
      buyurtma/page.tsx
      buyurtma/muvaffaqiyatli/page.tsx
    admin/
      login/page.tsx
      (protected)/layout.tsx
      (protected)/page.tsx
      (protected)/products/page.tsx
      (protected)/products/new/page.tsx
      (protected)/products/[id]/page.tsx
      (protected)/categories/page.tsx
      (protected)/orders/page.tsx
      (protected)/orders/[id]/page.tsx
      (protected)/settings/page.tsx
    api/
      auth/[...nextauth]/route.ts
      products/route.ts
      products/[slug]/route.ts
      categories/route.ts
      orders/route.ts
      admin/products/route.ts
      admin/products/[id]/route.ts
      admin/categories/route.ts
      admin/categories/[id]/route.ts
      admin/orders/route.ts
      admin/orders/[id]/route.ts
      admin/settings/route.ts
      upload/route.ts
    layout.tsx
    sitemap.ts
    robots.ts
  components/
    storefront/
    admin/
    ui/
  features/
    cart/
    catalog/
    checkout/
    favorites/
  lib/
    auth.ts
    env.ts
    mongodb.ts
    cache.ts
    contracts.ts
    seo.ts
    rate-limit.ts
    repositories/
    services/
  models/
    Product.ts
    Category.ts
    Order.ts
    SiteSettings.ts
    RateLimit.ts
  scripts/
    seed-catalog.ts
```

## Shared Contracts

Task 2 defines these interfaces. Later tasks must import them rather than re-declare a competing shape.

```ts
export type ProductStatus = "draft" | "published" | "archived";
export type CategoryStatus = "published" | "hidden";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "delivering"
  | "delivered"
  | "cancelled";

export type ProductImage = {
  url: string;
  alt: string;
  publicId?: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  images: ProductImage[];
  categorySlug: string;
  flowerTypes: string[];
  colors: string[];
  stockQuantity: number;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
};

export type CheckoutInput = {
  customer: {
    fullName: string;
    phone: string;
    address: string;
    deliveryDate?: string;
    comment?: string;
  };
  paymentMethod: "cash_on_delivery" | "card_on_delivery";
  items: Array<{ productId: string; quantity: number }>;
};

export type OrderCreationResult = {
  orderId: string;
  orderNumber: string;
  total: number;
  status: "pending";
};
```

## Task 1: Replace Vite foundation with a testable Next.js App Router foundation

**Files:**
- Create: `next.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/(store)/layout.tsx`, `src/app/(store)/page.tsx`, `src/test/setup.ts`, `vitest.config.ts`, `.env.example`
- Modify: `package.json`, `tsconfig.json`, `README.md`, existing CSS import locations
- Remove after migration verification: `index.html`, `vite.config.ts`, `src/main.tsx`
- Test: `src/app/(store)/page.test.tsx`

**Interfaces:**
- Produces `RootLayout`, `StoreLayout`, a working `/` route, and `npm run dev`, `npm run build`, `npm run test:run`, `npm run lint` scripts.
- Later tasks depend on the `@/*` TypeScript alias and Vitest jsdom setup created here.

- [ ] **Step 1: Write the failing App Router shell test**

```tsx
import { render, screen } from "@testing-library/react";
import StorePage from "./page";

it("renders the Nafis storefront route shell", async () => {
  render(await StorePage());
  expect(screen.getByRole("main", { name: /nafis gullar katalogi/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and record the expected missing-route failure**

Run: `npm run test:run -- src/app/(store)/page.test.tsx`  
Expected: FAIL because `src/app/(store)/page.tsx` does not exist.

- [ ] **Step 3: Replace build/runtime configuration with Next.js**

Use `next`, `react`, `react-dom`, `typescript`, `eslint`, `eslint-config-next`, `vitest`, Testing Library, jsdom, `mongoose`, `zod`, `bcryptjs`, `next-auth`, `cloudinary`, notification dependencies, and `tsx` as a development dependency for the explicit seed command. Configure scripts exactly as:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "seed:catalog": "tsx scripts/seed-catalog.ts"
  }
}
```

Create `src/app/layout.tsx` with `<html lang="uz">`, an exported `Metadata` baseline, and `src/app/(store)/page.tsx` with the accessible `main` shell. Move global tokens/styles into `globals.css`; do not import browser-only modules from server layouts.

- [ ] **Step 4: Configure remote image policy and safe environment examples**

`next.config.ts` must permit only currently curated HTTPS image hosts and Cloudinary with `images.remotePatterns`; it must not set `images.unoptimized`. `.env.example` must list `MONGODB_URI`, `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `NEXT_PUBLIC_SITE_URL`, Cloudinary, SMTP, and Telegram variable names without real credentials.

- [ ] **Step 5: Run foundation verification**

Run:

```bash
npm run test:run -- src/app/(store)/page.test.tsx
npm run typecheck
npm run lint
npm run build
```

Expected: focused test passes; typecheck/lint/build exit 0; `/` renders from `next dev`.

## Task 2: Add validated environment, cached Mongo connection, Mongoose models, and shared contracts

**Files:**
- Create: `src/lib/env.ts`, `src/lib/mongodb.ts`, `src/lib/contracts.ts`, `src/lib/validations.ts`, `src/models/Product.ts`, `src/models/Category.ts`, `src/models/Order.ts`, `src/models/SiteSettings.ts`, `src/models/RateLimit.ts`
- Test: `src/lib/validations.test.ts`, `src/models/models.test.ts`

**Interfaces:**
- Produces `dbConnect(): Promise<typeof mongoose>`, `env`, `productInputSchema`, `categoryInputSchema`, `checkoutSchema`, `orderStatusSchema`, `CatalogProduct`, `CheckoutInput`, and `OrderCreationResult`.
- Task 3 consumes Product/Category models; Tasks 6–10 consume all schemas and models.

- [ ] **Step 1: Write failing boundary tests for Zod inputs and model invariants**

```ts
import { checkoutSchema, productInputSchema } from "@/lib/validations";

it("rejects a browser-supplied order total and quantity above 99", () => {
  expect(() => checkoutSchema.parse({
    customer: { fullName: "Ali Valiyev", phone: "+998901234567", address: "Toshkent" },
    paymentMethod: "cash_on_delivery",
    total: 1,
    items: [{ productId: "507f1f77bcf86cd799439011", quantity: 100 }],
  })).toThrow();
});

it("requires a published product image with truthful alt text", () => {
  expect(() => productInputSchema.parse({ name: "Lola", slug: "lola", price: 150000, images: [{ url: "https://cdn.example/lola.jpg", alt: "" }] })).toThrow();
});
```

- [ ] **Step 2: Run focused tests to verify the missing-module failure**

Run: `npm run test:run -- src/lib/validations.test.ts src/models/models.test.ts`  
Expected: FAIL because validation/model modules do not exist.

- [ ] **Step 3: Implement server-only environment and cached connection**

`src/lib/env.ts` must parse server-only variables lazily enough that public page builds can run without Mongo credentials, while any DB/auth/upload operation fails with a concise configuration error. `src/lib/mongodb.ts` must use the reference project’s `globalThis` cache pattern and options below:

```ts
const options = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 8_000,
  maxPoolSize: 10,
};
```

Never expose `MONGODB_URI`, Cloudinary secret, SMTP password, or Telegram token through a `NEXT_PUBLIC_` key.

- [ ] **Step 4: Implement models and schemas with database indexes**

Implement Product, Category, Order, SiteSettings, and TTL-backed RateLimit models. Product has unique `slug`, `status`, `stockQuantity >= 0`, and required `images[].alt`. Order stores immutable line snapshots and uses `status`, `paymentStatus: "unpaid"`, and `stockReleasedAt`. SiteSettings has a singleton key with a unique index. Define the allowed order transitions exactly:

```ts
export const allowedOrderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["delivering", "cancelled"],
  delivering: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
```

- [ ] **Step 5: Run model/validation verification**

Run:

```bash
npm run test:run -- src/lib/validations.test.ts src/models/models.test.ts
npm run typecheck
```

Expected: invalid payloads fail, valid 1..99 payloads parse, model indexes/types compile.

## Task 3: Build catalog repositories, idempotent seed, public read APIs, and cache boundary

**Files:**
- Create: `src/lib/cache.ts`, `src/lib/repositories/catalog-repository.ts`, `src/lib/services/catalog-service.ts`, `src/app/api/products/route.ts`, `src/app/api/products/[slug]/route.ts`, `src/app/api/categories/route.ts`, `scripts/seed-catalog.ts`
- Modify: `src/data/catalog.ts` to become the seed source only; `src/data/catalog.test.ts`
- Test: `src/lib/services/catalog-service.test.ts`, `src/app/api/products/route.test.ts`, `scripts/seed-catalog.test.ts`

**Interfaces:**
- Produces `getPublishedCatalog(filters)`, `getPublishedProductBySlug(slug)`, `getPublishedCategories()`, `toCatalogProduct(document)`, and `CATALOG_CACHE_TAGS`.
- Task 4 server pages and Task 5 SEO consume these read functions; Tasks 9–10 invalidate their cache paths/tags after writes.

- [ ] **Step 1: Write failing repository/service tests**

```ts
it("never returns draft or archived products from the public catalog", async () => {
  const products = await getPublishedCatalog({ category: undefined, sale: false, query: "" });
  expect(products.every((product) => product.status === "published")).toBe(true);
});

it("maps an unknown slug to null rather than leaking a draft", async () => {
  await expect(getPublishedProductBySlug("unknown-or-draft")).resolves.toBeNull();
});
```

- [ ] **Step 2: Run focused tests and verify they fail before repository implementation**

Run: `npm run test:run -- src/lib/services/catalog-service.test.ts src/app/api/products/route.test.ts`  
Expected: FAIL because service/API modules are missing.

- [ ] **Step 3: Implement query normalization and public catalog services**

Use a typed filter input:

```ts
export type PublicCatalogFilters = {
  category?: string;
  sale?: boolean;
  query?: string;
  page?: number;
  limit?: number;
};
```

Public queries must include `{ status: "published", stockQuantity: { $gt: 0 } }`, limit `limit` to 1..48, escape text search safely, sort featured/sale/order/name deterministically, and serialize Mongoose documents to plain `CatalogProduct` values.

- [ ] **Step 4: Implement public Route Handlers and idempotent seed command**

`GET /api/products`, `GET /api/products/[slug]`, and `GET /api/categories` use the service layer only. Return 400 for malformed query strings and 404 for unknown public slugs. The seed script upserts all 12 current products and six categories by slug, has no auto-run import side effect, and reports created/updated counts without printing `MONGODB_URI`.

- [ ] **Step 5: Run public data verification**

Run:

```bash
npm run test:run -- src/lib/services/catalog-service.test.ts src/app/api/products/route.test.ts scripts/seed-catalog.test.ts
npm run typecheck
npm run build
```

Expected: only published/in-stock data reaches public endpoints; seed is repeatable.

## Task 4: Migrate the premium storefront into server-first Next.js pages and client feature islands

**Files:**
- Create: `src/components/storefront/StorefrontShell.tsx`, `src/components/storefront/StorefrontClient.tsx`, `src/components/storefront/ProductDetail.tsx`, `src/app/(store)/gullar/page.tsx`, `src/app/(store)/gullar/[slug]/page.tsx`, `src/app/(store)/not-found.tsx`
- Modify: existing `src/features/catalog/*`, `src/features/cart/*`, `src/features/layout/*`, `src/features/product/*`, `src/shared/*`, `src/app/globals.css`
- Test: `src/components/storefront/StorefrontClient.test.tsx`, `src/app/(store)/gullar/[slug]/page.test.tsx`

**Interfaces:**
- Consumes `CatalogProduct`, `getPublishedCatalog`, `getPublishedCategories`, and `getPublishedProductBySlug` from Task 3.
- Produces server-rendered catalog/detail markup and a client `StorefrontClient` that receives serializable product/category props.

- [ ] **Step 1: Write failing SSR/client-boundary tests**

```tsx
it("renders a product detail from server data with a stable slug URL", async () => {
  render(await ProductPage({ params: Promise.resolve({ slug: "qirmizi-atirgul-buketi" }) }));
  expect(screen.getByRole("heading", { name: /qirmizi atirgul buketi/i })).toBeVisible();
});

it("keeps favorites and cart in browser storage without serializing them into server props", async () => {
  render(<StorefrontClient products={products} categories={categories} />);
  await userEvent.click(screen.getByRole("button", { name: /sevimlilarga qo'shish/i }));
  expect(localStorage.getItem("nafis.favorites.v1")).toContain(products[0].id);
});
```

- [ ] **Step 2: Run focused tests and verify red state**

Run: `npm run test:run -- src/components/storefront/StorefrontClient.test.tsx src/app/(store)/gullar/[slug]/page.test.tsx`  
Expected: FAIL because the new server pages/client boundary do not exist.

- [ ] **Step 3: Split server data rendering from browser state**

`StorefrontShell` remains a Server Component and queries Task 3 services. `StorefrontClient` begins with `"use client"` and owns current filter UI, favorites, cart, quick-view, focus trap, and toast state. Preserve accessibility: real buttons, focus-visible CSS, Escape close, focus restoration, 40px touch targets, `inert` background for overlays, and no horizontal overflow at 375px.

- [ ] **Step 4: Implement canonical catalog and product routes**

Use `searchParams` to normalize `q`, `category`, `sale`, and `page` server-side. Product pages use `/gullar/[slug]`; unknown/draft/archived slugs call `notFound()`. Quick-view links include a real product-page fallback. Convert internal hash-only navigation to `next/link` routes where it represents navigation; retain in-page anchors only for actual same-page sections.

- [ ] **Step 5: Run storefront verification**

Run:

```bash
npm run test:run -- src/components/storefront/StorefrontClient.test.tsx src/app/(store)/gullar/[slug]/page.test.tsx
npm run typecheck
npm run build
```

Expected: public routes render with Mongo service fixtures; client cart/favorites remain functional and accessible.

## Task 5: Add complete SEO metadata, structured data, sitemap, and robots coverage

**Files:**
- Create: `src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/(store)/gullar/[slug]/opengraph-image.tsx`
- Modify: `src/app/layout.tsx`, `src/app/(store)/page.tsx`, `src/app/(store)/gullar/page.tsx`, `src/app/(store)/gullar/[slug]/page.tsx`, `next.config.ts`
- Test: `src/lib/seo.test.ts`, `src/app/sitemap.test.ts`, `src/app/robots.test.ts`

**Interfaces:**
- Produces `buildProductMetadata(product)`, `buildProductJsonLd(product, settings)`, `buildBreadcrumbJsonLd(items)`, `sitemap()`, and `robots()`.
- Tasks 9–10 call cache invalidation after mutations so Task 5’s pages and sitemap refresh.

- [ ] **Step 1: Write failing metadata and crawler tests**

```ts
it("builds canonical UZS Product JSON-LD only for a published product", () => {
  const jsonLd = buildProductJsonLd(product, settings);
  expect(jsonLd).toMatchObject({ "@type": "Product", offers: { priceCurrency: "UZS", availability: "https://schema.org/InStock" } });
});

it("excludes admin and API routes from robots", () => {
  expect(robots().rules).toEqual(expect.objectContaining({ disallow: expect.arrayContaining(["/admin/", "/api/"]) }));
});
```

- [ ] **Step 2: Run focused tests and record expected failure**

Run: `npm run test:run -- src/lib/seo.test.ts src/app/sitemap.test.ts src/app/robots.test.ts`  
Expected: FAIL because SEO modules do not exist.

- [ ] **Step 3: Implement root and dynamic product metadata**

Set `metadataBase` from `NEXT_PUBLIC_SITE_URL` in `src/app/layout.tsx`. Product `generateMetadata` must return title, description, canonical URL, Open Graph/Twitter images, and `robots: { index: true, follow: true }` only for published products. Render `Organization`/`LocalBusiness`, `WebSite`, `BreadcrumbList`, and Product/Offer JSON-LD with `application/ld+json` using serialized JSON that cannot contain a raw `</script>` substring.

- [ ] **Step 4: Implement sitemap, robots, and image metadata files**

`sitemap()` includes only home, public catalog, published categories, and published product URLs with `lastModified`; it omits drafts/archives/admin/API. `robots()` allows public routes and disallows `/admin/` and `/api/`. Generate a branded OG image with valid product title/price fallback so remote image failure does not break sharing.

- [ ] **Step 5: Run SEO verification**

Run:

```bash
npm run test:run -- src/lib/seo.test.ts src/app/sitemap.test.ts src/app/robots.test.ts
npm run typecheck
npm run build
```

Expected: metadata/sitemap/robots build successfully; no non-public product is indexable.

## Task 6: Implement transactional order creation, stock reservation, cancellation release, and database rate limiting

**Files:**
- Create: `src/lib/services/order-service.ts`, `src/lib/services/order-number.ts`, `src/lib/services/order-transitions.ts`, `src/lib/rate-limit.ts`
- Modify: `src/models/Order.ts`, `src/models/Product.ts`, `src/models/RateLimit.ts`, `src/lib/validations.ts`
- Test: `src/lib/services/order-service.test.ts`, `src/lib/rate-limit.test.ts`

**Interfaces:**
- Produces `createPendingOrder(input: CheckoutInput, context): Promise<OrderCreationResult>`, `transitionOrderStatus(orderId, nextStatus)`, and `assertRateLimit(key, policy)`.
- Task 7 exposes `createPendingOrder` publicly; Task 10 uses `transitionOrderStatus` in admin APIs.

- [ ] **Step 1: Write failing transaction and transition tests**

```ts
it("reserves stock and stores server-calculated snapshots in one transaction", async () => {
  const result = await createPendingOrder(checkoutInput, requestContext);
  expect(result.status).toBe("pending");
  expect(productRepository.getStock(productId)).resolves.toBe(7);
});

it("returns cancelled order stock exactly once", async () => {
  await transitionOrderStatus(orderId, "cancelled");
  await expect(transitionOrderStatus(orderId, "cancelled")).rejects.toThrow(/not allowed/i);
  expect(productRepository.incrementCalls(productId)).toBe(1);
});
```

- [ ] **Step 2: Run focused tests to establish red state**

Run: `npm run test:run -- src/lib/services/order-service.test.ts src/lib/rate-limit.test.ts`  
Expected: FAIL because order service/rate limiter modules do not exist.

- [ ] **Step 3: Implement validated transaction flow without parallel session operations**

Within `mongoose.connection.transaction(async (session) => { ... })`, process line items sequentially. For every item use a conditional update equivalent to:

```ts
const product = await Product.findOneAndUpdate(
  { _id: productId, status: "published", stockQuantity: { $gte: quantity } },
  { $inc: { stockQuantity: -quantity } },
  { new: true, session }
);
if (!product) throw new OutOfStockError(productId);
```

Read price/name/image only from the successful database product, create immutable line snapshots, calculate totals from settings, then create one `pending` unpaid order. No `Promise.all` runs inside the transaction.

- [ ] **Step 4: Implement status policy and Mongo-backed rate limit**

`transitionOrderStatus` validates `allowedOrderTransitions`, uses a conditional update to avoid concurrent duplicate state changes, and restores stock only when entering `cancelled` while `stockReleasedAt` is absent. `assertRateLimit` atomically increments a TTL `RateLimit` document keyed by endpoint/IP window, rejects excess attempts with a typed 429-safe error, and never persists full request bodies.

- [ ] **Step 5: Run transactional core verification**

Run:

```bash
npm run test:run -- src/lib/services/order-service.test.ts src/lib/rate-limit.test.ts
npm run typecheck
```

Expected: oversold/checksum/browser total attempts fail; stock and order snapshots remain consistent; cancellation restore is exactly once.

## Task 7: Expose guest checkout API, checkout UX, successful-order route, and optional notifications

**Files:**
- Create: `src/app/api/orders/route.ts`, `src/features/checkout/CheckoutForm.tsx`, `src/features/checkout/checkout-client.ts`, `src/app/(store)/buyurtma/page.tsx`, `src/app/(store)/buyurtma/muvaffaqiyatli/page.tsx`, `src/lib/services/notifications.ts`, `src/lib/services/email-notifier.ts`, `src/lib/services/telegram-notifier.ts`
- Modify: `src/features/cart/*`, `src/components/storefront/StorefrontClient.tsx`, `src/app/globals.css`
- Test: `src/app/api/orders/route.test.ts`, `src/features/checkout/CheckoutForm.test.tsx`, `src/lib/services/notifications.test.ts`

**Interfaces:**
- Consumes `CheckoutInput`, `createPendingOrder`, `assertRateLimit`, and cart state.
- Produces `POST /api/orders` response `{ orderId, orderNumber, total, status: "pending" }` and `CheckoutForm` success navigation.

- [ ] **Step 1: Write failing API and form tests**

```tsx
it("submits only product identifiers and quantities, then clears local cart on success", async () => {
  render(<CheckoutForm initialLines={[{ productId: "p1", quantity: 2 }]} />);
  await userEvent.click(screen.getByRole("button", { name: /buyurtmani yuborish/i }));
  expect(fetch).toHaveBeenCalledWith("/api/orders", expect.objectContaining({ method: "POST" }));
  expect(localStorage.getItem("nafis.cart.v1")).toBe("[]");
});

it("returns 409 for an out-of-stock server validation error", async () => {
  const response = await POST(orderRequest(outOfStockInput));
  expect(response.status).toBe(409);
});
```

- [ ] **Step 2: Run focused tests and verify red state**

Run: `npm run test:run -- src/app/api/orders/route.test.ts src/features/checkout/CheckoutForm.test.tsx src/lib/services/notifications.test.ts`  
Expected: FAIL because route/form/notifier modules do not exist.

- [ ] **Step 3: Implement safe `POST /api/orders` error mapping**

Parse JSON with `checkoutSchema`, call `assertRateLimit`, then `createPendingOrder`. Map validation to 400, stock conflict to 409, rate limit to 429, and unexpected server failures to 500 without revealing internals. Trigger notifications only after the transaction commits; a notification failure logs a sanitized server warning and does not roll back the created order.

- [ ] **Step 4: Implement guest checkout UX and truthful copy**

Require full name, Uzbek phone, address, delivery date optional, comment optional, and exactly the two in-person payment methods. Show no online payment control or claim. Disable submission while pending, surface field errors, preserve cart if submission fails, clear only the cart after 201, preserve favorites, then navigate to `/buyurtma/muvaffaqiyatli?order=<public-number>`.

- [ ] **Step 5: Run checkout verification**

Run:

```bash
npm run test:run -- src/app/api/orders/route.test.ts src/features/checkout/CheckoutForm.test.tsx src/lib/services/notifications.test.ts
npm run typecheck
npm run build
```

Expected: valid order becomes pending; client totals cannot be forged; no-payment copy remains truthful.

## Task 8: Add hashed credentials auth, admin route guard, and admin shell

**Files:**
- Create: `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/(protected)/layout.tsx`, `src/app/admin/(protected)/page.tsx`, `src/components/admin/AdminShell.tsx`, `src/components/admin/LoginForm.tsx`
- Modify: `src/app/layout.tsx`, `src/lib/env.ts`, `.env.example`
- Test: `src/auth.test.ts`, `src/app/admin/(protected)/layout.test.tsx`, `src/components/admin/LoginForm.test.tsx`

**Interfaces:**
- Produces `authOptions`, `requireAdmin()`, `AdminShell`, and an authenticated admin session containing `{ user: { id: "admin", role: "admin" } }`.
- Tasks 9–10 call `requireAdmin()` before any write or private read.

- [ ] **Step 1: Write failing credential and guard tests**

```ts
it("authorizes only a bcrypt-verified configured administrator", async () => {
  await expect(authorizeAdmin({ email: "admin@nafis.uz", password: "wrong" })).resolves.toBeNull();
  await expect(authorizeAdmin({ email: "admin@nafis.uz", password: "correct" })).resolves.toMatchObject({ role: "admin" });
});

it("redirects an anonymous visitor away from protected admin layout", async () => {
  await expect(renderProtectedLayoutWithoutSession()).rejects.toThrow(/redirect/i);
});
```

- [ ] **Step 2: Run focused tests and verify missing-auth failure**

Run: `npm run test:run -- src/auth.test.ts src/app/admin/(protected)/layout.test.tsx src/components/admin/LoginForm.test.tsx`  
Expected: FAIL because auth and protected routes do not exist.

- [ ] **Step 3: Implement credentials provider and server-side guard**

Use the stable NextAuth v4 App Router handler pattern used by the reference project:

```ts
export const authOptions: NextAuthOptions = {
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) { return authorizeAdmin(credentials); },
  })],
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  secret: env.NEXTAUTH_SECRET,
};

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") throw new UnauthorizedError();
  return session;
}
```

`src/app/api/auth/[...nextauth]/route.ts` exports `NextAuth(authOptions)` as `GET` and `POST`. `authorizeAdmin` compares normalized email and bcrypt hash, returns a role-bearing user only on success, and sleeps neither leaks nor logs the raw password. `requireAdmin()` calls `getServerSession(authOptions)` server-side and redirects/returns 401 before protected work occurs.

- [ ] **Step 4: Build the accessible admin shell and login form**

Provide navigation for Dashboard, Products, Categories, Orders, Settings, and Sign out. Login has labeled inputs, invalid credentials feedback without account enumeration, loading/disabled state, and no localStorage secret/session copy.

- [ ] **Step 5: Run auth/admin-shell verification**

Run:

```bash
npm run test:run -- src/auth.test.ts src/app/admin/(protected)/layout.test.tsx src/components/admin/LoginForm.test.tsx
npm run typecheck
npm run build
```

Expected: anonymous admin access is blocked; only valid hashed credentials create an admin session.

## Task 9: Implement admin category/product CRUD, Cloudinary upload, and public cache invalidation

**Files:**
- Create: `src/app/api/admin/products/route.ts`, `src/app/api/admin/products/[id]/route.ts`, `src/app/api/admin/categories/route.ts`, `src/app/api/admin/categories/[id]/route.ts`, `src/app/api/upload/route.ts`, `src/components/admin/ProductForm.tsx`, `src/components/admin/CategoryForm.tsx`, `src/components/admin/ImageUploader.tsx`, `src/app/admin/(protected)/products/page.tsx`, `src/app/admin/(protected)/products/new/page.tsx`, `src/app/admin/(protected)/products/[id]/page.tsx`, `src/app/admin/(protected)/categories/page.tsx`
- Modify: `src/lib/cache.ts`, `src/lib/validations.ts`, `next.config.ts`
- Test: `src/app/api/admin/products/route.test.ts`, `src/app/api/upload/route.test.ts`, `src/components/admin/ProductForm.test.tsx`

**Interfaces:**
- Consumes `requireAdmin`, product/category schemas, Cloudinary server credentials, catalog repository, and `revalidateCatalogPaths()`.
- Produces authorized CRUD endpoints and form components that submit valid product/category data.

- [ ] **Step 1: Write failing authorization, validation, and upload tests**

```ts
it("rejects anonymous product writes before parsing body", async () => {
  await expect(POST(anonymousJsonRequest(validProduct))).resolves.toMatchObject({ status: 401 });
});

it("rejects a non-image upload and accepts a bounded JPEG only for admin", async () => {
  expect((await POST(adminFormRequest("text/plain"))).status).toBe(400);
  expect((await POST(adminImageRequest("image/jpeg"))).status).toBe(201);
});
```

- [ ] **Step 2: Run focused tests and verify red state**

Run: `npm run test:run -- src/app/api/admin/products/route.test.ts src/app/api/upload/route.test.ts src/components/admin/ProductForm.test.tsx`  
Expected: FAIL because admin CRUD/upload modules do not exist.

- [ ] **Step 3: Implement product/category write handlers**

All handlers call `requireAdmin()` first, Zod-parse bodies, reject duplicate slugs with 409, keep product image alt text required, and invoke:

```ts
export function revalidateCatalogPaths(slug?: string) {
  revalidatePath("/");
  revalidatePath("/gullar");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/gullar/${slug}`);
}
```

Use archive status rather than deleting a product referenced by orders. Category deletion rejects when products still reference it.

- [ ] **Step 4: Implement secure Cloudinary upload path and forms**

Accept only admin multipart uploads with MIME `image/jpeg`, `image/png`, or `image/webp`, a 5 MB limit, decoded file presence, and server-generated Cloudinary folder `nafis-products`. Return `{ url, publicId, alt }`; never return API secret. `ImageUploader` requires alt text before a product form can save and announces success/failure accessibly.

- [ ] **Step 5: Run catalog-admin verification**

Run:

```bash
npm run test:run -- src/app/api/admin/products/route.test.ts src/app/api/upload/route.test.ts src/components/admin/ProductForm.test.tsx
npm run typecheck
npm run build
```

Expected: authorized CRUD updates public data after revalidation; anonymous write/upload attempts fail.

## Task 10: Implement admin order/settings workflows and state-safe cache updates

**Files:**
- Create: `src/app/api/admin/orders/route.ts`, `src/app/api/admin/orders/[id]/route.ts`, `src/app/api/admin/settings/route.ts`, `src/components/admin/OrderStatusForm.tsx`, `src/components/admin/SettingsForm.tsx`, `src/app/admin/(protected)/orders/page.tsx`, `src/app/admin/(protected)/orders/[id]/page.tsx`, `src/app/admin/(protected)/settings/page.tsx`
- Modify: `src/lib/services/order-service.ts`, `src/lib/cache.ts`, `src/lib/validations.ts`, `src/app/admin/(protected)/page.tsx`
- Test: `src/app/api/admin/orders/[id]/route.test.ts`, `src/app/api/admin/settings/route.test.ts`, `src/components/admin/OrderStatusForm.test.tsx`

**Interfaces:**
- Consumes `requireAdmin`, `transitionOrderStatus`, `settingsSchema`, `revalidateCatalogPaths`, and `SiteSettings`.
- Produces paginated admin order read/update APIs and singleton settings management.

- [ ] **Step 1: Write failing order-transition/settings tests**

```ts
it("permits only the configured order transition and returns stock on cancellation once", async () => {
  expect((await PATCH(adminOrderRequest(orderId, "confirmed"))).status).toBe(200);
  expect((await PATCH(adminOrderRequest(orderId, "delivered"))).status).toBe(409);
});

it("upserts one validated site settings document for admin only", async () => {
  expect((await PATCH(adminSettingsRequest(settings))).status).toBe(200);
  expect(await SiteSettings.countDocuments()).toBe(1);
});
```

- [ ] **Step 2: Run focused tests and verify red state**

Run: `npm run test:run -- src/app/api/admin/orders/[id]/route.test.ts src/app/api/admin/settings/route.test.ts src/components/admin/OrderStatusForm.test.tsx`  
Expected: FAIL because admin order/settings modules do not exist.

- [ ] **Step 3: Implement order list/detail/status routes**

Support page/limit/status filters capped to safe bounds. Return order snapshots, not live product price fields. PATCH accepts only `{ status: OrderStatus }`, calls `transitionOrderStatus`, maps illegal transitions to 409, and maps a missing order to 404. Order status controls display previous/current state and disable unavailable actions.

- [ ] **Step 4: Implement singleton settings and dashboard signals**

Settings PATCH is admin-only and Zod-validated. It upserts singleton settings, then revalidates all affected public pages/metadata. Dashboard renders pending orders, low-stock product count, and recent orders with server queries; it does not expose full customer address outside the protected layout.

- [ ] **Step 5: Run orders/settings verification**

Run:

```bash
npm run test:run -- src/app/api/admin/orders/[id]/route.test.ts src/app/api/admin/settings/route.test.ts src/components/admin/OrderStatusForm.test.tsx
npm run typecheck
npm run build
```

Expected: only allowed transitions work; cancellation cannot double-return stock; settings remain singleton.

## Task 11: Add cross-cutting resilience, direct-route browser coverage, and production documentation

**Files:**
- Create: `playwright.config.ts`, `e2e/storefront.spec.ts`, `e2e/admin.spec.ts`, `e2e/checkout.spec.ts`, `docs/operations/nafis-environment.md`
- Modify: `README.md`, `.env.example`, `src/app/error.tsx`, `src/app/(store)/gullar/[slug]/loading.tsx`, `src/app/(store)/gullar/[slug]/error.tsx`, `src/app/admin/(protected)/error.tsx`
- Test: existing unit suite plus Playwright specs

**Interfaces:**
- Consumes all public/admin routes and existing environment keys.
- Produces reproducible setup, browser QA, configuration, backup, and failure behavior documentation.

- [ ] **Step 1: Write failing end-to-end acceptance specs**

```ts
test("published product has canonical metadata and guest checkout creates pending order", async ({ page }) => {
  await page.goto("/gullar/qirmizi-atirgul-buketi");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/gullar\/qirmizi-atirgul-buketi$/);
  await page.getByRole("button", { name: /savatga qo'shish/i }).click();
  await page.goto("/buyurtma");
  await page.getByRole("button", { name: /buyurtmani yuborish/i }).click();
  await expect(page).toHaveURL(/\/buyurtma\/muvaffaqiyatli\?order=/);
});
```

- [ ] **Step 2: Run E2E specs and verify the expected pre-configuration failure**

Run: `npx playwright test`  
Expected before test environment setup: failure that documents missing MongoDB/Cloudinary/auth test configuration rather than a false green run.

- [ ] **Step 3: Configure deterministic test environment and error boundaries**

Use a dedicated test MongoDB URI or explicit in-memory repository adapter; never point test cleanup at a production URI. Add graceful public/server error boundaries with a retry action that does not leak stack traces. Document seed, configuration validation, deployment domain, Cloudinary setup, SMTP/Telegram optional behavior, MongoDB Atlas backup/index checks, and how to generate a bcrypt hash.

- [ ] **Step 4: Implement browser acceptance checks**

E2E must cover direct product slug rendering, sitemap/robots output, query filter URL state, cart/favorite persistence, checkout validation/success/out-of-stock conflict, admin unauthenticated redirect, authorized product create/update/archive, order status transition, 1440/768/375 viewport no-overflow screenshots, keyboard focus trap, and no online-payment language.

- [ ] **Step 5: Run final verification suite**

Run:

```bash
npm run test:run
npm run typecheck
npm run lint
npm run build
npx playwright test
```

Expected: all unit/integration/E2E tests pass against the dedicated test environment; build emits a production Next.js bundle; README supports a fresh local setup.

## Plan Self-Review

### Spec coverage

| Spec requirement | Covered by |
| --- | --- |
| Next.js App Router migration | Task 1 and Task 4 |
| MongoDB cache, schemas, indexes | Task 2 |
| Seed current catalog and public APIs | Task 3 |
| Storefront, quick-view, cart, favorites | Task 4 |
| SEO metadata, JSON-LD, sitemap, robots | Task 5 |
| Guest pending checkout and atomic stock | Tasks 6–7 |
| Admin hashed credentials and guard | Task 8 |
| Product/category/admin image CRUD | Task 9 |
| Admin order/status/settings workflow | Task 10 |
| Rate limit, notifications, error handling, docs, E2E | Tasks 6–7 and Task 11 |
| No Payme/Click claim or integration | Global constraints, Tasks 7 and 11 |

### Implementation consistency

- `CheckoutInput`, `OrderCreationResult`, order-status values, product image fields, and catalog types are defined once in Task 2 and reused by every subsequent task.
- Task 6 is the only owner of stock reservation/cancellation semantics; public/admin endpoints call its services rather than duplicate mutations.
- Task 3 public reads and Task 9–10 revalidation share `CATALOG_CACHE_TAGS` and `revalidateCatalogPaths`.
- No task assumes a Git repository, a payment provider, or browser access to server-only secrets.

### Placeholder scan result

The plan contains no deferred implementation markers; each task names exact files, contracts, failure tests, commands, and expected outcome.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-11-nafis-nextjs-mongodb-commerce.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
