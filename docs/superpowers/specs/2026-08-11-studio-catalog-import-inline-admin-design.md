# Studio Catalog Import and Inline Admin Editing Design

## Goal

Import the curated `C:\Users\gofur\Desktop\studio-background` flower photography into the production catalog, grouping multiple views of the same bouquet into one product, while allowing the administrator to set product data and future prices directly in the list without a modal or product-detail screen.

## Confirmed decisions

- Source folders contain 143 images: `buket` (39), `jivoy` (25), and `savat` (79).
- Multiple images of the same bouquet or arrangement become one product with a 1–8 image gallery. Distinct arrangements remain distinct products.
- `savat` products receive a new localized `baskets` category. `buket` products use the existing mixed-bouquet category; `jivoy` products are classified as roses or mixed bouquets from their visible composition.
- New studio products are initially published without a price. They must never be represented by a synthetic value such as 0 or 1 UZS.
- A product with no price shows a localized “price on request” presentation and cannot be added to cart or submitted through checkout.
- Cloudinary is the production asset store. Its credentials stay in `.env.local` locally and in protected Vercel environment variables; they are never committed.
- Admin editing is inline: clicking the single row action “Edit” transforms that row into inputs/selects. There is no modal and no navigation to a detail page. Save serializes and sends only changed, allowed fields; Cancel restores the original row.

## Architecture

```text
studio-background image folders
  -> manifest with visual product groups and metadata
  -> Cloudinary upload (one remote image per local source file)
  -> idempotent MongoDB import (one group = one Product document)
  -> published storefront with inquiry-only state for null price

Admin list row
  -> immutable original snapshot + editable draft
  -> shallow structured diff of whitelisted quick-edit fields
  -> authenticated same-origin PATCH /api/admin/products/:id
  -> partial Zod validation + Mongoose update + catalog cache invalidation
```

## Data model and validation

`price` becomes `number | undefined` in product contracts and MongoDB. Existing priced products retain their price unchanged. `originalPrice` and `isOnSale` are only valid when `price` is present; clearing a price automatically clears the old price and sale state.

Creation continues to require full multilingual content and a gallery. A separate strict partial schema is used solely for PATCH. It accepts only quick-edit fields: Russian display name, category id, nullable price, stock quantity, status, featured/new flags, and sort order. The server rejects empty patches, unknown keys, invalid category identifiers, invalid numeric ranges, and stale sale/original-price combinations.

## Storefront behavior

- Product cards, quick view, product page, Open Graph image, and SEO JSON-LD render price only when it exists.
- Unpriced items display locale-specific inquiry copy. Their cart control is replaced by a contact action and they are excluded from price-range filtering.
- Cart, checkout, order creation, totals, and stock reservation defensively reject an unpriced product id even if a client sends it directly.
- Existing priced products maintain current cart, checkout, sale, and SEO behavior.

## Import workflow

1. Build a reviewed manifest of visually grouped local source images. Every source path appears exactly once, every group has 1–8 images, a category, localised product content, composition, flower types, colors, stock, status, and stable slug.
2. Upload each source image to the `flowers/products` Cloudinary folder and retain the returned secure URL/public id.
3. Upsert products by slug. Re-running the import updates the same studio products rather than creating duplicates.
4. Create/upsert the `baskets` category before product writes.
5. Print a non-secret report: source image count, groups/products created or updated, per-category counts, and any source files that could not be imported.

## Inline admin UX

The regular table remains the default. “Edit” activates exactly one row at a time. The product name, category, price, stock, sort order, status, and merchandising flags become native labeled controls in that row. The image gallery and full three-language editorial fields intentionally remain outside quick-edit scope because forcing them into a table row would make ordinary price and stock work error-prone.

Save is disabled when the normalized patch is empty and displays a row-local pending state. A successful response replaces only that row with the server DTO and refreshes server data. An API failure preserves the draft and exposes a row-local accessible error. Cancel makes no request and restores display mode.

## Security and operations

- Cloudinary upload/import code reads credentials exclusively through server-only environment validation.
- The import script must exit before attempting writes when Cloudinary or MongoDB configuration is absent.
- Admin mutation remains protected by NextAuth admin authorization and same-origin validation.
- No Cloudinary secret is returned to the browser, emitted to logs, placed in the script report, committed, or copied into test snapshots.
- Import runs locally against the configured Atlas database; Vercel only needs Cloudinary credentials for subsequent admin image uploads.

## Acceptance criteria

1. Every valid image source from the studio directory is represented exactly once in a product gallery, with duplicate-angle images grouped with their bouquet.
2. The imported products and the new basket category are visible in Atlas and in all RU/UZ/EN storefront locales.
3. Unpriced items display inquiry copy and cannot enter cart, checkout, order creation, structured product offers, or price-range results.
4. Existing priced products retain their current purchase behavior.
5. Inline edit has no modal/detail navigation; it issues no request on Cancel or unchanged Save, and sends only fields that differ from the original row.
6. Invalid partial payloads, unknown fields, direct cart attempts for unpriced products, and invalid sale/price combinations are rejected server-side.
7. Focused tests, full test suite, typecheck, lint, production build, local import report, and desktop/mobile admin/storefront QA pass before deployment.
