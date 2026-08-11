# Nafis Flowers — Interaktiv katalog dizayni

**Status:** Dizayn yo‘nalishi tanlandi; funksional front-end uchun review kutilmoqda.  
**Sana:** 2026-08-10

## Maqsad

Reference’dagi yengil, premium florist sahifasi vizual ierarxiyasini saqlagan holda Nafis brendi uchun responsive, interaktiv katalog yaratish. Sahifadagi foydalanuvchi ko‘radigan barcha asosiy boshqaruvlar real state bilan ishlaydi; demo ma’lumotlari brauzerda saqlanadi.

## Tavsiya qilingan yondashuv

**React + TypeScript + Vite, lokal katalog ma’lumotlari va localStorage state bilan.**

Bu yondashuv filter, savat, quick-view va kelajakdagi API integratsiyasini toza komponent chegaralarida ushlab turadi. Oddiy HTML/JS bir martalik demo uchun tezroq, ammo katalog state’i kengayganda qiyin boshqariladi; Next.js + backend hozircha ortiqcha, chunki repo, backend va to‘lov credentiallari berilmagan.

## Chegara

### Ishlaydigan frontend funksiyalar

| Ko‘rinadigan qism | Xatti-harakat |
| --- | --- |
| Hero slider | 3 ta kolleksiya slaydi, oldingi/keyingi tugmalar va dot-nav; klaviaturada ham ishlaydi. |
| Header navigatsiyasi | Tegishli sahifa bo‘limlariga smooth-scroll; mobile’da collapsible menu. |
| Kategoriya kartalari | Katalogni tanlangan kategoriya bo‘yicha filtrlaydi va mahsulotlar bo‘limiga olib boradi. |
| Search, rang, gul turi va narx filterlari | Natijalarni birgalikda filtrlaydi; Filtrni qo‘llash tanlangan qiymatlarni qo‘llaydi, Tozalash default holatga qaytaradi. |
| Katalog tabs | Barchasi, Yangi va Aksiya mahsulotlarini almashtiradi. |
| Mahsulot kartasi | Detail/quick-view ochadi; tanlangan mahsulotning narxi, tavsifi, tarkibi va yetkazish vaqti ko‘rsatiladi. |
| Favorite | Mahsulotni sevimlilarga qo‘shadi/oladi; holat localStorage’da saqlanadi. |
| Savat | Karta yoki quick-view’dan qo‘shish, miqdorni oshirish/kamaytirish, itemni olib tashlash, umumiy summa va countni hisoblash; drawer orqali ko‘rsatiladi va localStorage’da saqlanadi. |
| Quick-view | Ochish/yopish, mahalliy product state, quantity control va savatga qo‘shish. |
| Promo CTA | Aksiya yoki sovg‘a kategoriyasini tanlaydi; buzilgan/no-op link bo‘lmaydi. |
| Responsive UX | Desktop, tablet va mobile breakpointlar; horizontal overflow bo‘lmaydi; touch targetlar kamida 40px. |

### Chegaradan tashqari

- Haqiqiy online-to‘lov, payment gateway yoki karta ma’lumotlarini qabul qilish.
- Yetkazib beruvchiga buyurtma yuborish, live inventory va admin panel.
- Login/ro‘yxatdan o‘tish, serverdagi favorite yoki real order history.

Bu imkoniyatlar keyin REST/GraphQL API va autentifikatsiya bilan bog‘lanishi mumkin; hozirgi savat oqimi UX demo sifatida aniq “Buyurtmani rasmiylashtirish demo versiyada mavjud emas” xabari bilan yakunlanadi.

## Arxitektura

    Static catalog data
            ↓
    React page state ─────→ Catalog filters / visible products
            ↓                         ↓
    localStorage adapter ← Cart + favorites + UI selection
            ↓
    Header count · Product cards · Quick-view · Cart drawer

### Fayl chegaralari

    src/
      app/
        App.tsx                  # sahifa kompozitsiyasi va bo‘limlar
        styles.css               # global tokenlar, responsive layout
      data/
        catalog.ts               # typed products, categories, hero slides
      features/
        catalog/
          CatalogGrid.tsx
          CatalogFilters.tsx
          catalog-utils.ts       # pure filtering/sorting
        cart/
          CartDrawer.tsx
          cart-storage.ts
        product/
          ProductQuickView.tsx
      shared/
        types.ts
        icons.tsx

App.tsx faqat composition va kichik orchestratsiya uchun javobgar bo‘ladi. Filtering pure utility’da qoladi, cart persistence adapter’da qoladi, va view komponentlari reusable props orqali state qabul qiladi.

## Ma’lumot modeli

    type Product = {
      id: string;
      name: string;
      price: number;
      originalPrice?: number;
      image: string;
      category: CategoryId;
      flowerTypes: FlowerType[];
      colors: ProductColor[];
      isNew: boolean;
      isOnSale: boolean;
      shortDescription: string;
      composition: string[];
      deliveryEstimate: string;
      size: string;
    };

    type CartLine = {
      productId: Product["id"];
      quantity: number;
    };

Product katalogning yagona manbasi bo‘ladi. Cart har doim productId bilan saqlanadi; display va summalar render paytida katalogdan olinadi. Bu eski yoki buzilgan localStorage ma’lumotini xavfsiz normalizatsiya qilishga imkon beradi.

## UX va holatlar

- Katalogda natija chiqmasa, filtrni tozalash CTA’si bo‘lgan empty state ko‘rsatiladi.
- localStorage o‘qilmasa yoki JSON buzilgan bo‘lsa, state bo‘sh holatga qaytadi; sahifa crash qilmaydi.
- Qo‘shilgan mahsulot uchun qisqa accessible toast ko‘rsatiladi.
- Savat count nol bo‘lsa, badge yashirinadi; drawer’da empty-state va “Katalogga qaytish” CTA’si bo‘ladi.
- Modal/drawer ochilganda Escape yopadi, fokus ichida qoladi va close button klaviatura bilan ishlaydi.
- Product image’lar meaningful alt matn oladi; ikonali tugmalar aria-label bilan belgilanadi.
- Barcha so‘m formatlari uz-UZ locale bilan yoziladi.

## Vizual yo‘nalish

- Reference’dagi airy pink/white florist mood, katta hero buketi va yumaloq kartalar saqlanadi.
- Nafis — original wordmark va kompozitsiya; reference logotipi, nomi, mahsulot matnlari yoki tasvirlari ko‘chirilmaydi.
- Rangi: #D04E6A aksent, warm white fon, subtile pink cards.
- Tipografiya: Playfair Display (display) + DM Sans (UI).

## Tekshiruv mezonlari

1. Build va type-check xatosiz o‘tadi.
2. Har bir header/hero/category/CTA elementi ko‘rinadigan ishchi natijaga olib keladi.
3. Qidiruv, bir nechta filter va reset natijalarni to‘g‘ri o‘zgartiradi.
4. Savatdagi count, line quantity va total refresh’dan keyin saqlanadi.
5. Favorite state refresh’dan keyin saqlanadi.
6. Quick-view, cart drawer va mobile navigation keyboard bilan ochilib-yopiladi.
7. 375px, 768px va 1440px viewportlarda asosiy flow va sticky/overlay elementlar buzilmaydi.

## Keyingi bosqich

Spetsifikatsiya tasdiqlangach, Vite React TypeScript loyiha scaffold qilinadi, komponentlar implementatsiya qilinadi va browserda real interaksiyalar tekshiriladi.
