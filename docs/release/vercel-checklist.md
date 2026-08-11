# Nafis Flowers — GitHub va Vercel release checklist

## 1. Preflight

- [ ] `git status` faqat releasega tegishli o‘zgarishlarni ko‘rsatadi.
- [ ] `npm run test:run` muvaffaqiyatli.
- [ ] `npm run test:e2e` muvaffaqiyatli.
- [ ] `npm run typecheck` muvaffaqiyatli.
- [ ] `npm run lint` muvaffaqiyatli.
- [ ] `npm run build` muvaffaqiyatli.
- [ ] RU, UZ va EN desktop/tablet/mobile browser QA o‘tkazilgan.
- [ ] Admin login va asosiy CRUD oqimlari tekshirilgan.

## 2. GitHub

- [ ] Shaxsiy GitHub akkauntida private `nafis-flowers` repository yaratilgan.
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
```

Ixtiyoriy integratsiyalar:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
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

- [ ] `/` permanent redirect orqali `/ru`ga olib boradi.
- [ ] `/ru`, `/uz`, `/en` ochiladi.
- [ ] Har uch tilda `/catalog`, `/products/{slug}` va `/checkout` ochiladi.
- [ ] Language switcher pathname, query va hash’ni saqlaydi.
- [ ] Katalog filterlari, favorite, quick view, savat va checkout ishlaydi.
- [ ] Buyurtma MongoDB’da yaratiladi va inventory kamayadi.
- [ ] `/admin/login` ishlaydi; order admin panelda ko‘rinadi.
- [ ] `/sitemap.xml` uch locale URL’larini beradi.
- [ ] `/robots.txt` admin, API va checkout’ni crawl’dan bloklaydi.
- [ ] Browser console’da runtime error yo‘q.
- [ ] Payme/Click yoki online to‘lov haqidagi noto‘g‘ri UI matni yo‘q.

## 6. Rollback

1. Vercel’da oxirgi sog‘lom deployment’ni Production’ga qayta promote qiling.
2. Database schema/backfill o‘zgarishi bo‘lsa oldindan olingan backup yoki forward-fix rejadan foydalaning.
3. Rollback’dan keyin `/ru`, katalog, checkout health va admin order oqimini qayta tekshiring.

Secretni hech qachon chat, terminal output, commit, issue yoki deployment description’ga yozmang.
