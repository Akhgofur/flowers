# Nafis Flowers — Next.js, SEO va MongoDB commerce design

**Status:** user-approved architecture, implementation plan pending review  
**Date:** 2026-08-11  
**Workspace:** `C:\Users\gofur\Desktop\flowers`

## 1. Maqsad

Mavjud Nafis Flowers Vite demo-ilovasini bitta production-ready Next.js App Router ilovasiga migratsiya qilish. Ilova Uzbek tilidagi public florist storefront, SEO-optimizatsiyalangan mahsulot sahifalari, MongoDB-backed katalog va buyurtmalar, hamda himoyalangan admin panelni beradi.

Bu versiyada **Payme/Click yoki boshqa online payment gateway ulanmaydi**. Checkout buyurtmani `pending` statusida saqlaydi, stockni zaxiralaydi va admin keyingi jarayonni boshqaradi.

## 2. Qarorlar va chegaralar

### Tanlangan yechim

- **Bitta Next.js monolith:** frontend, Route Handlers va MongoDB integratsiyasi bitta repositoryda.
- **Next.js App Router + TypeScript strict mode.**
- **Mongoose** connection cache va model uslubi `C:\Users\gofur\Desktop\akhgofur`dagi `src/lib/mongodb.ts` patterniga asoslanadi.
- **NextAuth Credentials** bilan yagona `admin` roli. Parol faqat `ADMIN_PASSWORD_HASH` environment secretida bo‘ladi; plain-text parol source yoki `.env.example`ga yozilmaydi.
- **MongoDB Atlas replica set** ishlatiladi, shunda order/stock zaxiralashi transaction ichida atomik bajariladi.
- **Cloudinary** server-side upload integratsiyasi admin rasmlari uchun ishlatiladi; credentials browserga chiqmaydi.
- Hozirgi premium Nafis UI, Uzbek copy, favorites va local cart UX saqlanadi.

### Qasddan kiritilmaydiganlar

- Payme, Click, Uzum/NPS yoki boshqa payment gateway.
- Multi-vendor marketplace, multi-warehouse yoki multi-currency.
- Customer account/login; checkout guest sifatida ishlaydi.
- SMS gateway. Email/Telegram notification adapterlari esa environment sozlanganda ulanadigan bo‘ladi.

## 3. Nega aynan shu arxitektura

| Variant | Afzallik | Kamchilik | Qaror |
| --- | --- | --- | --- |
| Next.js monolith + MongoDB | SEO, admin, API va storefront bir deployda; eng kam operatsion murakkablik | Server/runtime talab qiladi | **Tanlandi** |
| Next.js frontend + alohida Express/FastAPI API | Mustaqil scale qilish mumkin | Ikki deploy, CORS, auth/session murakkabligi | Hozircha ortiqcha |
| `akhgofur`ni copy qilib qayta ishlatish | Tez boshlash mumkin | Portfolio domain modeli floristga mos emas, keraksiz kod ko‘p | Faqat Mongo/auth patternlari olinadi |

## 4. Tizim ko‘rinishi

```text
Public user
  -> Next.js server-rendered storefront
  -> product/category server queries
  -> MongoDB

Browser client components
  -> filters, cart, favorites, quick-view
  -> POST /api/orders

Admin
  -> NextAuth credentials session
  -> protected /admin routes
  -> protected Route Handlers
  -> MongoDB + Cloudinary
```

## 5. Next.js route va component chegaralari

```text
src/
  app/
    (store)/
      layout.tsx                 # public metadata, organization JSON-LD
      page.tsx                   # server-rendered home/catalog
      gullar/
        page.tsx                 # katalog listing, query-param canonicalization
        [slug]/page.tsx          # product detail + Product JSON-LD
      buyurtma/page.tsx          # checkout form
      buyurtma/muvaffaqiyatli/page.tsx
    admin/
      login/page.tsx
      page.tsx                   # dashboard
      products/page.tsx
      products/new/page.tsx
      products/[id]/page.tsx
      categories/page.tsx
      orders/page.tsx
      orders/[id]/page.tsx
      settings/page.tsx
    api/
      auth/[...nextauth]/route.ts
      products/route.ts
      products/[slug]/route.ts
      categories/route.ts
      orders/route.ts
      orders/[id]/route.ts
      admin/products/route.ts
      admin/products/[id]/route.ts
      admin/categories/route.ts
      admin/orders/[id]/route.ts
      admin/settings/route.ts
      upload/route.ts
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
    mongodb.ts
    auth.ts
    validations.ts
    seo.ts
    repositories/
    services/
  models/
    Product.ts
    Category.ts
    Order.ts
    SiteSettings.ts
  types/
```

Server Components public data va SEO renderingini bajaradi. Filter, local cart, favorite, quick-view, checkout form va admin mutatsiyalari faqat kerakli joyda Client Component bo‘ladi.

## 6. MongoDB ma’lumot modeli

### Product

