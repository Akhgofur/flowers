# Nafis Flowers Multilingual Premium Vercel Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Nafis Flowers as a Russian-default, Russian/Uzbek/English, SEO-optimized premium Next.js storefront with English route segments, multilingual MongoDB content management, a rectangular product-card design, GitHub source control, and a fully functional Vercel production deployment.

**Architecture:** `next-intl` owns locale-prefixed routing and UI dictionaries; the App Router exposes `/ru`, `/uz`, and `/en` storefront trees while admin and API routes remain locale-independent. MongoDB stores field-level `ru/uz/en` translations for products, categories, and visible settings; repositories flatten only the requested locale into public DTOs. Git is initialized before feature work for rollback, while GitHub/Vercel publication happens only after fresh automated and real-browser verification.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript 5.9 strict, `next-intl` 4.13, Mongoose 9/MongoDB replica set, NextAuth 4, Zod 4, Vitest/Testing Library, Next Font (`Prata` + `Manrope`), GitHub, Vercel.

## Global Constraints

- Supported locales are exactly `ru`, `uz`, and `en`; `ru` is the default.
- Locale prefixes are always present in public URLs: `/ru`, `/uz`, `/en`.
- Public page segments are English only: `catalog`, `products`, `checkout`.
- Stable product/category slugs remain lowercase English URL-safe values and do not change per locale.
- Admin and API routes remain locale-independent and keep their current English pathnames.
- All public UI strings, product/category content, checkout copy, metadata, and JSON-LD must be localized.
- Admin chrome remains Uzbek; product/category/settings content editors must require `ru/uz/en` content.
- Payme, Click, and online payment claims remain out of scope.
- Product card imagery must be rectangular `4 / 5`, never arch/oval, with 44 px minimum action targets.
- Use Server Components for data/SEO and Client Components only for browser state/events.
- Production never treats bootstrap data as live inventory; Vercel requires a reachable Atlas replica-set URI.
- `.env.local`, `.vercel`, `.next`, `dist`, coverage, browser artifacts, and secrets must never enter Git.
- Read relevant guides under `node_modules/next/dist/docs/` before changing Next.js APIs; the routing, Proxy, redirect, font, metadata, and sitemap guides are the governing local references.
- Every implementation task follows RED → GREEN → REFACTOR and ends with focused verification plus a scoped commit.

---

## Target File Structure

```text
messages/
  ru.json
  uz.json
  en.json
scripts/
  seed-catalog.ts
src/
  app/
    (root)/
      layout.tsx
      page.tsx
    (store)/
      [locale]/
        layout.tsx
        page.tsx
        catalog/page.tsx
        products/[slug]/page.tsx
        products/[slug]/loading.tsx
        products/[slug]/error.tsx
        products/[slug]/opengraph-image.tsx
        checkout/page.tsx
        not-found.tsx
    admin/
      layout.tsx
      login/**
      (dashboard)/**
    api/**
    global-not-found.tsx
    robots.ts
    sitemap.ts
    globals.css
    styles.css
  components/
    admin/**
    checkout/CheckoutClient.tsx
    storefront/
      LanguageSwitcher.tsx
      ProductDetail.tsx
      StorefrontClient.tsx
      StorefrontShell.tsx
      storefront-mappers.ts
  features/**
  i18n/
    config.ts
    navigation.ts
    request.ts
    routing.ts
    types.d.ts
  lib/
    contracts.ts
    locale-content.ts
    repositories/**
    services/**
    seo.ts
    validations.ts
  models/**
  shared/**
  proxy.ts
  test/render-with-intl.tsx
```

---

