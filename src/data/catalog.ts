import type { Category, HeroSlideConfig, Product } from "../shared/types";
import type {
  CategoryTranslation,
  Localized,
  ProductTranslation,
} from "../lib/contracts";

/**
 * Bootstrap data only. `scripts/seed-catalog.ts` persists these records to
 * MongoDB; public storefront reads must use the catalog service instead.
 */

const BASE_PRODUCTS: Product[] = [
  {
    id: "scarlet-roses",
    name: "Qirmizi atirgul buketi",
    price: 535000,
    originalPrice: 595000,
    image: "https://images.pexels.com/photos/27516489/pexels-photo-27516489.jpeg?auto=compress&cs=tinysrgb&w=900",
    category: "roses",
    flowerTypes: ["rose"],
    colors: ["red"],
    isNew: false,
    isOnSale: true,
    shortDescription: "Yurakdan aytilgan so'zlar uchun baxmaldek qirmizi atirgullar.",
    composition: ["25 ta qirmizi atirgul", "Evkalipt", "Atlas lenta"],
    deliveryEstimate: "Bugun 90 daqiqada",
    size: "55 sm",
  },
  {
    id: "morning-tulips",
    name: "Tonggi lola dastasi",
    price: 285000,
    image: "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=900&q=85",
    category: "tulips",
    flowerTypes: ["tulip"],
    colors: ["yellow", "white"],
    isNew: true,
    isOnSale: false,
    shortDescription: "Quyoshdek iliq kayfiyat ulashadigan yangi lolalar.",
    composition: ["35 ta sariq va oq lola", "Yashil barglar", "Kraft qog'oz"],
    deliveryEstimate: "Bugun 2 soatda",
    size: "45 sm",
  },
  {
    id: "pink-peony",
    name: "Pushti pion buketi",
    price: 485000,
    image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=85",
    category: "mixed",
    flowerTypes: ["peony", "seasonal"],
    colors: ["pink", "peach"],
    isNew: true,
    isOnSale: false,
    shortDescription: "Nozik pionlar va yozgi gullardan tuzilgan mayin kompozitsiya.",
    composition: ["7 ta pushti pion", "Mavsumiy gullar", "Ipak lenta"],
    deliveryEstimate: "Ertaga 10:00 dan",
    size: "50 sm",
  },
  {
    id: "violet-orchid",
    name: "Binafsha orkide",
    price: 420000,
    image: "https://images.pexels.com/photos/16872910/pexels-photo-16872910.jpeg?auto=compress&cs=tinysrgb&w=900",
    category: "orchids",
    flowerTypes: ["orchid"],
    colors: ["purple"],
    isNew: false,
    isOnSale: false,
    shortDescription: "Binafsha orkide bilan uzoq esda qoladigan e'tibor belgisi.",
    composition: ["2 shoxli orkide", "Keramika tuvak", "Parvarish kartasi"],
    deliveryEstimate: "Bugun 3 soatda",
    size: "60 sm",
  },
  {
    id: "rose-box",
    name: "Atirgullar qutisi",
    price: 650000,
    originalPrice: 720000,
    image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=85",
    category: "boxed",
    flowerTypes: ["rose"],
    colors: ["pink", "white"],
    isNew: false,
    isOnSale: true,
    shortDescription: "Sovg'a qutisidagi mayin atirgullar bayramga tayyor holatda.",
    composition: ["29 ta pushti atirgul", "Shlyapa qutisi", "Tabrik kartasi"],
    deliveryEstimate: "Bugun 2 soatda",
    size: "32 sm",
  },
  {
    id: "wedding-cloud",
    name: "Oq kelin guldastasi",
    price: 780000,
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=85",
    category: "wedding",
    flowerTypes: ["rose", "seasonal"],
    colors: ["white", "green"],
    isNew: false,
    isOnSale: false,
    shortDescription: "Nikoh marosimi uchun yengil va sof oq rangdagi guldasta.",
    composition: ["Oq spray atirgullar", "Eustoma", "Evkalipt"],
    deliveryEstimate: "Oldindan buyurtma: 24 soat",
    size: "35 sm",
  },
  {
    id: "peach-garden",
    name: "Shaftolirang bog'",
    price: 395000,
    image: "https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=900&q=85",
    category: "mixed",
    flowerTypes: ["rose", "seasonal"],
    colors: ["peach", "pink"],
    isNew: false,
    isOnSale: false,
    shortDescription: "Shaftolirang atirgullar bilan iliq, xushchaqchaq sovg'a.",
    composition: ["15 ta spray atirgul", "Alstromeriya", "Kraft qog'oz"],
    deliveryEstimate: "Bugun 2 soatda",
    size: "48 sm",
  },
  {
    id: "blue-iris-mix",
    name: "Moviy shabada",
    price: 345000,
    image: "https://images.unsplash.com/photo-1470509037663-253afd7f0f51?auto=format&fit=crop&w=900&q=85",
    category: "mixed",
    flowerTypes: ["seasonal", "mixed"],
    colors: ["blue", "white", "green"],
    isNew: true,
    isOnSale: false,
    shortDescription: "Moviy va oq tuslardagi sokin, zamonaviy guldasta.",
    composition: ["Irislar", "Oq eustoma", "Dekorativ ko'kat"],
    deliveryEstimate: "Bugun 3 soatda",
    size: "52 sm",
  },
  {
    id: "coral-tulips",
    name: "Marjon lolalar",
    price: 315000,
    image: "https://images.unsplash.com/photo-1469259943454-aa100abba749?auto=format&fit=crop&w=900&q=85",
    category: "tulips",
    flowerTypes: ["tulip"],
    colors: ["pink", "peach"],
    isNew: false,
    isOnSale: false,
    shortDescription: "Yengil va nafis marjon tusdagi lolalar dastasi.",
    composition: ["41 ta marjon lola", "Yashil barglar", "Floraluxe o'ram"],
    deliveryEstimate: "Bugun 90 daqiqada",
    size: "46 sm",
  },
  {
    id: "ruby-heart",
    name: "Yoqut yurak",
    price: 890000,
    image: "https://images.pexels.com/photos/34701064/pexels-photo-34701064.jpeg?auto=compress&cs=tinysrgb&w=900",
    category: "boxed",
    flowerTypes: ["rose"],
    colors: ["red"],
    isNew: true,
    isOnSale: false,
    shortDescription: "Muhim kunlar uchun yurak shaklidagi qutida qirmizi atirgullar.",
    composition: ["45 ta qirmizi atirgul", "Yurak shaklidagi quti", "Saten lenta"],
    deliveryEstimate: "Ertaga 12:00 dan",
    size: "40 sm",
  },
  {
    id: "ivory-orchid",
    name: "Sokin oq orkide",
    price: 465000,
    originalPrice: 510000,
    image: "https://images.pexels.com/photos/6612876/pexels-photo-6612876.jpeg?auto=compress&cs=tinysrgb&w=900",
    category: "orchids",
    flowerTypes: ["orchid"],
    colors: ["white", "green"],
    isNew: false,
    isOnSale: true,
    shortDescription: "Uy va ofisga nafislik qo'shadigan oppoq orkide.",
    composition: ["2 shoxli oq orkide", "Keramika tuvak", "Mox qoplami"],
    deliveryEstimate: "Bugun 3 soatda",
    size: "58 sm",
  },
  {
    id: "wedding-pink",
    name: "Pushti nikoh guldastasi",
    price: 735000,
    image: "https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=900&q=85",
    category: "wedding",
    flowerTypes: ["rose", "peony"],
    colors: ["pink", "white"],
    isNew: true,
    isOnSale: false,
    shortDescription: "Pion va atirgullardan yaratilgan romantik kelin guldastasi.",
    composition: ["Pushti pion", "Oq atirgul", "Ipak lenta"],
    deliveryEstimate: "Oldindan buyurtma: 24 soat",
    size: "38 sm",
  },
];