```ts
{
  _id: ObjectId,
  name: string,
  slug: string,                 // unique, URL-safe
  shortDescription: string,
  description: string,
  composition: string[],
  categoryId: ObjectId,
  price: number,                // integer UZS
  originalPrice?: number,
  currency: "UZS",
  images: [{ url: string, alt: string, publicId?: string }],
  flowerTypes: string[],
  colors: string[],
  stockQuantity: number,        // integer >= 0
  isFeatured: boolean,
  isNew: boolean,
  isOnSale: boolean,
  status: "draft" | "published" | "archived",
  seoTitle?: string,
  seoDescription?: string,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes: unique `slug`, `{ status: 1, categoryId: 1 }`, `{ isOnSale: 1, status: 1 }`, text/search index on name and descriptions when server-side search is enabled.

### Category

```ts
{
  _id: ObjectId,
  name: string,
  slug: string,                 // unique
  description?: string,
  image?: { url: string, alt: string, publicId?: string },
  order: number,
  status: "published" | "hidden",
  createdAt: Date,
  updatedAt: Date
}
```

### Order

```ts
{
  _id: ObjectId,
  number: string,               // public order reference, unique
  customer: {
    fullName: string,
    phone: string,
    address: string,
    deliveryDate?: Date,
    comment?: string
  },
  items: [{
    productId: ObjectId,
    slug: string,
    name: string,               // snapshot
    imageUrl: string,           // snapshot
    unitPrice: number,
    quantity: number,
    lineTotal: number
  }],
  subtotal: number,
  deliveryFee: number,
  total: number,
  paymentMethod: "cash_on_delivery" | "card_on_delivery",
  paymentStatus: "unpaid",
  status: "pending" | "confirmed" | "preparing" | "delivering" | "delivered" | "cancelled",
  stockReleasedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Order yaratilganda barcha line item uchun stock `MongoDB session` ichida atomik zaxiralanadi. `cancelled` holatiga birinchi o‘tishda stock faqat bir marta qaytariladi. Admin order statusini transition qoidalariga qarshi o‘zgartira olmaydi.

### SiteSettings

```ts
{
  siteName: string,
  siteUrl: string,
  phone: string,
  telegram?: string,
  instagram?: string,
  address: string,
  workingHours: string,
  deliveryFee: number,
  freeDeliveryThreshold?: number,
  seo: {
    defaultTitle: string,
    defaultDescription: string,
    ogImage?: string
  },
  updatedAt: Date
}
```

Faqat bitta settings document saqlanadi.

## 7. API va service contractlari

| Route | Ruxsat | Maqsad |
| --- | --- | --- |
| `GET /api/products` | public | published products, safe filter/pagination response |
| `GET /api/products/[slug]` | public | published product detail |
| `GET /api/categories` | public | published categories |
| `POST /api/orders` | public | Zod-validated guest checkout, transaction, `pending` order |
| `GET /api/admin/products` | admin | products including drafts |
| `POST /api/admin/products` | admin | create product |
| `PATCH/DELETE /api/admin/products/[id]` | admin | update/archive product |
| `GET/POST/PATCH /api/admin/categories...` | admin | category CRUD |
| `GET /api/admin/orders` | admin | filter/paginate orders |
| `PATCH /api/admin/orders/[id]` | admin | allowed status transition |
| `GET/PATCH /api/admin/settings` | admin | site settings |
| `POST /api/upload` | admin | Cloudinary image upload |

Public va admin API inputlari Zod bilan validate qilinadi. Unknown request fields strip/reject qilinadi, clientga raw database/mongoose error chiqmaydi. Mutatsiyalardan so‘ng relevant public path/tag qayta validatsiya qilinadi.

## 8. Auth va xavfsizlik

- NextAuth Credentials session, JWT strategy, single `admin` role.
- Environment: `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `MONGODB_URI`, `NEXT_PUBLIC_SITE_URL`, Cloudinary keys va notification credentials.
- `ADMIN_PASSWORD_HASH` bcrypt hash bo‘ladi; `akhgofur`dagi plain `ADMIN_PASSWORD` patterni ko‘chirib olinmaydi.
- Middleware yoki server-side guard `/admin/**` hamda `/api/admin/**`ni sessiyasiz requestdan himoya qiladi.
- Checkout va login endpointlariga IP-aware basic rate limiter qo‘yiladi. Platforma shared serverless memory bo‘lsa Redis/KV adapter keyin almashtiriladigan interface ortida bo‘ladi.
- Cookie/session secret, Mongo URI, Cloudinary secret va notification tokenlari faqat server environmentda ishlatiladi.
- Order form uchun telefoni, address va comments loglarga yozilmaydi; server error loglari sanitizatsiya qilinadi.

## 9. Storefront state va UX

- Katalog, category va product detail serverdan MongoDB orqali olinadi.
- URL query parametrlari (`q`, `category`, `sale`, narx) shareable/canonical filter holatini ifodalaydi.
- Favorites va anon cart localStorageda saqlanadi; checkoutda only validated snapshot serverga yuboriladi.
- Product details server-rendered dedicated page bo‘ladi; quick-view progressive enhancement sifatida qolishi mumkin.
- Checkout clientdan inventory/price ishonchli deb qabul qilmaydi: server product ID, published status, narx va stockni qayta o‘qiydi.
- Successful orderdan keyin local cart tozalanadi va public order reference ko‘rsatiladi. Payment claim qilinmaydi.

## 10. SEO va rendering

### Public rendering

- Home, category va product sahifalari server-rendered bo‘ladi.
- Public catalog/products cache bilan render qilinadi; admin product/category/settings mutatsiyasi tag/path revalidation orqali cache’ni yangilaydi.
- Draft/archived mahsulot public API, sitemap va SEO sahifalarda hech qachon chiqmaydi.

### Metadata

- Root `metadataBase` `NEXT_PUBLIC_SITE_URL`dan olinadi.
- Har mahsulot uchun title, description, canonical, Open Graph, Twitter image, robots directives.
- `sitemap.ts`: home, published category va published product URLlari.
- `robots.ts`: public pages allow, `/admin`, `/api`, private/internal query variantlar disallow.
- JSON-LD: `Organization`/`LocalBusiness`, `WebSite`, `BreadcrumbList`, va valid product sahifasida `Product` + `Offer` (currency UZS, availability, price).
- Image alt MongoDB’da required; image upload paytida admin alt text bermasa form validation block qiladi.

## 11. Admin panel

- Dashboard: pending order count, low-stock products, sales/order quick metrics.
- Products: paginated list, search, draft/published/archive status, create/edit, price, discount, stock, images, SEO fields.
- Categories: CRUD, sort order, image, published/hidden status.
- Orders: customer data, line snapshots, totals, payment method, timeline/status update, cancel va stock return notice.
- Settings: phone, address, hours, delivery fee, social links, default SEO.
- Destructive actions confirmation dialog va server-side authorization bilan bajariladi.

## 12. Migratsiya va seed

1. Vite package/configuration va entry pointlari Next.js App Router setup bilan almashtiriladi.
2. Premium Nafis visual komponentlari Next componentsga ko‘chiriladi; browser-only logic `"use client"` boundaries ichida qoladi.
3. Hozirgi 12 product va 6 category uchun idempotent seed script yoziladi.
4. Seed faqat explicit server-side command bilan ishlaydi va unique slug/category bo‘yicha duplicate yaratmaydi.
5. `.env.example` beriladi, `.env.local` repositoryga kiritilmaydi.
6. Mongo URI yo‘q bo‘lsa app secretni ko‘rsatmaydigan aniq configuration error qaytaradi; public storefront requestlari fallback UI beradi.

## 13. Test va qabul mezonlari

### Automated tests

- Schema/API validation: invalid price, invalid slug, untrusted order total, out-of-stock, illegal status transition, unauthenticated admin write.
- Cart/order: quantity 1..99, stock reservation, cancellation stock return exactly once, duplicate order mutation safety.
- SEO: product metadata/canonical/JSON-LD, sitemap excludes drafts, robots excludes admin/API.
- UI: filter query state, quick-view/cart/favorite, checkout success/error, admin guard, mobile navigation and overlay accessibility.
- Image upload route validation/authorization.

### Manual browser checks

- 1440px, 768px, 375px visual/accessibility QA.
- No horizontal overflow; keyboard focus order matches visual order; overlays contain focus and Escape restores origin.
- Lighthouse-style SEO sanity: semantic heading hierarchy, metadata, valid structured data.
- Public product page is reachable directly by slug and renders without client-only data dependency.

### Acceptance criteria

- MongoDBdagi published product frontend, search filter, product detail, sitemap va JSON-LD’da bir xil authoritative data sifatida chiqadi.
- Admin non-authenticated user uchun ochilmaydi; admin CRUD public cache’ni yangilaydi.
- Guest order server-side validation va atomic stock reservation bilan `pending` yaratadi.
- No payment service or false online-payment claim chiqmaydi.
- All tests, TypeScript, lint va production `next build` o‘tadi.

## 14. Zarur environment variables

```bash
MONGODB_URI=
NEXTAUTH_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
EMAIL_TO=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

SMTP va Telegram credentials bo‘lmasa buyurtma yaratish to‘xtamaydi; notification adapterlar disabled holatda xavfsiz no-op yoki observable server warning beradi. MongoDB, auth va Cloudinary esa tegishli funksiyalar ishga tushishidan oldin configuration validationdan o‘tadi.

## 15. Ochiq operatsion qarorlar

- Production MongoDB Atlas replica set URI keyin `MONGODB_URI`ga kiritiladi.
- Cloudinary account/credentials va deployment domain user tomonidan beriladi.
- Buyurtma notification email/Telegram destinationsi sozlanadi.
- Payment integratsiyasi scope’dan tashqarida; kelajakda `paymentStatus` va payment provider adapteri orqali ulanishi mumkin.
