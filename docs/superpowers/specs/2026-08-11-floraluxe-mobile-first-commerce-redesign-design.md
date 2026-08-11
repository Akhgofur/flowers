# Floraluxe Mobile-First Commerce Redesign

**Status:** Approved design

**Date:** 2026-08-11

## 1. Objective

Rebrand the existing Nafis flower storefront as Floraluxe and rebuild the public experience around a mobile-first premium storefront, a dedicated filterable catalog, canonical product detail pages, season-aware availability, admin-managed home collections, and reliable Telegram order delivery.

The implementation keeps the existing Next.js App Router, MongoDB/Mongoose, Cloudinary, NextAuth, cart, checkout, admin authentication, and localized routing. It replaces the current storefront composition and extends the existing domain instead of introducing a separate CMS or commerce platform.

## 2. Confirmed Product Decisions

- Brand name is `Floraluxe` everywhere: storefront, admin, metadata, notification copy, fallbacks, email subjects, and new order numbers.
- Russian remains the default locale. Russian, Uzbek, and English remain supported.
- Locale-prefixed public pathnames remain English, including `/[locale]/catalog`, `/[locale]/products/[slug]`, and `/[locale]/checkout`.
- The catalog is a dedicated page rather than a large embedded home-page section.
- Every product-card primary click opens the canonical product detail page. Quick view is removed.
- The public design is mobile-first and is verified at 320, 375, 390, and 430 px before desktop handoff.
- Large pill controls and heavily rounded cards are removed. Product images and cards use square or near-square corners.
- Products may be seasonal. Out-of-season products stay indexable and visible but cannot enter the cart.
- Out-of-season and inquiry-only products show a localized `Check availability` CTA that opens a backend-configured contact channel.
- Home-page manual product sliders are created and ordered in admin.
- `Best sellers` and `Recommended for you` are permanent automatic sections and are not created as manual sections.
- Orders are stored before notification and are delivered reliably to a Telegram group through an outbox with retry state.
- Payme and Click are out of scope.

## 3. Visual System and Brand Assets

The visual direction is editorial luxury florist:

- warm ivory canvas;
- deep chocolate primary text;
- restrained gold and magnolia-pink accents;
- high-contrast editorial serif headings paired with a legible sans-serif interface font;
- thin rules, deliberate whitespace, rectangular photography, and restrained shadows;
- motion limited to purposeful carousel, drawer, and state transitions;
- `prefers-reduced-motion` disables non-essential movement.

The supplied horizontal Floraluxe logo is the primary header wordmark. The supplied circular mark is used for favicon, social avatar, and compact brand-mark contexts. The phone number is not baked into the site identity: phone, email, address, business hours, and social links are rendered from MongoDB site settings.

The logo is prepared as optimized transparent assets. Admin-managed site settings retain image references so the active wordmark and compact mark can be replaced without a code change.

## 4. Public Information Architecture

```text
/[locale]
  Premium home storefront

/[locale]/catalog
  Search, filters, sorting, pagination and product grid

/[locale]/products/[slug]
  Canonical product detail, gallery, availability and purchase/contact CTA

/[locale]/checkout
  Checkout for priced and currently purchasable cart lines
```

The header is sticky. At the top of the page it shows the horizontal Floraluxe wordmark, locale switcher, search entry point, and cart. After scrolling it becomes a compact sticky header without losing the logo, search, or cart affordances.

Mobile has a persistent bottom navigation with Home, Catalog, Favorites, and Cart. It uses a flat rectangular visual treatment and accounts for safe-area insets. Neither sticky surface may obscure page content, focused controls, or the checkout CTA.

## 5. Home Page

The home page is a curated storefront, not a second catalog page. Its order is:

1. Editorial hero with one primary CTA.
2. Horizontally scrollable category navigation.
3. Published admin-managed manual collection sliders, ordered by `sortOrder`.
4. Permanent automatic Best Sellers section.
5. Permanent automatic Recommended section.
6. Delivery and service-value content.
7. Contact/social block and premium footer.

### 5.1 Manual home collections

A `HomeSection` document stores:

- localized title and optional description for `ru`, `uz`, and `en`;
- ordered `productIds`;
- `sortOrder`;
- `draft` or `published` status;
- optional publication start and end timestamps;
- created and updated timestamps.