const BASE_CATEGORIES: Category[] = [
  {
    id: "roses",
    title: "Atirgullar",
    productCount: 1,
    image: "https://images.pexels.com/photos/12366357/pexels-photo-12366357.jpeg?auto=compress&cs=tinysrgb&w=700",
    icon: "rose",
  },
  {
    id: "tulips",
    title: "Lolalar",
    productCount: 2,
    image: "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=700&q=85",
    icon: "tulip",
  },
  {
    id: "mixed",
    title: "Aralash buketlar",
    productCount: 3,
    image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=700&q=85",
    icon: "bouquet",
  },
  {
    id: "orchids",
    title: "Orkideler",
    productCount: 2,
    image: "https://images.pexels.com/photos/6725474/pexels-photo-6725474.jpeg?auto=compress&cs=tinysrgb&w=700",
    icon: "orchid",
  },
  {
    id: "boxed",
    title: "Sovg'a qutilari",
    productCount: 2,
    image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=700&q=85",
    icon: "gift",
  },
  {
    id: "wedding",
    title: "To'y gullari",
    productCount: 2,
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=700&q=85",
    icon: "wedding",
  },
];

export type BootstrapProduct = Product & {
  translations: Localized<ProductTranslation>;
};

export type BootstrapCategory = Category & {
  translations: Localized<CategoryTranslation>;
};

