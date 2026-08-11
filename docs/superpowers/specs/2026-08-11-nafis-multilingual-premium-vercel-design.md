# Nafis Flowers — multilingual premium storefront va Vercel release design

**Status:** user-approved direction (oldingi “tasdiq sanga” ruxsati asosida)  
**Date:** 2026-08-11  
**Workspace:** `C:\Users\gofur\Desktop\flowers`

## 1. Maqsad

Mavjud Next.js + MongoDB Nafis Flowers ilovasini uch tilli, SEO-optimizatsiyalangan va production deployga tayyor premium storefrontga aylantirish:

- tillar: rus, o‘zbek va ingliz;
- default til: rus;
- barcha public sahifa segmentlari inglizcha;
- katalog kartalari arka shaklidan premium to‘rtburchak media-cardga o‘tadi;
- mahsulot/kategoriya kontenti uch tilda MongoDB va admin panel orqali boshqariladi;
- Git repository yaratiladi, faqat loyiha fayllari commit qilinadi va GitHub remote orqali Vercelga deploy qilinadi.

Payme, Click yoki boshqa online payment scope’ga kirmaydi. Mavjud cash/card-on-delivery checkout modeli saqlanadi.

## 2. Tanlangan yondashuv

### Tavsiya va qaror

`next-intl` asosidagi locale-prefixed App Router arxitekturasi ishlatiladi:

```text
/                    -> 308 /ru
/ru                  -> ruscha bosh sahifa
/uz                  -> o‘zbekcha bosh sahifa
/en                  -> inglizcha bosh sahifa

/{locale}/catalog
/{locale}/products/{english-slug}
/{locale}/checkout
```

Locale prefiksi har doim ko‘rinadi. Buning afzalliklari:

- har til uchun bir ma’noli canonical URL;
- `hreflang` alternates yaratish sodda va ishonchli;
- language switcher ayni sahifa, query va hash holatini saqlay oladi;
- rus default bo‘lsa ham `/ru` URLi noaniqlik tug‘dirmaydi;
- ichki page segmentlari tilga bog‘liq bo‘lmaydi va talab qilinganidek inglizcha qoladi.

### Ko‘rib chiqilgan, lekin tanlanmagan variantlar

1. Ichki custom dictionary: yangi dependency yo‘q, lekin ko‘p Client Component orasida dictionary/locale prop plumbing va navigation helperlarni qo‘lda yozish kerak bo‘ladi.
2. Ruscha prefikssiz `/catalog`, boshqa tillar prefiksli: default URL qisqaroq, lekin canonical, redirect va pathname switching murakkabroq.

## 3. Route arxitekturasi va backward compatibility

Public storefront locale segment ostiga ko‘chadi; admin va API locale’siz qoladi. Dynamic `<html lang>`ni serverda to‘g‘ri chiqarish uchun storefront, root redirect va admin alohida root-layout guruhlaridan foydalanadi:

```text
src/app/
  (root)/
    layout.tsx              # / redirect uchun minimal root layout
    page.tsx                # / -> /ru
  (store)/
    [locale]/
      layout.tsx            # <html lang={locale}> + provider + localized SEO
      page.tsx
      catalog/page.tsx
      products/[slug]/page.tsx
      checkout/page.tsx
      not-found.tsx
  admin/
    layout.tsx              # admin uchun locale-independent root layout
    **
  api/**
  global-not-found.tsx      # multiple root layoutlar uchun full-document 404
  sitemap.ts
  robots.ts
src/proxy.ts               # locale routing; admin/api/static assetlarni chetlab o‘tadi
```

Next 16 `experimental.globalNotFound` yoqiladi, chunki ilovada bir nechta root layout bo‘ladi. Hozirgi top-level `error.tsx` storefront/admin segment error boundarylariga ko‘chiriladi yoki full-document `global-error.tsx`ga aylantiriladi; root layout olib tashlangandan keyin orphan boundary qolmaydi.

Legacy public URLlar query stringni saqlagan holda permanent redirect qilinadi:

| Eski URL | Yangi URL |
| --- | --- |
| `/gullar` | `/ru/catalog` |
| `/gullar/:slug` | `/ru/products/:slug` |
| `/buyurtma` | `/ru/checkout` |

Admin URLlar allaqachon inglizcha va o‘zgarmaydi: `/admin/products`, `/admin/categories`, `/admin/orders`, `/admin/settings`.

## 4. Internationalization chegaralari

### UI dictionaries

Uchta typed message catalog yaratiladi:

```text
messages/ru.json
messages/uz.json
messages/en.json
```

Quyidagi UI qatlamlari to‘liq tarjima qilinadi:

