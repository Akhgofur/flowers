# Nafis Flowers

Toshkent uchun o‘zbek tilidagi premium gul katalogi. Loyiha **Next.js App Router**, MongoDB, server-rendered SEO sahifalari, guest checkout va bir-adminli boshqaruv panelidan iborat.

Payme, Click va boshqa online-payment gateway bu versiyaga ataylab kiritilmagan. Buyurtma `pending` holatida yaratiladi, qoldiq atomik zaxiralanadi, operator esa admin paneldan jarayonni boshqaradi.

## Asosiy imkoniyatlar

- Server-rendered bosh sahifa, katalog va mahsulot sahifalari; canonical metadata, JSON-LD, `sitemap.xml`, `robots.txt` va mahsulot Open Graph rasmi.
- MongoDB authoritative katalogi: public qidiruv/filter, draft/archived mahsulotlarni yashirish va cache revalidation.
- Mehmon checkout: server narxi, MongoDB transaction ichidagi stock reservation, status transitionlari va bekor qilinganda qoldiqni aynan bir marta qaytarish.
- NextAuth Credentials orqali server-side himoyalangan `/admin` paneli: mahsulot, kategoriya, buyurtma va do‘kon sozlamalari.
- Admin Cloudinary upload: JPG/PNG/WebP, 5 MB gacha, alt matni majburiy; Cloudinary secretlari browserga chiqmaydi.
- Sozlangan bo‘lsa SMTP va Telegramga yangi buyurtma xabari. Ular best-effort: provider xatosi saqlangan buyurtmani bekor qilmaydi.

## Lokal ishga tushirish

```powershell
npm install
Copy-Item .env.example .env.local
```

`.env.local` ichiga kamida quyidagilarni kiriting:

```dotenv
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=kamida-32-belgilik-tasodifiy-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=$2b$12$...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`ADMIN_PASSWORD_HASH` uchun bcrypt hash yarating (plain-text parolni `.env.local`ga ham yozmang):

```powershell
node -e "import('bcryptjs').then(async ({ hash }) => console.log(await hash(process.argv[1], 12)))" "sizning-kuchli-parolingiz"
```

Keyin:

```powershell
npm run seed:catalog  # birinchi katalog uchun; idempotent
npm run dev
```

Public storefront `http://localhost:3000`, admin login esa `http://localhost:3000/admin/login` manzilida ochiladi. MongoDB sozlanmagan development muhitida vizual katalog demo ma’lumotlari bilan ko‘rinishi mumkin, lekin checkout ataylab yuborilmaydi — u soxta buyurtma yaratmaydi.

## MongoDB va production talabi

`MONGODB_URI` MongoDB Atlas replica set klasteriga ulanishi kerak. Buyurtma va ombor qoldig‘i transactionda ishlagani uchun standalone MongoDB instance production uchun mos emas.

1. Atlas’da database user va minimal kerakli IP/network access yarating.
2. Ulanish URI’ni faqat deploy secret yoki `.env.local`ga qo‘ying.
3. Production domain uchun `NEXTAUTH_URL` va `NEXT_PUBLIC_SITE_URL`ni HTTPS canonical domainga almashtiring.
4. Deploymentda `npm run build` o‘tgandan keyin `npm run start` bilan ishga tushiring.

## Ixtiyoriy integratsiyalar

Cloudinary rasm uploadi uchun:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Yangi buyurtma xabarlari uchun barcha SMTP qiymatlari birga bo‘lishi kerak:

```dotenv
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
ORDER_NOTIFICATION_EMAIL=
```

Telegram uchun:

```dotenv
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Bu ixtiyoriy qiymatlar bo‘sh bo‘lsa checkout normal ishlashda davom etadi. Notification xabari yuborilmagani order javobini `503` qilmaydi.

## Tekshiruvlar

```powershell
npm run test:run
npm run typecheck
npm run lint
npm run build
```

Testlar schema va API validation, stock reservation/cancellation, status transition, rate limit, SEO, cart/checkout UX, admin auth/API va Cloudinary upload contractlarini qamrab oladi.

## Xavfsizlik chegaralari

- `MONGODB_URI`, NextAuth secret, admin parol hash, Cloudinary secret va Telegram tokenlar source controlga kiritilmaydi.
- Admin mutationlari session va same-origin tekshiruvi bilan himoyalangan.
- Client narxi, jami va inventory ishonchli manba emas; server har safar product snapshot va stockni qayta tekshiradi.
- Payment status bu versiyada faqat `unpaid`; online payment mavjudligi haqida UI yoki API da’vosi yo‘q.
