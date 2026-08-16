import nextEnv from "@next/env";
import { runBouquetImport, type Bouquet } from "./lib/bouquet-import";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

// Forward slashes on purpose: Node accepts them on Windows and they remove a
// whole class of escaping mistakes from a path that is edited by hand.
//
// One shoot at a time. The previous shoot's manifest is in commit 2ed8cd5; its
// seven products stay published because slugs are derived from the file names,
// so a new shoot can never collide with or orphan an older one.
const SOURCE_ROOT = "C:/Users/gofur/Desktop/fl/buket/edited_corrected";
const DRY_RUN = process.argv.includes("--dry-run");

const DELIVERY = {
  ru: "Заказ минимум за 1 день",
  uz: "Buyurtma kamida 1 kun oldin",
  en: "Order at least 1 day ahead",
} as const;

const BOUQUETS: Bouquet[] = [
  {
    images: ["photo_1_2026-08-16_12-50-50.png"],
    flowerTypes: ["seasonal"],
    colors: ["white", "pink"],
    ru: {
      name: "Белое облако",
      shortDescription: "Крупные белые хризантемы с альстромерией в розовой упаковке.",
      description:
        "Плотный купол крупных белых хризантем с кремовой серединой, подсвеченный белой альстромерией, в ярко-розовой матовой упаковке.",
      composition: ["Белые хризантемы", "Белая альстромерия", "Розовая упаковка"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Oq bulut",
      shortDescription: "Pushti qadoqda alstromeriya bilan yirik oq xrizantemalar.",
      description:
        "Krem markazli yirik oq xrizantemalardan zich gumbaz, oq alstromeriya bilan jonlantirilgan, yorqin pushti mat qadoqda.",
      composition: ["Oq xrizantemalar", "Oq alstromeriya", "Pushti qadoq"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "White cloud",
      shortDescription: "Large white chrysanthemums with alstroemeria in pink wrapping.",
      description:
        "A dense dome of large white chrysanthemums with cream centres, lifted by white alstroemeria and wrapped in bright pink matte paper.",
      composition: ["White chrysanthemums", "White alstroemeria", "Pink wrapping"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_2_2026-08-16_12-50-50.png"],
    flowerTypes: ["rose", "mixed"],
    colors: ["pink", "white", "purple"],
    ru: {
      name: "Лавандовое утро",
      shortDescription: "Розовые и белые кустовые розы с альстромерией и статицей.",
      description:
        "Розовые и белые кустовые розы с белой альстромерией и сиреневой статицей, собранные в лиловую упаковку с широкими лепестками и атласной лентой.",
      composition: ["Розовые кустовые розы", "Белая альстромерия", "Сиреневая статица"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Lavanda tongi",
      shortDescription: "Alstromeriya va statitsa bilan pushti va oq buta atirgullar.",
      description:
        "Pushti va oq buta atirgullar oq alstromeriya va siren statitsa bilan, keng gulbargli lilo qadoqqa va atlas lenta bilan yig‘ilgan.",
      composition: ["Pushti buta atirgullar", "Oq alstromeriya", "Siren statitsa"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Lavender morning",
      shortDescription: "Pink and white spray roses with alstroemeria and statice.",
      description:
        "Pink and white spray roses with white alstroemeria and lilac statice, gathered into wide-petalled violet wrapping and finished with a satin ribbon.",
      composition: ["Pink spray roses", "White alstroemeria", "Lilac statice"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    // Two views of one bouquet: front and three-quarter. Split into two entries
    // if these are in fact two separate arrangements.
    images: ["photo_3_2026-08-16_12-50-50.png", "photo_7_2026-08-16_12-50-50.png"],
    flowerTypes: ["seasonal"],
    colors: ["white", "peach"],
    ru: {
      name: "Снежная ромашка",
      shortDescription: "Белые хризантемы и мелкие ромашковые хризантемы в пудровой упаковке.",
      description:
        "Крупные белоснежные хризантемы вперемешку с мелкими ромашковыми хризантемами с зелёной серединкой, в персиково-пудровой упаковке с кремовой лентой.",
      composition: ["Белые хризантемы", "Ромашковые хризантемы", "Пудровая упаковка"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Qorli romashka",
      shortDescription: "Pudra qadoqda oq xrizantemalar va mayda romashka xrizantemalar.",
      description:
        "Yirik qordek oq xrizantemalar yashil markazli mayda romashka xrizantemalar bilan aralash, shaftoli-pudra qadoqda va krem lenta bilan.",
      composition: ["Oq xrizantemalar", "Romashka xrizantemalar", "Pudra qadoq"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Snow daisy",
      shortDescription: "White chrysanthemums and small daisy chrysanthemums in powder wrapping.",
      description:
        "Large snow-white chrysanthemums threaded with small green-eyed daisy chrysanthemums, in peach and powder wrapping with a cream ribbon.",
      composition: ["White chrysanthemums", "Daisy chrysanthemums", "Powder wrapping"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_4_2026-08-16_12-50-50.png"],
    flowerTypes: ["rose", "peony", "mixed"],
    colors: ["pink", "white", "purple"],
    ru: {
      name: "Малиновый сад",
      shortDescription: "Пионовидные розы цвета фуксии с альстромерией и статицей.",
      description:
        "Пионовидные кустовые розы насыщенного малинового цвета с белой альстромерией, белой и сиреневой статицей и веточками рускуса, в розовой упаковке с лентой.",
      composition: ["Пионовидные розы фуксия", "Белая альстромерия", "Белая и сиреневая статица"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Malina bog‘i",
      shortDescription: "Alstromeriya va statitsa bilan fuksiya rangli pion atirgullar.",
      description:
        "To‘q malina rangli pion shaklidagi buta atirgullar oq alstromeriya, oq va siren statitsa hamda ruskus shoxchalari bilan, pushti qadoqda va lenta bilan.",
      composition: ["Fuksiya pion atirgullar", "Oq alstromeriya", "Oq va siren statitsa"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Raspberry garden",
      shortDescription: "Fuchsia peony roses with alstroemeria and statice.",
      description:
        "Deep raspberry peony spray roses with white alstroemeria, white and lilac statice and sprigs of ruscus, in pink wrapping tied with ribbon.",
      composition: ["Fuchsia peony roses", "White alstroemeria", "White and lilac statice"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    // Two views of one bouquet: overhead and front. Split into two entries if
    // these are in fact two separate arrangements.
    images: ["photo_5_2026-08-16_12-50-50.png", "photo_8_2026-08-16_12-50-50.png"],
    flowerTypes: ["seasonal"],
    colors: ["white", "purple"],
    ru: {
      name: "Сливочная фиалка",
      shortDescription: "Кремовые и фиалковые хризантемы с лентами «Happy Birthday».",
      description:
        "Кремовые хризантемы вокруг сердцевины из хризантем с фиалковыми кончиками лепестков, в лиловой упаковке с лентами «Happy Birthday».",
      composition: ["Кремовые хризантемы", "Фиалковые хризантемы", "Ленты «Happy Birthday»"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Qaymoqli binafsha",
      shortDescription: "«Happy Birthday» lentalari bilan qaymoq va binafsha xrizantemalar.",
      description:
        "Gulbarg uchlari binafsha rangli xrizantemalar yadrosi atrofida qaymoq rangli xrizantemalar, lilo qadoqda «Happy Birthday» lentalari bilan.",
      composition: ["Qaymoq xrizantemalar", "Binafsha xrizantemalar", "«Happy Birthday» lentalari"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Cream and violet",
      shortDescription: "Cream and violet-tipped chrysanthemums with Happy Birthday ribbons.",
      description:
        "Cream chrysanthemums ringing a heart of violet-tipped blooms, in lilac wrapping threaded with Happy Birthday ribbons.",
      composition: ["Cream chrysanthemums", "Violet-tipped chrysanthemums", "Happy Birthday ribbons"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    // Two views of one bouquet: front and three-quarter. Split into two entries
    // if these are in fact two separate arrangements.
    images: ["photo_6_2026-08-16_12-50-50.png", "photo_9_2026-08-16_12-50-50.png"],
    flowerTypes: ["seasonal", "rose", "mixed"],
    colors: ["blue", "purple", "pink"],
    ru: {
      name: "Лазурный сюрприз",
      shortDescription: "Голубые хризантемы с сиреневыми пионовидными розами.",
      description:
        "Ярко-голубые хризантемы в окружении сиреневых пионовидных кустовых роз и облака фиолетовой статицы, в розовой упаковке с атласной лентой.",
      composition: ["Голубые хризантемы", "Сиреневые пионовидные розы", "Фиолетовая статица"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Moviy syurpriz",
      shortDescription: "Siren pion atirgullar bilan moviy xrizantemalar.",
      description:
        "Yorqin moviy xrizantemalar siren pion shaklidagi buta atirgullar va binafsha statitsa buluti bilan o‘ralgan, pushti qadoqda va atlas lenta bilan.",
      composition: ["Moviy xrizantemalar", "Siren pion atirgullar", "Binafsha statitsa"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Azure surprise",
      shortDescription: "Blue chrysanthemums with lilac peony roses.",
      description:
        "Bright blue chrysanthemums surrounded by lilac peony spray roses and a cloud of purple statice, in pink wrapping with a satin ribbon.",
      composition: ["Blue chrysanthemums", "Lilac peony roses", "Purple statice"],
      deliveryEstimate: DELIVERY.en,
    },
  },
];

runBouquetImport(
  {
    sourceRoot: SOURCE_ROOT,
    categorySlug: "mixed",
    cloudinaryFolder: "flowers/products/mixed",
    sortOrderBase: 22_000,
    bouquets: BOUQUETS,
  },
  { dryRun: DRY_RUN }
).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
