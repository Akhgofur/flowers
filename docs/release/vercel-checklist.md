# Floraluxe — GitHub va Vercel release checklist

> Oxirgi to‘ldirilgan tekshiruv: **2026-08-12**, `9fcc53f` commit ustidan, production `https://flowers-gilt-ten.vercel.app`.
> Belgilanmagan bandlar — hali tasdiqlanmagan; ular sabab bilan izohlangan.

## 1. Preflight

- [x] `git status` faqat releasega tegishli o‘zgarishlarni ko‘rsatadi.
- [x] `npm run test:run` muvaffaqiyatli. — 66 fayl, 256/256.
- [x] `npm run test:e2e` muvaffaqiyatli. — 5/5.
- [x] `npm run typecheck` muvaffaqiyatli.
- [x] `npm run lint` muvaffaqiyatli. — 0 warning.
- [x] `npm run build` muvaffaqiyatli.
- [ ] RU, UZ va EN desktop/tablet/mobile browser QA o‘tkazilgan. — 375px mobile RU tekshirildi; 768 va 1440 hali yo‘q.
- [ ] Admin login va asosiy CRUD oqimlari tekshirilgan. — `/admin/login` 200 qaytaradi, lekin login qilinmagan.

## 2. GitHub

- [ ] Shaxsiy GitHub akkauntida `flowers` repository yaratilgan.
- [ ] Default branch `main`.
- [ ] Lokal `origin` aynan shu repositoryga ulanadi.
- [ ] Secret va `.env.local` commitga kirmagan.
- [ ] Tekshirilgan `main` GitHub’ga push qilingan.

## 3. MongoDB Atlas

- [ ] Production uchun alohida Atlas database/user mavjud.
- [ ] User faqat kerakli database uchun minimal read/write huquqiga ega.
- [ ] Network Access Vercel runtime’dan ulanishga ruxsat beradi.
- [ ] URI replica set klasteriga tegishli va database nomi ko‘rsatilgan.
- [ ] Production katalogi `npm run seed:catalog` bilan seed qilingan.
- [ ] URI log, screenshot, Git commit yoki frontend bundle’da ko‘rinmaydi.
- [ ] `npm run migrate:floraluxe -- --dry-run` natijasi tekshirilgan, so‘ng `--apply` bajarilgan.

> Lokal `127.0.0.1`/Docker Mongo URI Vercelda ishlamaydi. Deploy faqat tashqaridan ochiq Atlas URI bilan funksional hisoblanadi.

## 4. Vercel Environment Variables

Production, Preview va Development scope’larini ataylab tanlang. Majburiy qiymatlar:

```text
MONGODB_URI
NEXTAUTH_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
NEXTAUTH_URL
NEXT_PUBLIC_SITE_URL
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CRON_SECRET
```

> `CRON_SECRET` va `CLOUDINARY_*` majburiy: `src/lib/env.ts` ularni `requiredServerValue` bilan o‘qiydi, ya’ni qiymat yo‘q bo‘lsa getter exception tashlaydi. `CRON_SECRET`siz `/api/internal/order-notifications/retry` 401 o‘rniga 500 qaytaradi va kunlik cron outbox’ni hech qachon bo‘shatmaydi.

Ixtiyoriy integratsiyalar:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
ORDER_NOTIFICATION_EMAIL
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

- [ ] Secretlar Vercel Environment Variables orqali kiritilgan.
- [ ] Build logida secret qiymatlari chiqmagan.
- [ ] Birinchi domain olingach `NEXTAUTH_URL` va `NEXT_PUBLIC_SITE_URL` aynan `https://<production-domain>`ga yangilangan.
- [ ] URL o‘zgarishidan keyin yangi production deployment yaratilgan.

## 5. Production smoke test

- [x] `/` permanent redirect orqali `/ru`ga olib boradi.
- [x] `/ru`, `/uz`, `/en` ochiladi.
- [x] Har uch tilda `/catalog`, `/products/{slug}` va `/checkout` ochiladi.
- [ ] Language switcher pathname, query va hash’ni saqlaydi. — tekshirilmagan.
- [x] Katalog savat va checkout ishlaydi: mahsulot savatga qo‘shildi va `/ru/checkout`da nomi hamda summasi bilan saqlanib qoldi.
- [x] Wishlist havolasi desktop va mobileda bir xil `/{locale}/catalog?favorites=true` manziliga olib boradi.
- [ ] Buyurtma MongoDB’da yaratiladi va inventory kamayadi. — real buyurtma yaratilmadi (production ma’lumotiga yozadi).
- [x] `/admin/login` 200 qaytaradi. — panel ichidagi CRUD tekshirilmagan.
- [x] `/sitemap.xml` uch locale URL’larini beradi. — 459 `<url>`: 6 statik + 151 mahsulot × 3 til.
- [x] `/robots.txt` admin, API va checkout’ni crawl’dan bloklaydi.
- [x] Browser console’da runtime error yo‘q.
- [x] Payme/Click yoki online to‘lov haqidagi noto‘g‘ri UI matni yo‘q. — checkout’da «Онлайн-оплаты нет — оплата при получении».
- [x] 375px mobileda gorizontal overflow yo‘q va header sticky.
- [x] `CRON_SECRET` productionda o‘rnatilgan: cron endpoint noto‘g‘ri token bilan 500 emas, 401 qaytaradi.

## 6. Rollback

1. Vercel’da oxirgi sog‘lom deployment’ni Production’ga qayta promote qiling.
2. Database schema/backfill o‘zgarishi bo‘lsa oldindan olingan backup yoki forward-fix rejadan foydalaning.
3. Rollback’dan keyin `/ru`, katalog, checkout health va admin order oqimini qayta tekshiring.

Secretni hech qachon chat, terminal output, commit, issue yoki deployment description’ga yozmang.