- utility bar, header, mobile menu va footer;
- hero, categories, promo, assurances;
- katalog tablari, filtrlar, natija/empty state;
- kartalar, favorite, quick view va cart drawer;
- product detail/breadcrumb/metadata;
- checkout form, validation/success/error matnlari;
- locale-aware son, narx va sana formatlari;
- storefront 404/loading/error matnlari.

Admin interface operatsion jihatdan hozircha o‘zbekcha qoladi, lekin mahsulot va kategoriya kontentini uch tilda tahrirlash imkonini beradi. Bu public til talabi bilan admin operator tilini majburan almashtirishni aralashtirmaydi.

### Language switcher

Headerdagi `RU / UZ / EN` switcher:

- desktopda ixcham segmented control;
- mobile menyuda kamida 44 px touch target;
- joriy pathname, query string va hashni saqlaydi;
- ayni mahsulot slugini o‘zgartirmaydi, chunki slug tilga bog‘liq emas;
- current locale’ni `aria-current="true"` bilan bildiradi.

## 5. MongoDB multilingual domain modeli

Route segmentlari va entity sluglari inglizcha/stable bo‘ladi; ko‘rinadigan kontent tarjima qilinadi.

```ts
export const LOCALES = ["ru", "uz", "en"] as const;
export type Locale = (typeof LOCALES)[number];

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

export type SiteSettingsTranslation = {
  siteDescription: string;
  deliveryPolicy?: string;
  seoTitle?: string;
  seoDescription?: string;
};
```

### Product

```ts
{
  slug: string,                         // stable English slug, unique
  translations: {
    ru: ProductTranslation,
    uz: ProductTranslation,
    en: ProductTranslation
  },
  // price, stock, images, flags, categoryId va boshqa language-neutral fields
}
```

### Category

```ts
{
  slug: string,                         // stable English slug, unique
  translations: {
    ru: CategoryTranslation,
    uz: CategoryTranslation,
    en: CategoryTranslation
  },
  // image, order, status
}
```

### Site settings

`siteName`, phone, email, address, social URLlar, delivery fee va working-hours operatsion/universal maydon bo‘lib qoladi. Ko‘rinadigan description, delivery policy va default SEO `translations.ru/uz/en` ichida saqlanadi. Admin settings formi shu kontent uchun locale tablarini beradi.

Product/category image recordidagi mavjud admin alt fallback sifatida saqlanadi. Public renderda image alt tanlangan locale’dagi entity nomidan hosil qilinadi; natijada ruscha sahifada o‘zbekcha alt qolib ketmaydi.

Search uch til bo‘yicha ishlaydi. Compound text index o‘rniga hozirgi kichik katalog uchun escaped case-insensitive query translations maydonlariga qo‘llanadi; katalog kattalashganda Atlas Search adapteri alohida seam ortidan qo‘shilishi mumkin.

Repository `locale` qabul qiladi va faqat tanlangan tarjimani public DTOga serialize qiladi. Shuning uchun Client Componentlar Mongo translation objectining hammasini olmaydi va bundle/data leakage kamayadi.

### Existing data migration

Seed 12 mahsulot va 6 kategoriya uchun `ru/uz/en` kontent bilan yangilanadi. Idempotent migration/seed stable `slug` bo‘yicha mavjud recordni update qiladi; duplicate yaratmaydi. Eski top-level kontent production migration tugamaguncha read fallback sifatida qo‘llab-quvvatlanadi, ammo yangi admin save uchala tarjimani talab qiladi. Migration verificationdan keyin public read path faqat `translations`ni authoritative deb oladi.

### Order snapshot

Checkout payload `locale`ni yuboradi. Server enum orqali validate qiladi va order line snapshotiga buyurtma berilgan tildagi `name`ni yozadi. Narx, stock va product identity baribir serverdan qayta o‘qiladi; client yuborgan tarjima/price ishonchli manba emas.

## 6. SEO design

Har locale uchun server-side metadata yaratiladi:

- locale-specific `title` va `description`;
- self canonical;
- `alternates.languages`: `ru-RU`, `uz-UZ`, `en` va `x-default -> /ru`;
- locale-specific Open Graph locale va alternateLocale;
- `html lang` request locale’ga teng;
- localized `Organization`, `WebSite`, breadcrumb va `Product` JSON-LD matnlari;
- sitemapda home/catalog/product URLlari uch locale uchun va language alternates bilan;
- legacy URLlar sitemapga kiritilmaydi;
- filtered query variantlar canonical katalog URLiga qaytadi;
- admin/API robots orqali indekslanmaydi.

Product slug stable bo‘lgani uchun localized alternate mapping DB join yoki localized slug collision talab qilmaydi.

## 7. Premium visual direction

### Subject va single job

Subject: Toshkentdagi zamonaviy premium florist uyi. Auditoriya: sifatli buketni tez tanlab, ishonch bilan buyurtma bermoqchi bo‘lgan rus/o‘zbek/ingliz tilidagi xaridor. Sahifaning asosiy vazifasi: mahsulotni vizual jihatdan istaladigan qilib ko‘rsatish va katalogdan cart/checkoutgacha ishqalanishni kamaytirish.

