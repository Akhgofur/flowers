import nextEnv from "@next/env";
import { runBouquetImport, type Bouquet } from "./lib/bouquet-import";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

// Forward slashes on purpose: Node accepts them on Windows and they remove a
// whole class of escaping mistakes from a path that is edited by hand.
const SOURCE_ROOT = "C:/Users/gofur/Desktop/fl/savat/edited_corrected";
const DRY_RUN = process.argv.includes("--dry-run");

const DELIVERY = {
  ru: "Сегодня от 90 минут",
  uz: "Bugun 90 daqiqadan",
  en: "Today, from 90 minutes",
} as const;

const BASKETS: Bouquet[] = [
  {
    images: ["photo_1_2026-08-16_12-49-24.png"],
    flowerTypes: ["rose", "mixed"],
    colors: ["pink", "yellow", "white", "peach", "purple"],
    ru: {
      name: "Праздничная радуга",
      shortDescription: "Большая корзина разноцветных кустовых роз с лентами «Happy Birthday».",
      description:
        "Плотный купол кустовых роз всех оттенков — розовых, малиновых, жёлтых, белых и персиковых — в широкой плетёной корзине с воротником из глянцевой зелени, лентами «Happy Birthday» и деревянным сердцем на шпажке.",
      composition: ["Разноцветные кустовые розы", "Плетёная корзина", "Деревянное сердце и ленты"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Bayramona kamalak",
      shortDescription: "«Happy Birthday» lentalari bilan rang-barang buta atirgullardan yirik savat.",
      description:
        "Pushti, malina, sariq, oq va shaftoli tusdagi buta atirgullardan zich gumbaz — keng to‘qilgan savatda, yaltiroq yashil barglar yoqasi, «Happy Birthday» lentalari va shishga o‘rnatilgan yog‘och yurak bilan.",
      composition: ["Rang-barang buta atirgullar", "To‘qilgan savat", "Yog‘och yurak va lentalar"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Festive rainbow",
      shortDescription: "A large basket of multicoloured spray roses with Happy Birthday ribbons.",
      description:
        "A dense dome of spray roses in every shade — pink, magenta, yellow, white and peach — set in a wide woven basket with a collar of glossy foliage, Happy Birthday ribbons and a wooden heart on a pick.",
      composition: ["Multicoloured spray roses", "Woven basket", "Wooden heart and ribbons"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_2_2026-08-16_12-49-24.png"],
    flowerTypes: ["rose", "seasonal"],
    colors: ["red", "white"],
    ru: {
      name: "Алая классика",
      shortDescription: "Красные розы в белой корзине с алой атласной ручкой.",
      description:
        "Ровный купол бордовых роз в белой плетёной корзине, обрамлённый белыми ромашковыми хризантемами и глянцевой зеленью; ручка обёрнута алым атласом.",
      composition: ["Бордовые розы", "Белые хризантемы", "Белая корзина с атласной ручкой"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Qizil klassika",
      shortDescription: "Qizil atlas dastali oq savatda qizil atirgullar.",
      description:
        "Oq to‘qilgan savatda to‘q qizil atirgullardan tekis gumbaz, oq romashka xrizantemalar va yaltiroq yashil barglar bilan hoshiyalangan; dastasi qizil atlasga o‘ralgan.",
      composition: ["To‘q qizil atirgullar", "Oq xrizantemalar", "Atlas dastali oq savat"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Scarlet classic",
      shortDescription: "Red roses in a white basket with a scarlet satin handle.",
      description:
        "An even dome of deep red roses in a white woven basket, framed by white daisy chrysanthemums and glossy foliage, with the handle wrapped in scarlet satin.",
      composition: ["Deep red roses", "White chrysanthemums", "White basket with satin handle"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_3_2026-08-16_12-49-24.png"],
    flowerTypes: ["rose"],
    colors: ["purple", "pink"],
    ru: {
      name: "Фуксия и фиалка",
      shortDescription: "Кустовые розы цвета фуксии в фиолетовой корзине.",
      description:
        "Компактная корзина насыщенного фиолетового цвета с атласной ручкой, наполненная кустовыми розами оттенка фуксии и тёмными глянцевыми листьями.",
      composition: ["Кустовые розы фуксия", "Фиолетовая корзина", "Атласная ручка"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Fuksiya va binafsha",
      shortDescription: "Binafsha savatda fuksiya rangli buta atirgullar.",
      description:
        "Atlas dastali to‘q binafsha rangli ixcham savat, fuksiya tusdagi buta atirgullar va to‘q yaltiroq barglar bilan to‘ldirilgan.",
      composition: ["Fuksiya buta atirgullar", "Binafsha savat", "Atlas dasta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Fuchsia and violet",
      shortDescription: "Fuchsia spray roses in a violet basket.",
      description:
        "A compact deep-violet basket with a satin handle, filled with fuchsia spray roses and dark glossy leaves.",
      composition: ["Fuchsia spray roses", "Violet basket", "Satin handle"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_4_2026-08-16_12-49-24.png"],
    flowerTypes: ["rose"],
    colors: ["peach", "pink", "purple"],
    ru: {
      name: "Персиковый рассвет",
      shortDescription: "Персиково-розовые кустовые розы с акцентами фуксии.",
      description:
        "Купол персиково-розовых кустовых роз с вкраплениями роз цвета фуксии, уложенный в сиреневую корзину с атласной ручкой и широким воротником из глянцевой зелени.",
      composition: ["Персиковые кустовые розы", "Розы фуксия", "Сиреневая корзина"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Shaftoli tongi",
      shortDescription: "Fuksiya urg‘ulari bilan shaftoli-pushti buta atirgullar.",
      description:
        "Shaftoli-pushti buta atirgullar gumbazi, orasida fuksiya rangli atirgullar; atlas dastali siren savatda va keng yaltiroq yashil yoqa bilan.",
      composition: ["Shaftoli buta atirgullar", "Fuksiya atirgullar", "Siren savat"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Peach dawn",
      shortDescription: "Peachy-pink spray roses with fuchsia accents.",
      description:
        "A dome of peachy-pink spray roses shot through with fuchsia blooms, set in a lilac basket with a satin handle and a wide collar of glossy foliage.",
      composition: ["Peach spray roses", "Fuchsia roses", "Lilac basket"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_5_2026-08-16_12-49-24.png"],
    flowerTypes: ["rose", "seasonal"],
    colors: ["pink", "white"],
    ru: {
      name: "Розовая пудра",
      shortDescription: "Двухцветные розы и белые хризантемы в розовой корзине.",
      description:
        "Розы с кремовой серединой и розовым краем в паре с белыми ромашковыми хризантемами, собранные в плетёную корзину пудрового цвета с высокой ручкой.",
      composition: ["Двухцветные розы", "Белые хризантемы", "Розовая плетёная корзина"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Pushti pudra",
      shortDescription: "Pushti savatda ikki rangli atirgullar va oq xrizantemalar.",
      description:
        "Krem markazli va pushti hoshiyali atirgullar oq romashka xrizantemalar bilan juftlashib, baland dastali pudra rangli to‘qilgan savatga terilgan.",
      composition: ["Ikki rangli atirgullar", "Oq xrizantemalar", "Pushti to‘qilgan savat"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Powder pink",
      shortDescription: "Two-tone roses and white chrysanthemums in a pink basket.",
      description:
        "Roses with cream centres edged in pink, paired with white daisy chrysanthemums and gathered into a powder-pink woven basket with a tall handle.",
      composition: ["Two-tone roses", "White chrysanthemums", "Pink woven basket"],
      deliveryEstimate: DELIVERY.en,
    },
  },
];

runBouquetImport(
  {
    sourceRoot: SOURCE_ROOT,
    categorySlug: "baskets",
    cloudinaryFolder: "flowers/products/baskets",
    sortOrderBase: 23_000,
    bouquets: BASKETS,
  },
  { dryRun: DRY_RUN }
).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