### Task 1: Establish secret-safe Git baseline and Next 16 locale routing

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`, `package-lock.json`, `next.config.ts`
- Create: `messages/ru.json`, `messages/uz.json`, `messages/en.json`
- Create: `src/i18n/config.ts`, `src/i18n/routing.ts`, `src/i18n/navigation.ts`, `src/i18n/request.ts`, `src/i18n/types.d.ts`
- Create: `src/i18n/config.test.ts`, `src/i18n/messages.test.ts`
- Create: `src/proxy.ts`
- Create: `src/app/(root)/layout.tsx`, `src/app/(root)/page.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/global-not-found.tsx`; move/delete the current orphan-prone `src/app/error.tsx` after segment error boundaries exist
- Create: `src/app/(store)/[locale]/error.tsx`; retain `src/app/admin/(dashboard)/error.tsx` for admin failures
- Create/move with `apply_patch`: every route currently under `src/app/(store)` into `src/app/(store)/[locale]` with `gullar -> catalog`, `gullar/[slug] -> products/[slug]`, and `buyurtma -> checkout`
- Delete after new roots compile: `src/app/layout.tsx`, old `src/app/(store)/**`
- Update tests: public page tests at their new locale paths

**Interfaces:**
- Produces `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `isLocale(value)`, `routing`, locale-aware `Link`, `redirect`, `usePathname`, and `useRouter`.
- Produces public route tree `/{locale}`, `/{locale}/catalog`, `/{locale}/products/{slug}`, `/{locale}/checkout`.
- Later tasks import locale types only from `@/i18n/config`.

- [ ] **Step 1: Extend ignore rules and create a baseline repository**

Add these exact ignore entries without removing current secret rules:

```gitignore
# Local tooling and deploy state
.vercel/
.superpowers/
dist/
coverage/
playwright-report/
test-results/
*.tsbuildinfo
*.log
```

Run:

```powershell
git init --initial-branch=main
git check-ignore .env.local
git status --ignored --short
```

Expected: `.env.local`, `.next`, `node_modules`, `dist`, `.superpowers`, and `tsconfig.tsbuildinfo` are ignored. If any secret-bearing path is staged, stop and fix `.gitignore` before committing.

Then create the baseline:

```powershell
git add .
git diff --cached --check
git diff --cached --name-only
git commit -m "chore: establish Nafis Flowers baseline"
```

Expected: baseline commit contains source/config/docs but no `.env*` secret file except `.env.example`.

- [ ] **Step 2: Install the pinned i18n dependency**

Run:

```powershell
npm install next-intl@4.13.4
```

Expected: `package.json` and `package-lock.json` record `next-intl` 4.13.4-compatible resolution; no unrelated package upgrade is introduced.

- [ ] **Step 3: Write failing locale/config/message parity tests**

Create `src/i18n/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "./config";

describe("locale configuration", () => {
  it("uses Russian as the explicit default among exactly three locales", () => {
    expect(LOCALES).toEqual(["ru", "uz", "en"]);
    expect(DEFAULT_LOCALE).toBe("ru");
  });

  it.each(["ru", "uz", "en"])("accepts %s", (locale) => {
    expect(isLocale(locale)).toBe(true);
  });

  it.each([undefined, "", "gullar", "de", "RU"])("rejects %s", (locale) => {
    expect(isLocale(locale)).toBe(false);
  });
});
```

Create `src/i18n/messages.test.ts` with a recursive key collector and assert that `ru`, `uz`, and `en` have identical leaf paths and non-empty string values. Initial JSON must contain at least these namespaces so the test contract is stable: `Metadata`, `Header`, `Hero`, `Catalog`, `Product`, `Cart`, `Checkout`, `Footer`, `Errors`.

- [ ] **Step 4: Run the focused tests and record RED**

Run:

```powershell
npm run test:run -- src/i18n/config.test.ts src/i18n/messages.test.ts
```

Expected: FAIL because the i18n modules/message catalogs do not exist.

- [ ] **Step 5: Implement typed next-intl configuration**

Create `src/i18n/config.ts`:

```ts
export const LOCALES = ["ru", "uz", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}
```

Create `src/i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "./config";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeDetection: false,
});
```

Create `src/i18n/navigation.ts`:

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

Create `src/i18n/request.ts`:

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  if (!hasLocale(routing.locales, locale)) notFound();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

Type-augment `next-intl` in `src/i18n/types.d.ts` using `Locale` and `typeof import("../../messages/ru.json")` so invalid locale/message keys fail TypeScript.

- [ ] **Step 6: Configure the Next plugin, legacy redirects, and Proxy**

Wrap `next.config.ts` with `createNextIntlPlugin("./src/i18n/request.ts")`. Preserve all existing image hosts, enable `experimental.globalNotFound: true` for the multiple-root-layout topology, and add redirects:

```ts
async redirects() {
  return [
    { source: "/gullar", destination: "/ru/catalog", permanent: true },
    { source: "/gullar/:slug", destination: "/ru/products/:slug", permanent: true },
    { source: "/buyurtma", destination: "/ru/checkout", permanent: true },
  ];
}
```

Create `src/proxy.ts`:

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
```

This explicitly excludes auth/admin/API/static assets from locale rewriting.

- [ ] **Step 7: Create multiple root layouts and relocate storefront routes**

`src/app/(store)/[locale]/layout.tsx` must:

```tsx
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { ReactNode } from "react";
import "@/app/globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StoreLocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`src/app/(root)/page.tsx` uses `permanentRedirect("/ru")` as a no-Proxy fallback. `src/app/admin/layout.tsx` becomes the admin root `<html lang="uz">` and preserves existing auth/session behavior below it. Route page props now include `params: Promise<{locale: string}>`; Task 2 threads that validated locale into catalog/settings services when their signatures become locale-aware.

Create `src/app/global-not-found.tsx` as a complete `<html lang="ru"><body>...</body></html>` document importing global styles, with Russian default 404 copy and links to `/ru`. Replace the current top-level `src/app/error.tsx` with segment-specific storefront/admin error boundaries so no file depends on the removed top-level layout.

- [ ] **Step 8: Update links and route tests only enough for the new route tree to compile**

Replace public `next/link` imports with `@/i18n/navigation` where a component is under the locale provider. Use internal hrefs without locale prefixes (`/catalog`, `/products/${slug}`, `/checkout`) because next-intl adds the active locale. Do not translate visible copy in this task; Task 4 owns copy.

Update public page tests to call route components with `params: Promise.resolve({locale: "ru"})` and assert no public source route still imports `/gullar` or `/buyurtma`.

- [ ] **Step 9: Run GREEN gates and commit**

Run:

```powershell
npm run test:run -- src/i18n/config.test.ts src/i18n/messages.test.ts "src/app/(store)/[locale]/page.test.tsx" "src/app/(store)/[locale]/products/[slug]/page.test.tsx"
npm run typecheck
npm run build
```

Expected: focused tests, typecheck, and Next production build pass; build route table shows `/{locale}`, `/{locale}/catalog`, `/{locale}/products/[slug]`, and `/{locale}/checkout`.

Commit:

```powershell
git add .gitignore package.json package-lock.json next.config.ts messages src/i18n src/proxy.ts src/app
git diff --cached --check
git commit -m "feat: add Russian-default locale routing"
```

---

### Task 2: Add multilingual Mongo contracts, schemas, repositories, and seed data

**Files:**
- Modify: `src/lib/contracts.ts`, `src/lib/validations.ts`, `src/models/Product.ts`, `src/models/Category.ts`
- Create: `src/lib/locale-content.ts`
- Modify: `src/lib/repositories/catalog-repository.ts`, `src/lib/repositories/admin-repository.ts`
- Modify: `src/lib/services/catalog-service.ts`, `src/lib/cache.ts`, `src/components/storefront/storefront-mappers.ts`, `src/components/storefront/StorefrontShell.tsx`
- Modify: `src/app/api/products/route.ts`, `src/app/api/products/route.test.ts`, `src/app/api/products/[slug]/route.ts`
- Create: `src/app/api/products/[slug]/route.test.ts`, `src/app/api/categories/route.test.ts`
- Modify: `src/app/api/categories/route.ts`
- Modify: `src/data/catalog.ts`, `scripts/seed-catalog.ts`
- Modify tests: `src/lib/validations.test.ts`, `src/models/models.test.ts`, `src/lib/services/catalog-service.test.ts`, `src/data/catalog.test.ts`, `scripts/seed-catalog.test.ts`
- Create: `src/lib/locale-content.test.ts`

**Interfaces:**
- Produces `Localized<T>`, `ProductTranslation`, `CategoryTranslation`, `SiteSettingsTranslation`.
- Produces `resolveProductTranslation(document, locale)` and `resolveCategoryTranslation(document, locale)` with migration-only legacy RU fallback.
- Changes catalog service signatures to `getPublishedCatalog(locale, filters)`, `getPublishedProductBySlug(locale, slug)`, and `getPublishedCategories(locale)`.
- Public `CatalogProduct`/`CatalogCategory` stay flat and localized; admin DTOs expose full `translations` objects.

- [ ] **Step 1: Write RED validation and resolver tests**

Add assertions equivalent to:

```ts
const translations = {
  ru: { name: "Розы", shortDescription: "Свежие розы", description: "Описание", composition: ["25 роз"] },
  uz: { name: "Atirgullar", shortDescription: "Yangi atirgullar", description: "Tavsif", composition: ["25 atirgul"] },
  en: { name: "Roses", shortDescription: "Fresh roses", description: "Description", composition: ["25 roses"] },
};

it("requires all product locales", () => {
  expect(() => productInputSchema.parse(validProduct({ translations: { ru: translations.ru } }))).toThrow();
});

it("resolves only the requested locale", () => {
  expect(resolveProductTranslation({ translations } as never, "en").name).toBe("Roses");
});
```

Add model tests proving all three subdocuments are required and stable `slug` remains unique/lowercase.

- [ ] **Step 2: Run RED**

Run:

```powershell
npm run test:run -- src/lib/locale-content.test.ts src/lib/validations.test.ts src/models/models.test.ts
```

Expected: FAIL because translation contracts/schemas/resolvers are absent.

- [ ] **Step 3: Define exact translation contracts**

Add to `src/lib/contracts.ts`:

```ts
import type { Locale } from "@/i18n/config";

export type Localized<T> = Record<Locale, T>;

export type ProductTranslation = {
  name: string;
  shortDescription: string;
  description: string;
  composition: string[];
  deliveryEstimate?: string;
  size?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type CategoryTranslation = {
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
};
```

Replace top-level localized fields in `AdminProduct` and `AdminCategory` with `translations: Localized<...>`. Keep `CatalogProduct` and `CatalogCategory` flat so only the requested locale crosses the server/client boundary.

- [ ] **Step 4: Implement Zod and Mongoose translation sub-schemas**

Create one strict `productTranslationInputSchema` and one `categoryTranslationInputSchema`; compose them as:

```ts
const localizedProductSchema = z.object({
  ru: productTranslationInputSchema,
  uz: productTranslationInputSchema,
  en: productTranslationInputSchema,
}).strict();
```

Mirror the same required shape in Mongoose `_id: false` sub-schemas. Keep price, stock, images, category, flags, and stable slug language-neutral. Replace the obsolete text index with indexes used by status/category/sale and sort; repository search uses escaped locale field regex for this small catalog.

- [ ] **Step 5: Implement locale resolution and repository projection**

`src/lib/locale-content.ts` must select `translations[locale]`, then `translations.ru`, then the legacy top-level RU record only during migration. It returns `null` when required name/description/composition data is incomplete.

Change repository signatures:

```ts
export async function findPublishedCatalogProducts(
  locale: Locale,
  filters: NormalizedPublicCatalogFilters
): Promise<CatalogProduct[]>;

export async function findPublishedProductBySlug(
  locale: Locale,
  slug: string
): Promise<CatalogProduct | null>;

export async function findPublishedCategories(
  locale: Locale
): Promise<CatalogCategory[]>;
```

The search `$or` covers `translations.ru`, `translations.uz`, and `translations.en` for `name`, `shortDescription`, `description`, and `composition`; locale is an enum, not raw user input. Sort uses `translations.${locale}.name` after featured/sale/sort-order fields.

Public API reads accept an optional validated `locale` query parameter and default to `ru`. Invalid locale returns 400 rather than reaching a dynamic Mongo field. `/api/products/[slug]` follows the same rule.

- [ ] **Step 6: Make catalog caches locale-aware**

Pass locale as the first cached argument in all public catalog readers. A cached RU DTO must never be returned for an EN request. Update `StorefrontShell` and product pages to pass route locale into services and bootstrap mappers.

- [ ] **Step 7: Translate the authoritative seed records**

Reshape every one of the existing 12 `PRODUCTS` and 6 `CATEGORIES` records to contain complete `ru`, `uz`, and `en` translations while keeping existing IDs/slugs, images, prices, stock flags, categories, flower tokens, and colors. Russian wording is customer-facing and default; Uzbek keeps the current natural copy; English uses concise florist terminology.

Update `scripts/seed-catalog.ts` to upsert by stable slug and `$set` the full translation record. Its completion path must close the Mongoose connection in `finally`, fixing the already-known CLI hang without changing seed idempotency.

- [ ] **Step 8: Run GREEN and seed the local replica set**

Run:

```powershell
npm run test:run -- src/lib/locale-content.test.ts src/lib/validations.test.ts src/models/models.test.ts src/lib/services/catalog-service.test.ts src/app/api/products/route.test.ts "src/app/api/products/[slug]/route.test.ts" src/app/api/categories/route.test.ts src/data/catalog.test.ts scripts/seed-catalog.test.ts
npm run typecheck
npm run seed:catalog
```

Expected: tests/typecheck pass; seed exits on its own with code 0; Mongo contains 12 products and 6 categories, each with non-empty `translations.ru`, `.uz`, and `.en`.

- [ ] **Step 9: Commit**

```powershell
git add src/lib src/models src/data src/components/storefront scripts
git diff --cached --check
git commit -m "feat: localize catalog data in MongoDB"
```

---

### Task 3: Add three-language admin editors for products, categories, and settings

**Files:**
- Modify: `src/models/SiteSettings.ts`, `src/lib/contracts.ts`, `src/lib/validations.ts`
- Modify: `src/lib/repositories/admin-repository.ts`, `src/lib/services/admin-service.ts`, `src/lib/services/public-settings-service.ts`
- Modify: `src/lib/cache.ts`, `scripts/seed-catalog.ts`, `scripts/seed-catalog.test.ts`
- Modify: `src/components/admin/AdminProductsPanel.tsx`, `AdminCategoriesPanel.tsx`, `AdminSettingsPanel.tsx`
- Modify: `src/app/api/admin/products/route.ts`, `src/app/api/admin/products/[id]/route.ts`
- Modify: `src/app/api/admin/categories/route.ts`, `src/app/api/admin/categories/[id]/route.ts`, `src/app/api/admin/settings/route.ts`
- Create tests: `src/components/admin/AdminProductsPanel.test.tsx`, `AdminCategoriesPanel.test.tsx`, `AdminSettingsPanel.test.tsx`
- Modify tests: `src/app/api/admin/products/route.test.ts`, `src/lib/validations.test.ts`, `src/models/models.test.ts`

**Interfaces:**
- Admin product/category payloads require `translations: {ru, uz, en}`.
- Site settings expose universal operational fields plus `translations: Localized<SiteSettingsTranslation>`.
- `getPublicSiteSettings(locale)` returns one flat localized public settings DTO.

- [ ] **Step 1: Write failing admin editor tests**

Test the product form renders locale tabs named `Русский`, `O‘zbekcha`, `English`; switching tabs retains independent values; submit is rejected when EN name/description/composition is missing. Category and settings tests assert the same isolated draft behavior.

Use this test shape:

```tsx
await user.click(screen.getByRole("button", { name: "English" }));
await user.type(screen.getByLabelText("Mahsulot nomi"), "Scarlet rose bouquet");
await user.click(screen.getByRole("button", { name: "Русский" }));
expect(screen.getByLabelText("Mahsulot nomi")).not.toHaveValue("Scarlet rose bouquet");
```

- [ ] **Step 2: Run RED**

```powershell
npm run test:run -- src/components/admin/AdminProductsPanel.test.tsx src/components/admin/AdminCategoriesPanel.test.tsx src/components/admin/AdminSettingsPanel.test.tsx src/app/api/admin/products/route.test.ts
```

Expected: FAIL because locale tabs and translated payloads are not implemented.

- [ ] **Step 3: Add reusable locale draft primitives**

Inside each panel keep `activeLocale: Locale` and a typed record:

```ts
const LOCALE_LABELS: Record<Locale, string> = {
  ru: "Русский",
  uz: "O‘zbekcha",
  en: "English",
};

type ProductTranslationDraft = Record<keyof ProductTranslation, string>;
type ProductDraft = {
  slug: string;
  translations: Record<Locale, ProductTranslationDraft>;
  categoryId: string;
  price: string;
  originalPrice: string;
  stockQuantity: string;
  sortOrder: string;
  imageUrl: string;
  imageAlt: string;
  imagePublicId: string;
  flowerTypes: string;
  colors: string;
  status: ProductStatus;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
};
```

Update only `draft.translations[activeLocale][field]` on localized field edits. Locale switch buttons use `aria-pressed`; errors identify locale and field, for example `English: mahsulot nomini kiriting.`

- [ ] **Step 4: Implement multilingual SiteSettings**

Store `siteDescription`, `deliveryPolicy`, `seoTitle`, and `seoDescription` under `translations.ru/uz/en`. Keep `siteName`, phone, email, address, working hours, delivery fee, and social URLs universal. `getPublicSiteSettings(locale)` resolves a flat localized DTO for storefront compatibility.

Extend the seed store with a `seedSettingsIfMissing` operation that uses `$setOnInsert` for complete RU/UZ/EN default settings. It must not overwrite phone, fee, address, or translated copy already edited by an operator.

- [ ] **Step 5: Update strict API validation and repository serializers**

Admin POST/PATCH handlers continue rejecting unknown fields. Serializers return full translation records to admin and only localized flat records to public consumers. Cache invalidation remains tag-based and invalidates all locales after any product/category/settings mutation.

- [ ] **Step 6: Run GREEN and verify one local admin edit**

```powershell
npm run test:run -- src/components/admin/AdminProductsPanel.test.tsx src/components/admin/AdminCategoriesPanel.test.tsx src/components/admin/AdminSettingsPanel.test.tsx src/app/api/admin/products/route.test.ts src/lib/validations.test.ts src/models/models.test.ts scripts/seed-catalog.test.ts
npm run typecheck
npm run seed:catalog
```

Then open local `/admin/products`, edit one seeded product in all three locale tabs, save, reload, and verify all tab values persist. Restore the seeded values by rerunning the idempotent seed.

- [ ] **Step 7: Commit**

```powershell
git add src/models/SiteSettings.ts src/lib src/components/admin src/app/api/admin
git diff --cached --check
git commit -m "feat: add multilingual catalog editors"
```

---

### Task 4: Localize every storefront interaction and add a route-preserving language switcher

**Files:**
- Complete: `messages/ru.json`, `messages/uz.json`, `messages/en.json`
- Create: `src/test/render-with-intl.tsx`
- Create: `src/components/storefront/LanguageSwitcher.tsx`, `LanguageSwitcher.test.tsx`
- Modify: `src/app/App.tsx`, `src/components/storefront/StorefrontClient.tsx`, `ProductDetail.tsx`
- Modify: `src/features/layout/Header.tsx`, `HeroCarousel.tsx`, `CategoryStrip.tsx`, `PromoBanner.tsx`, `Footer.tsx`
- Modify: `src/features/catalog/CatalogFilters.tsx`, `CatalogGrid.tsx`
- Modify: `src/features/cart/CartDrawer.tsx`
- Modify: `src/features/product/FavoriteButton.tsx`, `ProductQuickView.tsx`
- Modify: `src/shared/format.ts`, `src/shared/format.test.ts`, `src/data/catalog.ts`, `src/shared/types.ts`
- Modify tests: `src/app/App.test.tsx`, `src/components/storefront/StorefrontClient.test.tsx`, `src/features/layout/HeroCarousel.ssr.test.tsx`

**Interfaces:**
- All client components consume `useTranslations`, `useLocale`, and `useFormatter` from `next-intl` rather than localized props where possible.
- `LanguageSwitcher` changes locale while preserving pathname, query, and hash.
- `formatSum(value, locale)` formats UZS using `ru-RU`, `uz-UZ`, or `en-US` conventions.

- [ ] **Step 1: Add a deterministic intl test renderer and RED tests**

`renderWithIntl(ui, locale)` wraps the UI in `NextIntlClientProvider` using the matching JSON catalog. Add tests that assert:

- RU header contains `Каталог`, `Скидки`, `Доставка`;
- UZ header contains `Katalog`, `Chegirmalar`, `Yetkazib berish`;
- EN header contains `Catalog`, `Sale`, `Delivery`;
- cart/favorite/quick-view accessible names switch language;
- ICU result count handles RU `1 результат`, `2 результата`, `5 результатов`;
- no raw message key is rendered.

- [ ] **Step 2: Run RED**

```powershell
npm run test:run -- src/components/storefront/LanguageSwitcher.test.tsx src/app/App.test.tsx src/shared/format.test.ts
```

Expected: FAIL on hardcoded Uzbek copy and missing switcher.

- [ ] **Step 3: Complete message catalogs with strict key parity**

Use these namespaces and responsibilities:

```text
Metadata: home/catalog/product/checkout titles and descriptions
Header: utility, nav, search, about, cart, menu, locale names
Hero: three slide eyebrow/title/description/CTA, sale ribbon
Categories: heading, count, selection status
Promo: gift copy and CTA
Catalog: heading, tabs, result plural, filter labels/options, actions, empty state
Product: badges, view/add/favorite, quick view, detail, composition, delivery, size
Cart: heading, empty, quantity/remove/subtotal/checkout/continue
Checkout: fields, payment methods, summary, submit/success/error states
Footer: sections, contact, policies, copyright, assurances
Errors: notFound, configuration, generic retry
```

Russian is the editorial source/default. Uzbek uses Latin script and natural apostrophes. English copy is concise and does not transliterate Russian/Uzbek flower names when an established English term exists.

- [ ] **Step 4: Implement locale-aware formatting**

Replace the current fixed formatter with:

```ts
const NUMBER_LOCALES: Record<Locale, string> = {
  ru: "ru-RU",
  uz: "uz-UZ",
  en: "en-US",
};

const CURRENCY_LABELS: Record<Locale, string> = {
  ru: "сум",
  uz: "so‘m",
  en: "UZS",
};

export function formatSum(value: number, locale: Locale): string {
  return `${new Intl.NumberFormat(NUMBER_LOCALES[locale], {
    maximumFractionDigits: 0,
  }).format(value)} ${CURRENCY_LABELS[locale]}`;
}
```

Every price call supplies current locale; tests cover all three outputs.

- [ ] **Step 5: Implement `LanguageSwitcher`**

Use `usePathname`, `useRouter` from `@/i18n/navigation` and `useSearchParams` from `next/navigation`. On selection:

```ts
const query = searchParams.toString();
const hash = typeof window === "undefined" ? "" : window.location.hash;
const href = `${pathname}${query ? `?${query}` : ""}${hash}`;
router.replace(href, { locale: targetLocale });
```

Render `RU`, `UZ`, `EN` controls with `aria-current={locale === target ? "true" : undefined}` and localized accessible label. Header desktop and mobile menu both expose the switcher without duplicate tab stops at the same breakpoint.

- [ ] **Step 6: Remove hardcoded storefront copy component by component**

Use one namespace per component. Replace static hero text in `HERO_SLIDES` with language-neutral slide IDs/images/targets; `App` maps slide IDs to `Hero` messages. Category display names come from localized Mongo DTOs. Flower types/colors remain canonical keys and are mapped through `Catalog.options.*`, falling back to the raw token for admin-created unknown values.

Action toasts interpolate product names:

```ts
t("Product.addedToCart", { name: product.name })
t("Product.addedToFavorites", { name: product.name })
t("Product.removedFromFavorites", { name: product.name })
```

All internal links use `@/i18n/navigation` and English route segments.

- [ ] **Step 7: Run GREEN and the full interaction regression suite**

```powershell
npm run test:run -- src/components/storefront/LanguageSwitcher.test.tsx src/app/App.test.tsx src/components/storefront/StorefrontClient.test.tsx src/features/layout/HeroCarousel.ssr.test.tsx src/shared/format.test.ts
npm run typecheck
```

Expected: all existing cart, favorites, filter, focus-trap, repeated-toast, menu, and overlay tests stay green in addition to RU/UZ/EN assertions.

- [ ] **Step 8: Commit**

```powershell
git add messages src/test src/app/App.tsx src/components/storefront src/features src/shared src/data/catalog.ts
git diff --cached --check
git commit -m "feat: localize the complete storefront"
```

---

### Task 5: Persist checkout locale and localized order snapshots safely

**Files:**
- Modify: `src/lib/contracts.ts`, `src/lib/validations.ts`, `src/models/Order.ts`
- Modify: `src/lib/services/order-service.ts`, `src/app/api/orders/route.ts`
- Modify: `src/components/checkout/CheckoutClient.tsx`, `CheckoutClient.test.tsx`
- Modify tests: `src/lib/services/order-service.test.ts`, `src/app/api/orders/route.test.ts`, `src/models/models.test.ts`, `src/lib/validations.test.ts`

**Interfaces:**
- `CheckoutInput` gains `locale: Locale`.
- `OrderDocument`, `PendingOrderRecord`, `StoredOrder`, and admin DTO gain `locale: Locale`.
- `OrderStore.reserveProduct(productId, quantity, locale, transaction)` returns a server-selected localized name.
- Public API errors expose stable error `code` plus localized `error` message; service errors keep stable codes.

- [ ] **Step 1: Write RED order tests**

Add tests proving:

```ts
expect(() => checkoutSchema.parse({ ...validCheckout, locale: "de" })).toThrow();
expect(checkoutSchema.parse({ ...validCheckout, locale: "ru" }).locale).toBe("ru");
```

Service test: creating an EN order calls `reserveProduct(..., "en", transaction)` and stores `Scarlet rose bouquet`; RU stores `Букет алых роз`. API test: invalid EN checkout returns an English safe message with stable code, while RU rate-limit returns Russian copy.

- [ ] **Step 2: Run RED**

```powershell
npm run test:run -- src/lib/services/order-service.test.ts src/app/api/orders/route.test.ts src/components/checkout/CheckoutClient.test.tsx src/models/models.test.ts
```

Expected: FAIL because locale is neither validated nor persisted.

- [ ] **Step 3: Add locale to contracts and order schema**

Use `z.enum(LOCALES)` in checkout validation. Add required enum `locale` to Mongoose Order with default only for reading legacy records if necessary; new writes always supply it. Include locale in admin serialization so operators know the customer language.

- [ ] **Step 4: Localize reservation without trusting the browser**

The Mongo reservation query still atomically decrements stock. The returned document resolves `translations[checkout.locale].name` on the server. Only product ID and quantity come from the cart; client name/price are never accepted.

- [ ] **Step 5: Localize API errors by stable code**

Refactor `publicOrderError` to return `{code, status}` rather than passing the service’s Uzbek message. After reading/parsing the body, obtain locale (valid enum or RU fallback) and map codes through `Checkout.errors` messages. JSON parse, validation, rate-limit, unavailable product, and generic 503 responses all use that locale and keep raw database errors private.

- [ ] **Step 6: Send locale from checkout and localize form states**

`CheckoutClient` reads `useLocale()`, sends it in POST body, formats summary in that locale, and uses `Checkout` message keys for labels, errors, loading, and success. Redirect/back links use `/catalog` through locale navigation.

- [ ] **Step 7: Run GREEN and commit**

```powershell
npm run test:run -- src/lib/services/order-service.test.ts src/app/api/orders/route.test.ts src/components/checkout/CheckoutClient.test.tsx src/models/models.test.ts src/lib/validations.test.ts
npm run typecheck
git add src/lib src/models/Order.ts src/app/api/orders src/components/checkout
git diff --cached --check
git commit -m "feat: localize checkout and order snapshots"
```

---

### Task 6: Implement locale-specific metadata, hreflang, JSON-LD, and sitemap

**Files:**
- Modify: `src/lib/seo.ts`, `src/lib/seo.test.ts`
- Modify: `src/app/(store)/[locale]/layout.tsx`, `page.tsx`, `catalog/page.tsx`, `products/[slug]/page.tsx`, `products/[slug]/opengraph-image.tsx`, `checkout/page.tsx`
- Modify: `src/app/sitemap.ts`, `src/app/sitemap.test.ts`, `src/app/robots.ts`, `src/app/robots.test.ts`
- Modify: `src/lib/services/public-settings-service.ts`

**Interfaces:**
- Produces `localizedPublicPath(locale, path)`, `buildLanguageAlternates(path)`, `buildProductMetadata(product, locale, settings)`, and locale-aware JSON-LD builders.
- `x-default` always points to RU.
- Sitemap contains locale-specific home/catalog/product entries; no legacy or filtered query URL.

- [ ] **Step 1: Write RED SEO tests**

Add exact expectations:

```ts
expect(buildLanguageAlternates("/catalog")).toEqual({
  "ru-RU": "/ru/catalog",
  "uz-UZ": "/uz/catalog",
  en: "/en/catalog",
  "x-default": "/ru/catalog",
});

expect(buildProductMetadata(product, "ru", settings).alternates).toMatchObject({
  canonical: `/ru/products/${product.slug}`,
});
```

Sitemap test asserts all three `/products/{slug}` URLs share language alternates and that no URL contains `/gullar`, `/buyurtma`, or `?category=`.

- [ ] **Step 2: Run RED**

```powershell
npm run test:run -- src/lib/seo.test.ts src/app/sitemap.test.ts src/app/robots.test.ts "src/app/(store)/[locale]/products/[slug]/page.test.tsx"
```

Expected: FAIL on old Uzbek paths and single-locale metadata.

- [ ] **Step 3: Implement locale URL and metadata helpers**

Map Open Graph locales exactly:

```ts
const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  ru: "ru_RU",
  uz: "uz_UZ",
  en: "en_US",
};
```

`buildLanguageAlternates` returns relative URLs for Metadata and `absoluteUrl` values for sitemap/JSON-LD where required. Canonical paths never include query filters. `buildWebsiteJsonLd` sets `inLanguage` to the active locale; product and breadcrumb builders use localized names and English route segments.

- [ ] **Step 4: Generate localized page metadata server-side**

Every `generateMetadata` validates locale, calls `getTranslations({locale, namespace: "Metadata"})`, and returns localized title/description/canonical/language alternates. Product metadata uses Mongo translated SEO fields with message fallback. Missing product returns localized noindex metadata.

- [ ] **Step 5: Generate multilingual sitemap and preserve robots exclusions**

For each home/catalog/product logical path, emit one entry per locale and include absolute language alternates. Keep `/admin`, `/api`, `/checkout`, and private auth paths disallowed or omitted as appropriate. Remove category query entries because they canonicalize to catalog and are not standalone pages.

- [ ] **Step 6: Run GREEN and inspect generated HTML**

```powershell
npm run test:run -- src/lib/seo.test.ts src/app/sitemap.test.ts src/app/robots.test.ts "src/app/(store)/[locale]/products/[slug]/page.test.tsx"
npm run typecheck
npm run build
```

On a running production server, fetch `/ru/products/scarlet-roses` and verify `<html lang="ru">`, canonical, three language alternates plus x-default, localized Product JSON-LD, and no legacy URL.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/seo.ts src/lib/seo.test.ts src/lib/services/public-settings-service.ts src/app
git diff --cached --check
git commit -m "feat: add multilingual storefront SEO"
```

---

### Task 7: Apply the premium rectangular-card visual system and optimized fonts

**Files:**
- Modify: `src/app/(store)/[locale]/layout.tsx`, `src/app/admin/layout.tsx`, `src/app/(root)/layout.tsx`
- Modify: `src/app/styles.css`, `src/app/globals.css`
- Modify: `src/features/catalog/CatalogGrid.tsx`, `src/features/layout/Header.tsx`
- Modify: `package.json`, `package-lock.json`
- Create: `playwright.config.ts`, `e2e/premium-card.spec.ts`
- Modify relevant UI tests for card/action semantics only; do not snapshot the whole stylesheet.

**Interfaces:**
- Root layouts expose CSS variables `--font-display` from Prata and `--font-interface` from Manrope.
- `.product-card__image` is `aspect-ratio: 4 / 5` with a uniform 20 px radius.
- `.product-card` is a full-height flex/grid surface with aligned actions.

- [ ] **Step 1: Install the browser-test runner and write a RED rendered-style contract**

Run `npm install --save-dev @playwright/test` and configure Playwright to use the installed Chrome channel plus an isolated Next dev port. Create `e2e/premium-card.spec.ts` that loads `/ru/catalog`, reads the real first card with `getBoundingClientRect()`/`getComputedStyle()`, and asserts observable rendering:

```ts
test("catalog cards render as aligned rectangular premium surfaces", async ({ page }) => {
  await page.goto("/ru/catalog");
  const card = page.locator(".product-card").first();
  const image = card.locator(".product-card__image");
  await expect(card).toBeVisible();

  const visual = await image.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      ratio: rect.width / rect.height,
      topLeftRadius: style.borderTopLeftRadius,
      topRightRadius: style.borderTopRightRadius,
    };
  });

  expect(visual.ratio).toBeCloseTo(0.8, 2);
  expect(visual.topLeftRadius).toBe("20px");
  expect(visual.topRightRadius).toBe("20px");
});
```

Add a mobile case that verifies no horizontal overflow and each visible card action’s bounding-box height is at least 44 px. Component tests continue asserting accessible action names; they do not grep CSS source.

- [ ] **Step 2: Run RED**

```powershell
npm run test:e2e -- e2e/premium-card.spec.ts
npm run test:run -- src/app/App.test.tsx
```

Expected: FAIL on the current arch border-radius and old aspect ratio.

- [ ] **Step 3: Replace external font import with Next Font**

Remove CSS `@import` Google Fonts. Create shared font exports or instantiate consistently in root layouts:

```ts
const prata = Prata({
  weight: "400",
  subsets: ["cyrillic", "latin"],
  variable: "--font-prata",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  variable: "--font-manrope",
  display: "swap",
});
```

Apply both variables to `<html>` and map `--font-display: var(--font-prata)` plus `--font-interface: var(--font-manrope)`.

- [ ] **Step 4: Implement the premium token and card system**

Set exact core colors:

```css
:root {
  --color-ink: #2b171d;
  --color-accent-dark: #a62f4d;
  --color-accent: #d85c78;
  --color-paper: #fffcfb;
  --color-petal: #f8eef1;
  --color-sage: #52685a;
}
```

Card requirements:

```css
.product-card {
  display: flex;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 20px;
  background: var(--color-paper);
  box-shadow: 0 12px 34px rgba(71, 29, 40, 0.07);
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}

.product-card__image {
  aspect-ratio: 4 / 5;
  border: 0;
  border-radius: 20px 20px 0 0;
}

.product-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 18px;
}

.product-card__actions {
  margin-top: auto;
  padding-top: 14px;
}
```

Badges move to top-left; favorite stays top-right. Hover lifts 3 px and scales media only 1.025. Add a single garnet “ribbon line” to active catalog/heading states; remove conflicting ornamental effects rather than stacking decoration.

- [ ] **Step 5: Enforce responsive and motion constraints**

Maintain 4 product columns beside the desktop filter, 3 at intermediate desktop, 2 on tablet/mobile, and 1 only below the measured content-fit breakpoint. Buttons/locale controls are minimum 44 px. Add `prefers-reduced-motion: reduce` rules that disable smooth scroll and card/carousel transforms/transitions.

- [ ] **Step 6: Run GREEN and commit**

```powershell
npm run test:e2e -- e2e/premium-card.spec.ts
npm run test:run -- src/app/App.test.tsx
npm run typecheck
npm run build
git add package.json package-lock.json playwright.config.ts e2e src/app src/features/catalog/CatalogGrid.tsx src/features/layout/Header.tsx
git diff --cached --check
git commit -m "feat: refine the premium storefront design"
```

---

### Task 8: Complete local migration, documentation, full gates, and real-browser QA

**Files:**
- Modify: `README.md`, `.env.example`
- Create: `docs/release/vercel-checklist.md`
- Test/verify all source files; no production secret is written to a tracked file.

**Interfaces:**
- Produces a locally verified release candidate commit.
- Produces documented production env names and deploy/smoke commands.

- [ ] **Step 1: Update operator documentation**

README must list:

- public URLs `/ru`, `/uz`, `/en` and English inner routes;
- admin URL `/admin/login`;
- idempotent multilingual seed command;
- local Mongo replica-set requirement;
- production Atlas/Vercel env requirements;
- no Payme/Click claim;
- five verification commands, including rendered browser regression tests.

`.env.example` contains names/safe placeholders only. `docs/release/vercel-checklist.md` records environment names, Git/Vercel connection steps, migration order, rollback by prior Vercel deployment, and smoke URLs without secret values.

- [ ] **Step 2: Rerun seed and verify local Mongo completeness**

Run the seed, then a read-only Mongo check that asserts exactly 12 seeded product slugs and 6 category slugs, with all three translations non-empty. Verify the seed process exits without manual termination.

- [ ] **Step 3: Run fresh automated gates**

Run separately and preserve exit codes:

```powershell
npm run test:run
npm run test:e2e
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits 0; no test is skipped to hide a regression.

- [ ] **Step 4: Start a fresh production preview**

Start `npm run start` on an unused localhost port with the existing `.env.local`. Verify `/` returns a permanent redirect to `/ru`; `/gullar?sale=true` redirects to `/ru/catalog?sale=true`; `/buyurtma` redirects to `/ru/checkout`.

- [ ] **Step 5: Browser QA at 1440, 768, and 375 px**

At each viewport verify:

- visible product card top is rectangular and aligned;
- RU default text is Russian;
- switching RU → UZ → EN preserves product/catalog pathname, query, and hash;
- no horizontal overflow;
- mobile language/cart/menu targets are at least 44 px;
- filters precede results in DOM/focus order on tablet/mobile and remain right-side on desktop;
- favorite, quick view, cart quantity 1..99, empty cart, checkout form, Escape/focus return all work;
- all product/category images have `naturalWidth > 0` or the shared fallback renders;
- console has zero errors and critical network requests have no 4xx/5xx.

- [ ] **Step 6: Browser QA admin multilingual persistence**

Login locally using the existing configured admin account without printing credentials. Open a product, switch through three locale tabs, verify values, save a harmless punctuation-preserving edit, reload, then rerun seed to restore authoritative demo content. Confirm the admin session and protected API remain functional.

- [ ] **Step 7: Commit release documentation and any QA fixes**

If QA found a defect, add a failing regression test before its fix and rerun all fresh gates. Then:

```powershell
git add README.md .env.example docs/release src scripts messages package.json package-lock.json next.config.ts
git diff --cached --check
git status --short
git commit -m "docs: prepare the multilingual Vercel release"
```

Expected: clean tracked worktree; only ignored runtime artifacts remain.

---

### Task 9: Publish to GitHub and deploy a real Mongo-backed Vercel production site

**Files/external state:**
- Git remote `origin`
- GitHub private repository `nafis-flowers`
- Local ignored `.vercel/` project link
- Vercel project `nafis-flowers`
- Vercel Production environment variables
- MongoDB Atlas multilingual seeded catalog

**Interfaces:**
- Produces remote `main` SHA, GitHub repository URL, Vercel production URL, and deployment ID.
- Automatic future deployments occur from GitHub `main` through Vercel Git integration.

- [ ] **Step 1: Use the GitHub publishing workflow and confirm identity**

Follow the `github:yeet` skill before any remote mutation. Confirm local author, final commits, clean status, and intended file list. Use the signed-in GitHub connector/browser session to identify the account. Create a private personal repository named `nafis-flowers`; if that name exists, inspect it before deciding whether it is the intended empty remote.

- [ ] **Step 2: Attach and push the remote**

```powershell
$flowersRepoUrl = Read-Host "Yaratilgan GitHub repository HTTPS clone URL"
git remote add origin $flowersRepoUrl
git push -u origin main
git rev-parse HEAD
git ls-remote --heads origin main
```

`$flowersRepoUrl` qiymati aynan authenticated browser sessionda yaratilgan repositoryning Clone → HTTPS qiymatidan olinadi; username taxmin qilinmaydi. Expected: local HEAD equals remote `main` SHA.

- [ ] **Step 3: Confirm production-grade Mongo credentials without exposing them**

Inspect available local environment sources by key name only. Production `MONGODB_URI` must be an Atlas `mongodb+srv://` or reachable replica-set URI; reject `127.0.0.1`, `localhost`, and Docker-only hostnames. If no usable Atlas URI exists, stop only this external step and ask the user for Atlas access/URI; local implementation remains complete.

Run multilingual seed/migration against Atlas explicitly, then verify counts/translations with a read-only query before Vercel receives traffic.

- [ ] **Step 4: Authenticate/link Vercel and connect Git**

Use current official CLI behavior:

```powershell
npx vercel@latest whoami
npx vercel@latest link --yes --project nafis-flowers
npx vercel@latest git connect --yes
```

If `whoami` requires login, complete the browser authentication in the user’s existing session. Expected: `.vercel/project.json` exists locally but is ignored; Git integration reports the GitHub remote connected.

- [ ] **Step 5: Add production secrets through Vercel, not Git**

Configure Production (and Preview where safe) values for:

```text
MONGODB_URI
NEXTAUTH_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
NEXTAUTH_URL
NEXT_PUBLIC_SITE_URL
```

Add Cloudinary variables only if real admin upload credentials are available; SMTP/Telegram remain optional. Never place secret values on the command line where process listings/logs expose them; use Vercel’s interactive env input or dashboard. Run `npx vercel@latest env ls` and verify names/targets only.

- [ ] **Step 6: Create the first deployment, set canonical URL, and redeploy**

Deploy once to obtain the stable Vercel domain:

```powershell
npx vercel@latest --prod --yes
```

Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to that HTTPS production domain, then redeploy from the same verified `main` SHA. Record deployment URL and ID; do not claim completion from build output alone.

- [ ] **Step 7: Production smoke test**

On the final HTTPS domain verify:

- `/` → `/ru`;
- RU/UZ/EN home/catalog/product/checkout return 200;
- `/gullar` and `/buyurtma` permanently redirect;
- `sitemap.xml` includes three locale alternates and no legacy routes;
- product data comes from Atlas and checkout creates one controlled `pending` order with localized snapshot;
- admin login and order visibility work;
- images/fonts load, console is clean, and no server/runtime 500 occurs.

Delete/cancel the controlled order only through the existing admin transition so stock restoration remains correct and auditable.

- [ ] **Step 8: Final release evidence**

Run:

```powershell
git status --short
git rev-parse HEAD
git ls-remote --heads origin main
```

Report the GitHub URL, exact commit SHA, Vercel production URL, deployment verification performed, and any optional integration still unconfigured. Secret values, admin hash, Mongo credentials, and tokens are never included in the report.