### Token system

| Token | Qiymat | Vazifa |
| --- | --- | --- |
| Ink | `#2B171D` | asosiy matn va kuchli CTA |
| Garnet | `#A62F4D` | brand/action accent |
| Rose | `#D85C78` | active/hover/notice |
| Porcelain | `#FFFCFB` | asosiy fon |
| Petal mist | `#F8EEF1` | section/card soft surface |
| Sage | `#52685A` | availability va trust state |

Display role uchun Cyrillic va Latin glyphlarini qo‘llaydigan `Prata`, interface/body uchun `Manrope` ishlatiladi. Fontlar `next/font/google` orqali build vaqtida self-hosted/optimized bo‘ladi; CSS `@import` bilan runtime Google Fonts request qilmaydi.

### Layout

```text
Desktop
┌─────────────────────────────────────────────────────────────┐
│ utility · wordmark · nav · RU/UZ/EN · cart                  │
├─────────────────────────────────────────────────────────────┤
│ editorial hero copy             │ floral photographic frame│
├─────────────────────────────────────────────────────────────┤
│ catalog controls/results (4 col) │ sticky filter atelier    │
│ [rect card][rect card][rect card][rect card]                 │
└─────────────────────────────────────────────────────────────┘

Tablet/mobile
┌───────────────────────────────┐
│ compact header · locale · cart│
├───────────────────────────────┤
│ hero                          │
├───────────────────────────────┤
│ filter controls before results│
│ [rect card] [rect card]       │
└───────────────────────────────┘
```

### Product card

- Media frame to‘liq to‘rtburchak: `aspect-ratio: 4 / 5`, 18–22 px radius; arka/oval top yo‘q.
- Butun card porcelain surface, 1 px rose-gray hairline va juda yengil shadow bilan ajraladi.
- Badge chap yuqorida, favorite o‘ng yuqorida; ikkalasi rasmni to‘sib qo‘ymaydi.
- Content area flex column bo‘lib actionlarni bir qatorda teng pastga joylaydi.
- Product nomi 2 qatordan, meta 2 qatordan oshmaydi; price hierarchy kuchli.
- Hover: card 3 px ko‘tariladi, rasm 1.025 scale; reduced-motionda transform o‘chadi.
- Focus state accent ring bilan aniq; barcha actionlar 44 px minimum target.
- Desktopda 4 columns, tablet/mobileda 2 columns; eng tor viewportda matn/action sig‘masa 1 column breakpoint ishlatiladi.

### Signature element

Brendning esda qoladigan elementi — hero va katalog bo‘ylab ishlatiladigan “florist’s ribbon line”: bir dona ingichka garnet chiziq headline ostidan card/filter active statesgacha davom etadigan vizual ritm. Bu gul o‘ramidagi lentani eslatadi; boshqa dekoratsiyalar ataylab sokin saqlanadi.

### Self-critique

Warm ivory + serif florist saytlarda ko‘p uchraydi. Generic ko‘rinishni kamaytirish uchun:

- oddiy cream/terracotta palitrasi emas, hozirgi Nafis rose/garnet identiteti saqlanadi;
- signature sifatida faqat ribbon line ishlatiladi; glassmorphism, gradient blob va ortiqcha ornament qo‘shilmaydi;
- premiumlik katta radius va shadow ko‘paytirishdan emas, typographic rhythm, imagery crop, hairline va spacingdan olinadi;
- kartalar bir xil balandlikdagi commerce grid sifatida ishlaydi, editorial shakl mahsulot rasmiga halal bermaydi.

## 8. Component va data flow

```text
Request /{locale}/catalog?q=...&sale=true
  -> locale proxy validation
  -> Server Component parses filters + locale
  -> Catalog service(locale, filters)
  -> Mongo repository translations.{locale}
  -> localized public DTO
  -> NextIntlClientProvider + interactive StorefrontClient
  -> cart/favorite/filter/quick-view client state
```

Muhim component chegaralari:

- Server Components: locale validation, data fetch, metadata, JSON-LD, sitemap.
- Client Components: language switch interaction, filter/cart/favorite/quick-view/checkout forms.
- Shared typed routing helper: public pathlarni string-concatenation tarqalishidan saqlaydi.
- Admin/API locale-independent; public product/category mutations barcha locale cache taglarini invalidate qiladi.

## 9. Error, fallback va accessibility