const PRODUCT_TRANSLATIONS: Record<
  string,
  Pick<Localized<ProductTranslation>, "ru" | "en">
> = {
  "scarlet-roses": {
    ru: {
      name: "Букет алых роз",
      shortDescription: "Бархатные алые розы для самых важных признаний.",
      description: "Выразительный авторский букет из свежих алых роз с эвкалиптом и атласной лентой.",
      composition: ["25 алых роз", "Эвкалипт", "Атласная лента"],
      deliveryEstimate: "Сегодня от 90 минут",
      size: "55 см",
    },
    en: {
      name: "Scarlet rose bouquet",
      shortDescription: "Velvet scarlet roses for the feelings that matter most.",
      description: "A striking signature bouquet of fresh scarlet roses, eucalyptus and satin ribbon.",
      composition: ["25 scarlet roses", "Eucalyptus", "Satin ribbon"],
      deliveryEstimate: "Today from 90 minutes",
      size: "55 cm",
    },
  },
  "morning-tulips": {
    ru: {
      name: "Утренние тюльпаны",
      shortDescription: "Свежие тюльпаны с тёплым солнечным настроением.",
      description: "Лёгкий букет жёлтых и белых тюльпанов в натуральной крафтовой упаковке.",
      composition: ["35 жёлтых и белых тюльпанов", "Зелень", "Крафтовая бумага"],
      deliveryEstimate: "Сегодня за 2 часа",
      size: "45 см",
    },
    en: {
      name: "Morning tulips",
      shortDescription: "Fresh tulips with a warm, sunlit mood.",
      description: "An airy bouquet of yellow and white tulips wrapped in natural kraft paper.",
      composition: ["35 yellow and white tulips", "Fresh greenery", "Kraft paper"],
      deliveryEstimate: "Today within 2 hours",
      size: "45 cm",
    },
  },
  "pink-peony": {
    ru: {
      name: "Букет розовых пионов",
      shortDescription: "Нежная композиция из пионов и сезонных цветов.",
      description: "Воздушный букет розовых пионов с сезонными акцентами и шелковой лентой.",
      composition: ["7 розовых пионов", "Сезонные цветы", "Шёлковая лента"],
      deliveryEstimate: "Завтра с 10:00",
      size: "50 см",
    },
    en: {
      name: "Pink peony bouquet",
      shortDescription: "A delicate composition of peonies and seasonal flowers.",
      description: "An airy bouquet of pink peonies, seasonal accents and a silk ribbon.",
      composition: ["7 pink peonies", "Seasonal flowers", "Silk ribbon"],
      deliveryEstimate: "Tomorrow from 10:00",
      size: "50 cm",
    },
  },
  "violet-orchid": {
    ru: {
      name: "Фиолетовая орхидея",
      shortDescription: "Изысканный знак внимания, который останется надолго.",
      description: "Цветущая фиолетовая орхидея в керамическом кашпо с памяткой по уходу.",
      composition: ["Двухветочная орхидея", "Керамическое кашпо", "Памятка по уходу"],
      deliveryEstimate: "Сегодня за 3 часа",
      size: "60 см",
    },
    en: {
      name: "Violet orchid",
      shortDescription: "An elegant gesture designed to be remembered.",
      description: "A blooming violet orchid in a ceramic planter with a simple care card.",
      composition: ["Two-stem orchid", "Ceramic planter", "Care card"],
      deliveryEstimate: "Today within 3 hours",
      size: "60 cm",
    },
  },
  "rose-box": {
    ru: {
      name: "Розы в шляпной коробке",
      shortDescription: "Нежные розы в подарочной коробке, готовые к вручению.",
      description: "Праздничная композиция из роз в шляпной коробке с открыткой для вашего послания.",
      composition: ["29 розовых роз", "Шляпная коробка", "Поздравительная открытка"],
      deliveryEstimate: "Сегодня за 2 часа",
      size: "32 см",
    },
    en: {
      name: "Roses in a hatbox",
      shortDescription: "Soft roses in a gift box, ready to be presented.",
      description: "A celebratory rose arrangement in a hatbox with a card for your personal note.",
      composition: ["29 pink roses", "Hatbox", "Greeting card"],
      deliveryEstimate: "Today within 2 hours",
      size: "32 cm",
    },
  },
  "wedding-cloud": {
    ru: {
      name: "Белое свадебное облако",
      shortDescription: "Чистый и лёгкий букет для свадебной церемонии.",
      description: "Невесомый букет невесты из белых кустовых роз, эустомы и эвкалипта.",
      composition: ["Белые кустовые розы", "Эустома", "Эвкалипт"],
      deliveryEstimate: "Предзаказ за 24 часа",
      size: "35 см",
    },
    en: {
      name: "White bridal cloud",
      shortDescription: "A pure, weightless bouquet for the wedding ceremony.",
      description: "An ethereal bridal bouquet of white spray roses, lisianthus and eucalyptus.",
      composition: ["White spray roses", "Lisianthus", "Eucalyptus"],
      deliveryEstimate: "Pre-order 24 hours ahead",
      size: "35 cm",
    },
  },
  "peach-garden": {
    ru: {
      name: "Персиковый сад",
      shortDescription: "Тёплый и жизнерадостный подарок с персиковыми розами.",
      description: "Мягкая садовая композиция из кустовых роз и альстромерии в крафтовой упаковке.",
      composition: ["15 кустовых роз", "Альстромерия", "Крафтовая бумага"],
      deliveryEstimate: "Сегодня за 2 часа",
      size: "48 см",
    },
    en: {
      name: "Peach garden",
      shortDescription: "A warm, joyful gift built around peach roses.",
      description: "A soft garden-style arrangement of spray roses and alstroemeria in kraft wrap.",
      composition: ["15 spray roses", "Alstroemeria", "Kraft paper"],
      deliveryEstimate: "Today within 2 hours",
      size: "48 cm",
    },
  },
  "blue-iris-mix": {
    ru: {
      name: "Голубой бриз",
      shortDescription: "Спокойный современный букет в голубых и белых тонах.",
      description: "Свежая композиция из ирисов, белой эустомы и декоративной зелени.",
      composition: ["Ирисы", "Белая эустома", "Декоративная зелень"],
      deliveryEstimate: "Сегодня за 3 часа",
      size: "52 см",
    },
    en: {
      name: "Blue breeze",
      shortDescription: "A calm, modern bouquet in blue and white tones.",
      description: "A fresh composition of irises, white lisianthus and decorative greenery.",
      composition: ["Irises", "White lisianthus", "Decorative greenery"],
      deliveryEstimate: "Today within 3 hours",
      size: "52 cm",
    },
  },
  "coral-tulips": {
    ru: {
      name: "Коралловые тюльпаны",
      shortDescription: "Лёгкий букет тюльпанов нежного кораллового оттенка.",
      description: "Большой моно-букет коралловых тюльпанов в лаконичной фирменной упаковке.",
      composition: ["41 коралловый тюльпан", "Зелень", "Фирменная упаковка"],
      deliveryEstimate: "Сегодня от 90 минут",
      size: "46 см",
    },
    en: {
      name: "Coral tulips",
      shortDescription: "A light bouquet of tulips in a delicate coral shade.",
      description: "A generous mono bouquet of coral tulips in understated signature wrapping.",
      composition: ["41 coral tulips", "Fresh greenery", "Signature wrap"],
      deliveryEstimate: "Today from 90 minutes",
      size: "46 cm",
    },
  },
  "ruby-heart": {
    ru: {
      name: "Рубиновое сердце",
      shortDescription: "Алые розы в коробке-сердце для самых важных дат.",
      description: "Эффектная композиция из алых роз в коробке в форме сердца с атласной лентой.",
      composition: ["45 алых роз", "Коробка в форме сердца", "Атласная лента"],
      deliveryEstimate: "Завтра с 12:00",
      size: "40 см",
    },
    en: {
      name: "Ruby heart",
      shortDescription: "Scarlet roses in a heart box for milestone moments.",
      description: "A statement arrangement of scarlet roses in a heart-shaped box with satin ribbon.",
      composition: ["45 scarlet roses", "Heart-shaped box", "Satin ribbon"],
      deliveryEstimate: "Tomorrow from 12:00",
      size: "40 cm",
    },
  },
  "ivory-orchid": {
    ru: {
      name: "Белая орхидея",
      shortDescription: "Белоснежная орхидея, которая добавит интерьеру лёгкости.",
      description: "Элегантная белая орхидея в керамическом кашпо с натуральным мхом.",
      composition: ["Двухветочная белая орхидея", "Керамическое кашпо", "Натуральный мох"],
      deliveryEstimate: "Сегодня за 3 часа",
      size: "58 см",
    },
    en: {
      name: "Ivory orchid",
      shortDescription: "A white orchid that brings quiet elegance to any room.",
      description: "An elegant white orchid in a ceramic planter finished with natural moss.",
      composition: ["Two-stem white orchid", "Ceramic planter", "Natural moss"],
      deliveryEstimate: "Today within 3 hours",
      size: "58 cm",
    },
  },
  "wedding-pink": {
    ru: {
      name: "Розовый свадебный букет",
      shortDescription: "Романтичный букет невесты из пионов и роз.",
      description: "Нежный свадебный букет из розовых пионов и белых роз с шелковой лентой.",
      composition: ["Розовые пионы", "Белые розы", "Шёлковая лента"],
      deliveryEstimate: "Предзаказ за 24 часа",
      size: "38 см",
    },
    en: {
      name: "Pink wedding bouquet",
      shortDescription: "A romantic bridal bouquet of peonies and roses.",
      description: "A delicate wedding bouquet of pink peonies and white roses tied with silk ribbon.",
      composition: ["Pink peonies", "White roses", "Silk ribbon"],
      deliveryEstimate: "Pre-order 24 hours ahead",
      size: "38 cm",
    },
  },
};

