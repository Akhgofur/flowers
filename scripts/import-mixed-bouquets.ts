import nextEnv from "@next/env";
import { runBouquetImport, type Bouquet } from "./lib/bouquet-import";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

// Forward slashes on purpose: Node accepts them on Windows and they remove a
// whole class of escaping mistakes from a path that is edited by hand.
const SOURCE_ROOT = "C:/Users/gofur/Desktop/bkt/edited_corrected";
const DRY_RUN = process.argv.includes("--dry-run");

const DELIVERY = {
  ru: "Сегодня от 90 минут",
  uz: "Bugun 90 daqiqadan",
  en: "Today, from 90 minutes",
} as const;

const BOUQUETS: Bouquet[] = [
  {
    images: ["photo_1_2026-08-13_18-30-23.png"],
    flowerTypes: ["rose", "peony"],
    colors: ["pink", "purple"],
    ru: {
      name: "Пионовидная фуксия",
      shortDescription: "Крупный букет пионовидных кустовых роз цвета фуксии.",
      description:
        "Плотная охапка пионовидных кустовых роз насыщенного розового цвета, собранная в сиреневую матовую упаковку и перевязанная лентой.",
      composition: ["Пионовидные кустовые розы", "Сиреневая упаковка", "Атласная лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Fuksiya pion buketi",
      shortDescription: "To‘q pushti pion shaklidagi buta atirgullardan yirik buket.",
      description:
        "To‘q pushti pion shaklidagi buta atirgullardan zich quchoq, siren rangli mat qadoqqa yig‘ilgan va lenta bilan bog‘langan.",
      composition: ["Pion buta atirgullar", "Siren qadoq", "Atlas lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Fuchsia peony spray",
      shortDescription: "A large bouquet of fuchsia peony spray roses.",
      description:
        "A dense armful of deep pink peony spray roses gathered in matte lilac wrapping and tied with ribbon.",
      composition: ["Peony spray roses", "Lilac wrapping", "Satin ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_2_2026-08-13_18-30-23.png"],
    flowerTypes: ["rose"],
    colors: ["pink", "white"],
    ru: {
      name: "Розовая кайма",
      shortDescription: "Двухцветные розы с кремовой серединой и розовым краем.",
      description:
        "Розы с кремовыми лепестками и яркой розовой каймой, собранные ровным куполом в розовую и белую упаковку.",
      composition: ["Двухцветные розы", "Розовая упаковка", "Атласная лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Pushti hoshiya",
      shortDescription: "Krem markazli va pushti hoshiyali ikki rangli atirgullar.",
      description:
        "Krem gulbargli va yorqin pushti hoshiyali atirgullar, tekis gumbaz shaklida pushti va oq qadoqqa yig‘ilgan.",
      composition: ["Ikki rangli atirgullar", "Pushti qadoq", "Atlas lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Pink edge",
      shortDescription: "Two-tone roses with cream centres and pink edges.",
      description:
        "Roses with cream petals edged in bright pink, gathered into an even dome in pink and white wrapping.",
      composition: ["Two-tone roses", "Pink wrapping", "Satin ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_3_2026-08-13_18-30-23.png"],
    flowerTypes: ["seasonal", "mixed"],
    colors: ["white", "pink", "purple"],
    ru: {
      name: "Розовое облако",
      shortDescription: "Белые и сиреневые хризантемы с розовой гипсофилой.",
      description:
        "Ромашковые хризантемы белого и сиреневого оттенков в облаке розовой гипсофилы, в яркой малиновой упаковке.",
      composition: ["Белые хризантемы", "Сиреневые хризантемы", "Розовая гипсофила"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Pushti bulut",
      shortDescription: "Oq va siren xrizantemalar pushti gipsofila bilan.",
      description:
        "Oq va siren rangli romashka xrizantemalar pushti gipsofila bulutida, yorqin malina rangli qadoqda.",
      composition: ["Oq xrizantemalar", "Siren xrizantemalar", "Pushti gipsofila"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Pink cloud",
      shortDescription: "White and lilac chrysanthemums with pink gypsophila.",
      description:
        "Daisy chrysanthemums in white and lilac set in a cloud of pink gypsophila, wrapped in bright raspberry paper.",
      composition: ["White chrysanthemums", "Lilac chrysanthemums", "Pink gypsophila"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_4_2026-08-13_18-30-23.png"],
    flowerTypes: ["seasonal"],
    colors: ["pink", "white"],
    ru: {
      name: "Зефирные помпоны",
      shortDescription: "Помпонные хризантемы кремового и розового оттенков.",
      description:
        "Круглые помпонные хризантемы кремового и нежно-розового цвета, уложенные плотным куполом в пудровую упаковку.",
      composition: ["Помпонные хризантемы", "Пудровая упаковка", "Атласная лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Zefir pomponlar",
      shortDescription: "Krem va pushti rangli pompon xrizantemalar.",
      description:
        "Krem va mayin pushti rangli dumaloq pompon xrizantemalar, zich gumbaz shaklida pudra qadoqqa terilgan.",
      composition: ["Pompon xrizantemalar", "Pudra qadoq", "Atlas lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Marshmallow pompons",
      shortDescription: "Pompon chrysanthemums in cream and soft pink.",
      description:
        "Round pompon chrysanthemums in cream and soft pink, packed into a dense dome in powder-pink wrapping.",
      composition: ["Pompon chrysanthemums", "Powder wrapping", "Satin ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_5_2026-08-13_18-30-23.png"],
    flowerTypes: ["seasonal", "mixed"],
    colors: ["blue", "pink", "white"],
    ru: {
      name: "Гортензии пастель",
      shortDescription: "Голубые, розовые и кремовые гортензии.",
      description:
        "Крупные шапки гортензий в голубых, розовых и кремовых тонах, собранные в белую упаковку с розовой лентой.",
      composition: ["Голубые гортензии", "Розовые гортензии", "Кремовые гортензии"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Pastel gortenziya",
      shortDescription: "Ko‘k, pushti va krem rangli gortenziyalar.",
      description:
        "Ko‘k, pushti va krem tusdagi yirik gortenziya boshlari, oq qadoqqa yig‘ilib pushti lenta bilan bog‘langan.",
      composition: ["Ko‘k gortenziyalar", "Pushti gortenziyalar", "Krem gortenziyalar"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Pastel hydrangeas",
      shortDescription: "Blue, pink and cream hydrangeas.",
      description:
        "Large hydrangea heads in blue, pink and cream, gathered in white wrapping with a pink ribbon.",
      composition: ["Blue hydrangeas", "Pink hydrangeas", "Cream hydrangeas"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_6_2026-08-13_18-30-23.png"],
    flowerTypes: ["seasonal"],
    colors: ["purple", "white"],
    ru: {
      name: "Сиреневое поле",
      shortDescription: "Сиреневые и белые ромашковые хризантемы.",
      description:
        "Пышный букет из сиреневых и белых ромашковых хризантем в кремовой упаковке с сиреневой лентой.",
      composition: ["Сиреневые хризантемы", "Белые хризантемы", "Сиреневая лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Siren dala",
      shortDescription: "Siren va oq romashka xrizantemalar.",
      description:
        "Siren va oq romashka xrizantemalardan to‘kis buket, krem qadoqda va siren lenta bilan.",
      composition: ["Siren xrizantemalar", "Oq xrizantemalar", "Siren lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Lilac field",
      shortDescription: "Lilac and white daisy chrysanthemums.",
      description:
        "A full bouquet of lilac and white daisy chrysanthemums in cream wrapping with a lilac ribbon.",
      composition: ["Lilac chrysanthemums", "White chrysanthemums", "Lilac ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_7_2026-08-13_18-30-23.png"],
    flowerTypes: ["seasonal"],
    colors: ["white", "blue"],
    ru: {
      name: "Морская свежесть",
      shortDescription: "Белые хризантемы с голубой гипсофилой.",
      description:
        "Белые ромашковые хризантемы, подсвеченные голубой гипсофилой, в бело-голубой упаковке с синей лентой.",
      composition: ["Белые хризантемы", "Голубая гипсофила", "Синяя лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Dengiz salqini",
      shortDescription: "Oq xrizantemalar va ko‘k gipsofila.",
      description:
        "Ko‘k gipsofila bilan jonlantirilgan oq romashka xrizantemalar, oq-ko‘k qadoqda va ko‘k lenta bilan.",
      composition: ["Oq xrizantemalar", "Ko‘k gipsofila", "Ko‘k lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Sea freshness",
      shortDescription: "White chrysanthemums with blue gypsophila.",
      description:
        "White daisy chrysanthemums lifted by blue gypsophila, in white and blue wrapping with a blue ribbon.",
      composition: ["White chrysanthemums", "Blue gypsophila", "Blue ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
];

runBouquetImport(
  {
    sourceRoot: SOURCE_ROOT,
    categorySlug: "mixed",
    cloudinaryFolder: "flowers/products/mixed",
    sortOrderBase: 21_000,
    bouquets: BOUQUETS,
  },
  { dryRun: DRY_RUN }
).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