- Noto‘g‘ri locale `notFound()` yoki default redirect bilan noindex duplicate yaratmaydi.
- Mongo translation missing bo‘lsa migration davrida RU -> legacy fallback ishlaydi va serverda sanitizatsiyalangan warning chiqadi; userga raw DB error chiqmaydi.
- Productionda Mongo ulanishsiz bootstrap inventory “live” deb ko‘rsatilmaydi.
- Locale switcher ayni route mavjud bo‘lmasa locale homega xavfsiz fallback qiladi.
- Keyboard focus order DOM/visual orderga mos; mobile overlay focus trap va Escape restore regress qilmaydi.
- `prefers-reduced-motion` barcha yangi hover/reveal motionni cheklaydi.
- Contrast, accessible names, live result/cart status va 44 px targets saqlanadi.

## 10. Git va Vercel release

### Git

Workspace hozir repository emas. Ish boshida xavfsiz baseline va rollback nuqtasi yaratiladi; remote publish esa implementation va fresh gatesdan keyin bajariladi:

1. `.env.local`, `.next`, `dist`, `*.tsbuildinfo`, test/build output, logs va local state `.gitignore`da qolishi tekshiriladi.
2. `git init --initial-branch=main` va mavjud working application uchun baseline commit yaratiladi.
3. Har mustaqil TDD deliverable kichik, scoped commit bilan saqlanadi.
4. Final fresh gatesdan keyin GitHubda tavsiya bo‘yicha private `nafis-flowers` repository yaratiladi va `origin`ga ulanadi.
5. `main` push qilinadi; remote URL va commit SHA qayd etiladi.

Repo visibility yoki accountni avtomatik aniqlab bo‘lmasa, remote yaratish oldidan userdan faqat shu tashqi qaror so‘raladi.

### Vercel

Vercel project GitHub repositoryga ulanadi. Required production environment:

```text
MONGODB_URI                 # public internetdan ruxsatli Atlas replica set
NEXTAUTH_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
NEXTAUTH_URL                # final https domain
NEXT_PUBLIC_SITE_URL        # final https canonical domain
```

Cloudinary faqat admin upload ishlatilsa required; SMTP/Telegram optional. Secret qiymatlar Gitga kirmaydi va javobda oshkor qilinmaydi.

Local Docker Mongo URI Vercelda ishlamaydi. To‘liq funksional production deploy uchun Atlas URI kerak; u bo‘lmasa release “deployed” deb yakunlangan hisoblanmaydi. Vercel preview domain chiqqach `NEXTAUTH_URL` va `NEXT_PUBLIC_SITE_URL` final HTTPS URLga set qilinib redeploy qilinadi.

Atlas production bazasiga schema-compatible migration/seed explicit bir martalik command sifatida, deploydan oldin yoki darhol keyin ishga tushiriladi. Seed tugagani count/slug/translation completeness orqali tekshiriladi; Vercel build jarayonining o‘zida seed ishlatilmaydi.

## 11. Test strategy

### TDD automated coverage

- locale parser/default redirect/proxy matcher;
- legacy English-route redirects and query preservation;
- route helpers and language switch pathname preservation;
- RU default, UZ va EN message smoke tests;
- multilingual Product/Category schema validation;
- localized repository projection/search/fallback;
- admin requires all three translations;
- checkout locale validation and localized snapshot;
- localized metadata/canonical/hreflang/JSON-LD;
- sitemap contains every locale and excludes legacy/draft routes;
- rectangular card class/layout regression;
- language switcher/mobile navigation accessibility;
- existing cart/favorite/filter/focus-trap behavior.

### Verification gates

```text
npm run test:run
npm run typecheck
npm run lint
npm run build
```

### Real browser QA

Fresh production preview at 1440 px, 768 px and 375 px:

- RU default redirect and all three locales;
- English route segments only;
- language switch preserves catalog query/product path;
- rectangular cards and no overflow;
- filter DOM/visual order;
- cart, quick view, favorite and checkout;
- product metadata/structured data sanity;
- admin login and translated product/category editing;
- zero console errors and no failed critical network resources.

After Vercel deploy, the same core smoke path is repeated on the public HTTPS URL, including Mongo read and one controlled order/admin verification when production test data is allowed.

## 12. Acceptance criteria

- `/` rus tilidagi `/ru` storefrontga yo‘naltiradi.
- Public page segmentlari faqat `catalog`, `products`, `checkout` kabi inglizcha nomlarda.
- RU, UZ va EN UI hamda product/category contenti to‘liq almashtiriladi.
- Har locale canonical, hreflang, Open Graph, JSON-LD va sitemap bilan SEO-valid.
- Product card media arka emas, premium to‘rtburchak va barcha breakpointlarda aligned.
- Mongo/admin content workflow uchala tilni required qiladi, stable English slug saqlanadi.
- Existing cart, favorite, quick view, filters, checkout va admin auth regress qilmaydi.
- Git history secretsiz; GitHub remote va Vercel project ulangan.
- Public Vercel URL real Atlas katalogi bilan ochiladi; build va runtime xatosiz.
