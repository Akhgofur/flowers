# Floraluxe

Toshkent uchun uch tilli premium gul katalogi. Loyiha **Next.js App Router**, TypeScript, MongoDB, server-rendered SEO sahifalari, guest checkout va bir-adminli boshqaruv panelidan iborat.

Storefront tillari:

- Ruscha — default: `/ru`
- O‘zbekcha: `/uz`
- Inglizcha: `/en`

Ichki public pathname’lar barcha tillarda inglizcha qoladi:

- `/{locale}/catalog`
- `/{locale}/products/{slug}`
- `/{locale}/checkout`

`/` doimiy ravishda `/ru`ga yo‘naltiriladi. Eski `/gullar`, `/gullar/{slug}` va `/buyurtma` manzillari ham ruscha yangi URL’larga redirect qilinadi.

Payme, Click va boshqa online-payment gateway bu versiyaga ataylab kiritilmagan. Buyurtma `pending` holatida yaratiladi, qoldiq MongoDB transaction ichida atomik zaxiralanadi, operator esa admin paneldan jarayonni boshqaradi. Xaridor faqat yetkazib berilganda naqd yoki karta orqali to‘laydi.

## Asosiy imkoniyatlar

- Server-rendered bosh sahifa, katalog va mahsulot sahifalari; har bir til uchun canonical, `hreflang`, JSON-LD, `sitemap.xml`, `robots.txt` va Open Graph metadata.
- MongoDB authoritative katalogi: public qidiruv/filter, draft va archived mahsulotlarni yashirish, cache revalidation.
- Har bir kategoriya, mahsulot va do‘kon matni uchun majburiy RU/UZ/EN tarjimalari.
- Mehmon checkout: server narxi, transaction ichidagi stock reservation, status transitionlari va bekor qilinganda qoldiqni aynan bir marta qaytarish.
- NextAuth Credentials orqali server-side himoyalangan `/admin` paneli: mahsulot, kategoriya, buyurtma va do‘kon sozlamalari.
- Admin Cloudinary upload: JPG/PNG/WebP, 5 MB gacha, alt matni majburiy; Cloudinary secretlari browserga chiqmaydi.
- MongoDB outbox orqali Telegram guruhiga ishonchli yangi buyurtma xabari: avtomatik retry, admin’dan qayta yuborish va provider xatosida ham saqlangan buyurtmani bekor qilmaslik.

## Lokal ishga tushirish

```powershell
npm install
Copy-Item .env.example .env.local
```

`.env.local` ichiga kamida quyidagilarni kiriting:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/floraluxe?replicaSet=rs0
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=kamida-32-belgilik-tasodifiy-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=$2b$12$...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Checkout MongoDB transaction ishlatadi. Shu sabab lokal Mongo ham replica set sifatida ishga tushirilishi kerak; oddiy standalone instance yetarli emas.

`ADMIN_PASSWORD_HASH` uchun bcrypt hash yarating. Plain-text parolni `.env.local`ga ham, Git’ga ham yozmang:

```powershell
node -e "import('bcryptjs').then(async ({ hash }) => console.log(await hash(process.argv[1], 12)))" "sizning-kuchli-parolingiz"
```

Keyin:

```powershell
npm run seed:catalog
npm run dev
```

`seed:catalog` `.env.local`ni o‘zi yuklaydi va qayta ishlatilganda duplicate yaratmaydi. U 6 kategoriya, 12 mahsulot va default do‘kon sozlamalarini RU/UZ/EN tarjimalari bilan yaratadi yoki yangilaydi.

Lokal manzillar:

- Ruscha storefront: `http://localhost:3000/ru`
- O‘zbekcha storefront: `http://localhost:3000/uz`
- Inglizcha storefront: `http://localhost:3000/en`
- Admin login: `http://localhost:3000/admin/login`

MongoDB ishlamasa vizual storefront fallback katalog bilan ko‘rinishi mumkin, lekin checkout ataylab buyurtma yubormaydi — soxta order yaratilmaydi.

## MongoDB va production talabi

Production uchun `MONGODB_URI` Vercel serverlaridan ochiq bo‘lgan MongoDB Atlas replica-set klasteriga ulanishi kerak. `127.0.0.1` yoki lokal Docker manzili Vercelda ishlamaydi.

1. Atlas’da alohida database user yarating va Network Access’ni Vercelga moslang.
2. URI’ni faqat Vercel Environment Variables yoki lokal `.env.local`da saqlang.
3. Production domain ma’lum bo‘lgach `NEXTAUTH_URL` va `NEXT_PUBLIC_SITE_URL`ni aynan shu HTTPS domain bilan yangilang.
4. Production katalogini `npm run seed:catalog` bilan bir marta seed qiling.

To‘liq deploy ketma-ketligi [Vercel release checklist](./docs/release/vercel-checklist.md)da yozilgan.

## Integratsiyalar

Cloudinary rasm uploadi uchun:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Telegram buyurtma xabarlari uchun:

```dotenv
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=kamida-32-belgilik-tasodifiy-secret
```

Buyurtma MongoDB transaction ichida notification outbox yozuvi bilan birga saqlanadi. Checkout commit’dan keyin Telegramga darhol yuborishga urinadi; vaqtinchalik xatoda Vercel Cron `/api/cron/order-notifications` orqali 1, 5, 15, 60 va 240 daqiqalik interval bilan qayta urinadi. Telegram javob bermagani order javobini `503` qilmaydi. Bot real guruhga xabar yuborishi uchun `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` va Vercel’dagi `CRON_SECRET` production environment’da majburiy.

## Tekshiruvlar

```powershell
npm run test:run
npm run test:e2e
npm run typecheck
npm run lint
npm run build
```

Testlar locale routing, schema va API validation, stock reservation/cancellation, status transition, rate limit, SEO, responsive premium katalog, cart/checkout UX, admin auth/API va Cloudinary upload contractlarini qamrab oladi.

## Xavfsizlik chegaralari

- `MONGODB_URI`, `NEXTAUTH_SECRET`, admin parol hash, Cloudinary secretlari, Telegram tokeni va cron secret source controlga kiritilmaydi.
- Admin mutationlari session va same-origin tekshiruvi bilan himoyalangan.
- Client narxi, jami va inventory ishonchli manba emas; server har safar product snapshot va stockni qayta tekshiradi.
- Payment status bu versiyada faqat `unpaid`; Payme/Click yoki boshqa online to‘lov mavjudligi haqida UI va API’da da’vo yo‘q.