Admin can create, edit, reorder, publish, hide, and remove a manual section. Products inside a section are explicitly selected and ordered. The same product may appear in multiple manual sections. Invalid, archived, or deleted product references are silently omitted from the public response and visibly flagged in admin.

### 5.2 Permanent automatic sections

Best Sellers is always rendered. It ranks currently public products by quantity in delivered orders. Ranking is all-time, ties are broken by most recent delivered order and then stable product ID. Unavailable products are removed after ranking; the section renders up to 12 available products and shows no empty placeholder if no eligible order data exists.

Recommended is always rendered from public `isFeatured` products that are currently available. It is ordered by `sortOrder`, then newest update, and returns up to 12 products. If fewer than four featured products qualify, newly available products fill the remaining slots without duplicates.

Both automatic sections use localized fixed titles and are not represented by `HomeSection` records.

## 6. Dedicated Catalog

The catalog is server-backed and URL-driven. Search parameters include query, category, price range, flower type, color, season, sale state, sorting, and page. Locale changes preserve the logical route, supported query parameters, and hash.

Desktop places filters in a stable side column. Mobile and narrow tablet use a `Filters` control in a sticky catalog toolbar. The control displays the number of active filters. It opens a near-full-screen bottom drawer with:

- clear section headings;
- 44 px minimum touch targets;
- Apply and Reset actions in a sticky footer;
- focus trapping, Escape close, focus restoration, and screen-reader names;
- scroll containment so background content does not move.

Mobile uses a two-column rectangular product grid. Product cards contain image, status label, product name, price or inquiry text, and a small availability line. The whole card primary surface links to the product detail page. Purchase actions are intentionally reserved for the detail page so card behavior is consistent and the small mobile grid stays clear.

Catalog states include skeleton loading, empty results, safe image fallback, recoverable fetch failure, and reset-filters action.

## 7. Product Detail and Availability

Every product detail includes:

- swipeable image gallery with accessible controls;
- localized name, descriptions, composition, size, and delivery estimate;
- category, flower types, colors, and seasons;
- price, sale price, or inquiry-only state;
- computed availability explanation;
- related and recommended sliders;
- a mobile sticky bottom action area.

### 7.1 Season model

`Product.seasons` is a non-empty array containing one or more of:

```text
spring | summer | autumn | winter | all_year
```

`all_year` cannot be combined with another value. Existing products are backfilled with `all_year` so rollout does not unexpectedly disable inventory.

The current season is computed on the server using `Asia/Tashkent`:

- spring: March through May;
- summer: June through August;
- autumn: September through November;
- winter: December through February.

A product is purchasable only when it is published, has positive stock, has a positive price, and its seasons contain `all_year` or the current season. Sale validation remains unchanged: an inquiry-only item cannot carry sale pricing.

Public CTA precedence is explicit:

1. Out of season: show `Currently out of season` and `Check availability`.
2. Zero stock: show `Temporarily unavailable` and `Check availability`.
3. Missing price: show `Price on request` and `Check availability`.
4. Otherwise: show price and `Add to cart`.

`Check availability` opens the configured Telegram URL with a localized prefilled message containing the product name and canonical URL. If Telegram is not configured, it falls back to the configured phone contact. If neither exists, the CTA is disabled with a localized contact-unavailable explanation.

Out-of-season products remain in the catalog, sitemap, and product pages. Structured data reports `OutOfStock`; it never publishes a false numeric offer for an inquiry-only product.

## 8. Admin Experience

Admin gains a `Home sections` route and navigation item. The page supports list, create, edit, ordering, status control, localized content, and an ordered product picker. Mobile admin remains horizontally safe and uses full-width editors where a table would be impractical.

Product create/edit contracts gain `seasons`. The product list inline editor also exposes seasons without a modal or product-detail route. As with current quick editing, only changed whitelisted fields are sent in PATCH requests.

Site settings manage:

- site/brand name;
- horizontal logo and compact mark;
- phone, email, address, and working hours;
- Instagram and Telegram public URLs;
- localized site description, delivery policy, SEO title, and SEO description;
- Open Graph image and delivery fee.

Admin order rows display Telegram delivery status: pending, sent, or failed. Failed notifications have a Retry action protected by the existing admin authentication and same-origin mutation checks.

## 9. Telegram Order Delivery

The existing Telegram sender is retained behind a deeper notification boundary. Secrets remain environment-only:

- `TELEGRAM_BOT_TOKEN`;
- `TELEGRAM_CHAT_ID`.