const CATEGORY_TRANSLATIONS: Record<
  string,
  Pick<Localized<CategoryTranslation>, "ru" | "en">
> = {
  roses: { ru: { name: "Розы" }, en: { name: "Roses" } },
  tulips: { ru: { name: "Тюльпаны" }, en: { name: "Tulips" } },
  mixed: { ru: { name: "Смешанные букеты" }, en: { name: "Mixed bouquets" } },
  orchids: { ru: { name: "Орхидеи" }, en: { name: "Orchids" } },
  boxed: { ru: { name: "Цветы в коробках" }, en: { name: "Boxed flowers" } },
  wedding: { ru: { name: "Свадебные цветы" }, en: { name: "Wedding flowers" } },
};

function uzProductTranslation(product: Product): ProductTranslation {
  return {
    name: product.name,
    shortDescription: product.shortDescription,
    description: `${product.shortDescription} Tarkibi: ${product.composition.join(", ")}.`,
    composition: [...product.composition],
    deliveryEstimate: product.deliveryEstimate,
    size: product.size,
  };
}

export const PRODUCTS: BootstrapProduct[] = BASE_PRODUCTS.map((product) => {
  const translation = PRODUCT_TRANSLATIONS[product.id];
  if (!translation) throw new Error(`Missing product translations for ${product.id}.`);

  return {
    ...product,
    translations: {
      ru: translation.ru,
      uz: uzProductTranslation(product),
      en: translation.en,
    },
  };
});

export const CATEGORIES: BootstrapCategory[] = BASE_CATEGORIES.map((category) => {
  const translation = CATEGORY_TRANSLATIONS[category.id];
  if (!translation) throw new Error(`Missing category translations for ${category.id}.`);

  return {
    ...category,
    translations: {
      ru: translation.ru,
      uz: { name: category.title },
      en: translation.en,
    },
  };
});

export const HERO_SLIDES: HeroSlideConfig[] = [
  {
    id: "summer-flowers",
    ctaTarget: "#catalog",
    image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=90",
  },
  {
    id: "special-price",
    ctaTarget: "#sale",
    image: "https://images.pexels.com/photos/22604232/pexels-photo-22604232.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
  {
    id: "gift-moment",
    ctaTarget: "#gift",
    image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1600&q=90",
  },
];