Order creation and notification follow this sequence:

```text
Validate checkout
  → reserve priced and available stock
  → create MongoDB order
  → create notification outbox record in the same transaction
  → commit
  → attempt immediate Telegram send
  → mark sent or retain retryable failure
```

Telegram failure never deletes or rolls back an already committed customer order. The outbox stores channel, order ID, status, attempt count, next-attempt time, and sanitized error classification; it never stores the bot token or provider response body.

Automatic retry uses an authenticated internal route suitable for Vercel Cron, with bounded attempts and backoff. Admin Retry bypasses the scheduled time but remains idempotent: a sent outbox entry cannot send a duplicate unless an explicit new notification is created.

The message contains Floraluxe order number, customer, phone, address, delivery time, note, localized product lines, quantities, payment method, delivery fee, and total. New orders use `FL-YYYYMMDD-...`; existing `NF-...` identifiers remain unchanged.

A real Telegram group test is performed only after the user supplies the bot token and group chat ID and explicitly approves the test message.

## 10. Rebranding Scope

Hard-coded `Nafis`, `Nafis Flowers`, `NF`, old fallback alt text, metadata, admin identity copy, notification subjects, and default settings are audited. User-generated words such as the Uzbek adjective `nafis` are not blindly replaced unless they refer to the brand.

MongoDB site settings are updated to Floraluxe through an idempotent migration/backfill. Existing products, categories, orders, Cloudinary images, product slugs, and locale routes are preserved.

## 11. Error Handling and Accessibility

Public and admin experiences include loading, empty, unavailable, validation, network, and retry states. Server responses expose safe localized messages; tokens, provider payloads, customer PII, and MongoDB details never enter browser responses or logs.

All interactive controls meet a 44 px minimum target. Keyboard order follows visual order. Drawers and overlays trap focus and restore it to their trigger. Status changes use appropriate live regions. Images include localized alt text, and visible focus indicators meet contrast requirements.

## 12. Caching and Invalidation

Product, category, site-settings, and home-section reads use explicit cache tags. Admin writes invalidate only affected public tags. Availability is time-dependent, so cached product responses must not remain across a season boundary; the cache policy uses a bounded revalidation interval and availability is recomputed on the server response path.

Best-seller cache is invalidated after an order reaches delivered status. Recommended cache is invalidated by product availability, featured, stock, price, season, or status changes.

## 13. Verification

### Automated

- Unit tests for season boundaries, Tashkent timezone, availability precedence, product validation, Best Sellers ranking, Recommended fallback, home-section ordering, and notification retry/idempotency.
- API tests for strict admin section CRUD, seasons create/PATCH, order plus outbox transaction, admin retry, and protected mutations.
- Component tests for card-to-detail navigation, mobile filter drawer behavior, sticky CTA states, site-settings rendering, and admin changed-fields-only PATCH.
- Existing cart, checkout, locale, SEO, sitemap, auth, and admin suites remain green.
- Full `test:run`, `typecheck`, `lint`, and production `build` must exit successfully.

### Browser QA

- Public home, catalog, product detail, cart, and checkout at 320, 375, 390, and 430 px.
- Tablet and desktop layouts, sticky header transitions, bottom navigation, filter focus behavior, gallery gestures, long localized copy, keyboard-open forms, and safe-area padding.
- Admin Home Sections, product season editing, order notification status, and retry at mobile and desktop widths.
- Console errors, broken images, overflow, duplicate IDs, and inaccessible names are checked.

### Production

- Run the idempotent data backfill and record counts before and after.
- Configure Telegram secrets in Vercel Production and Preview without committing them.
- Deploy from GitHub `main` through the existing Vercel integration.
- Verify canonical/hreflang metadata, public routes, protected admin routes, imported catalog count, and no secret-bearing files in Git.
- With explicit approval, create one identifiable test order and confirm a single corresponding message in the intended Telegram group.

## 14. Delivery Boundaries

The implementation is one coordinated product release but is executed in ordered milestones:

1. Domain models, migrations, availability, sections, and notification outbox.
2. Admin product seasons, home sections, site settings, and notification status.
3. Floraluxe assets and rebranding.
4. Mobile-first storefront, catalog, detail, cart, and checkout redesign.
5. Full verification, data migration, Git push, Vercel deployment, and approved Telegram test.

No milestone is called complete based only on static code inspection. Local automated tests, real responsive browser checks, and production verification are reported separately.
