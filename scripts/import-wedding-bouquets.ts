import nextEnv from "@next/env";
import { runBouquetImport, type Bouquet } from "./lib/bouquet-import";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

// Forward slashes on purpose: Node accepts them on Windows and they remove a
// whole class of escaping mistakes from a path that is edited by hand.
const SOURCE_ROOT = "C:/Users/gofur/Desktop/banketka/edited_corrected";
const DRY_RUN = process.argv.includes("--dry-run");

const DELIVERY = {
  ru: "Дату и время согласует флорист",
  uz: "Sana va vaqtni florist kelishadi",
  en: "The florist agrees the date and time",
} as const;

const BOUQUETS: Bouquet[] = [
  {
    images: ["photo_7_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose"],
    colors: ["pink", "white"],
    ru: {
      name: "Розовое утро",
      shortDescription: "Круглый букет невесты из розовых и белых роз.",
      description:
        "Плотный купол из розовых и белых роз, собранный в воротник из широкого зелёного листа и перевязанный атласной лентой.",
      composition: ["Розовые розы", "Белые розы", "Зелёный лист", "Атласная лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Pushti tong",
      shortDescription: "Pushti va oq atirgullardan yasalgan kelin bosh buketi.",
      description:
        "Pushti va oq atirgullardan zich gumbaz, keng yashil bargdan yoqa va atlas lenta bilan bog‘langan.",
      composition: ["Pushti atirgullar", "Oq atirgullar", "Yashil barg", "Atlas lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Pink morning",
      shortDescription: "A round bridal bouquet of pink and white roses.",
      description:
        "A dense dome of pink and white roses set in a broad green leaf collar and tied with satin ribbon.",
      composition: ["Pink roses", "White roses", "Green leaf", "Satin ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_9_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose"],
    colors: ["white"],
    ru: {
      name: "Кремовая классика",
      shortDescription: "Кремовые розы с гипсофилой и широким белым бантом.",
      description:
        "Классический букет невесты из кремовых роз в облаке гипсофилы, перевязанный широкой белой атласной лентой.",
      composition: ["Кремовые розы", "Гипсофила", "Белая атласная лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Krem klassika",
      shortDescription: "Krem atirgullar, gipsofila va keng oq bant.",
      description:
        "Gipsofila bulutidagi krem atirgullardan klassik kelin buketi, keng oq atlas lenta bilan bog‘langan.",
      composition: ["Krem atirgullar", "Gipsofila", "Oq atlas lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Cream classic",
      shortDescription: "Cream roses with gypsophila and a wide white bow.",
      description:
        "A classic bridal bouquet of cream roses in a cloud of gypsophila, tied with a wide white satin ribbon.",
      composition: ["Cream roses", "Gypsophila", "White satin ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: [
      "photo_14_2026-08-12_17-47-11.png",
      "photo_19_2026-08-12_17-47-11.png",
    ],
    flowerTypes: ["rose"],
    colors: ["pink", "peach", "white"],
    ru: {
      name: "Персиковый рассвет",
      shortDescription: "Двухцветные розы с малиновой каймой и гипсофилой.",
      description:
        "Кремово-персиковые розы с яркой розовой каймой, дополненные гипсофилой и свежей зеленью, с белой атласной лентой.",
      composition: ["Двухцветные розы", "Гипсофила", "Зелень аспарагуса", "Белая лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Shaftoli tong",
      shortDescription: "Malina hoshiyali ikki rangli atirgullar va gipsofila.",
      description:
        "Yorqin pushti hoshiyali krem-shaftoli atirgullar, gipsofila va yangi yashillik bilan, oq atlas lenta bilan bog‘langan.",
      composition: ["Ikki rangli atirgullar", "Gipsofila", "Asparagus yashilligi", "Oq lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Peach dawn",
      shortDescription: "Two-tone roses edged in raspberry, with gypsophila.",
      description:
        "Cream and peach roses edged in bright pink, finished with gypsophila, fresh greenery and a white satin ribbon.",
      composition: ["Two-tone roses", "Gypsophila", "Asparagus greenery", "White ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: [
      "photo_15_2026-08-12_17-47-11.png",
      "photo_21_2026-08-12_17-47-11.png",
    ],
    flowerTypes: ["rose", "seasonal"],
    colors: ["pink", "white"],
    ru: {
      name: "Нежный зефир",
      shortDescription: "Бледно-розовые розы с ромашковыми хризантемами.",
      description:
        "Купол из бледно-розовых роз в каплях росы, обрамлённый розовыми и белыми хризантемами и лентами из органзы.",
      composition: ["Бледно-розовые розы", "Хризантемы", "Зелень", "Лента из органзы"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Nozik zefir",
      shortDescription: "Och pushti atirgullar va romashka xrizantemalar.",
      description:
        "Shabnam tomchilaridagi och pushti atirgullar gumbazi, pushti va oq xrizantemalar hamda organza lentalari bilan bezatilgan.",
      composition: ["Och pushti atirgullar", "Xrizantemalar", "Yashillik", "Organza lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Soft marshmallow",
      shortDescription: "Pale pink roses with daisy chrysanthemums.",
      description:
        "A dome of dew-flecked pale pink roses framed by pink and white chrysanthemums and organza ribbons.",
      composition: ["Pale pink roses", "Chrysanthemums", "Greenery", "Organza ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_17_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose", "seasonal"],
    colors: ["white"],
    ru: {
      name: "Белый шёлк",
      shortDescription: "Белые розы и хризантемы в белой упаковке.",
      description:
        "Букет из белых роз, гипсофилы и белых хризантем в мягкой белой упаковке, перевязанный розовой лентой с золотой нитью.",
      composition: ["Белые розы", "Гипсофила", "Белые хризантемы", "Розовая лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Oq ipak",
      shortDescription: "Oq atirgul va xrizantemalar oq qadoqda.",
      description:
        "Oq atirgullar, gipsofila va oq xrizantemalardan iborat buket, yumshoq oq qadoqda, oltin ipli pushti lenta bilan bog‘langan.",
      composition: ["Oq atirgullar", "Gipsofila", "Oq xrizantemalar", "Pushti lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "White silk",
      shortDescription: "White roses and chrysanthemums in white wrapping.",
      description:
        "White roses, gypsophila and white chrysanthemums in soft white wrapping, tied with a pink ribbon threaded with gold.",
      composition: ["White roses", "Gypsophila", "White chrysanthemums", "Pink ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_18_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose"],
    colors: ["white", "pink"],
    ru: {
      name: "Кружевное признание",
      shortDescription: "Кремовые розы и розовая кустовая роза в кружеве.",
      description:
        "Кремовые розы в окружении розовых кустовых роз и гипсофилы, собранные в кружевной воротник с белым бантом.",
      composition: ["Кремовые розы", "Кустовые розы", "Гипсофила", "Кружевной воротник"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "To‘rli iqror",
      shortDescription: "Krem atirgullar va pushti buta atirgul to‘r ichida.",
      description:
        "Pushti buta atirgullar va gipsofila qurshovidagi krem atirgullar, to‘rli yoqa va oq bant bilan yig‘ilgan.",
      composition: ["Krem atirgullar", "Buta atirgullar", "Gipsofila", "To‘rli yoqa"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Lace confession",
      shortDescription: "Cream roses and pink spray roses set in lace.",
      description:
        "Cream roses ringed by pink spray roses and gypsophila, gathered into a lace collar with a white bow.",
      composition: ["Cream roses", "Spray roses", "Gypsophila", "Lace collar"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: [
      "photo_22_2026-08-12_17-47-11.png",
      "photo_27_2026-08-12_17-47-11.png",
    ],
    flowerTypes: ["rose", "seasonal"],
    colors: ["white", "green"],
    ru: {
      name: "Белый сад",
      shortDescription: "Белые розы с альстромерией и глянцевой листвой.",
      description:
        "Белые розы в обрамлении альстромерии и мелких белых соцветий, уложенные на воротник из плотных глянцевых листьев.",
      composition: ["Белые розы", "Альстромерия", "Маттиола", "Глянцевая листва"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Oq bog‘",
      shortDescription: "Oq atirgullar, alstromeriya va yaltiroq barglar.",
      description:
        "Alstromeriya va mayda oq gullar qurshovidagi oq atirgullar, qalin yaltiroq barglardan yoqa ustida joylashgan.",
      composition: ["Oq atirgullar", "Alstromeriya", "Mattiola", "Yaltiroq barglar"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "White garden",
      shortDescription: "White roses with alstroemeria and glossy foliage.",
      description:
        "White roses framed by alstroemeria and small white blooms, resting on a collar of firm glossy leaves.",
      composition: ["White roses", "Alstroemeria", "Matthiola", "Glossy foliage"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_26_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose"],
    colors: ["white"],
    ru: {
      name: "Жемчужная роса",
      shortDescription: "Белые розы с жемчужными булавками и нитями.",
      description:
        "Компактный букет из белых роз, украшенный жемчужными булавками, с воротником из резного папоротника и жемчужными нитями.",
      composition: ["Белые розы", "Папоротник", "Жемчужный декор"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Marvarid shabnam",
      shortDescription: "Marvarid to‘g‘nag‘ich va iplar bilan oq atirgullar.",
      description:
        "Marvarid to‘g‘nag‘ichlar bilan bezatilgan ixcham oq atirgul buketi, o‘yma paporotnik yoqasi va marvarid iplari bilan.",
      composition: ["Oq atirgullar", "Paporotnik", "Marvarid bezak"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Pearl dew",
      shortDescription: "White roses pinned with pearls and pearl strands.",
      description:
        "A compact bouquet of white roses dressed with pearl pins, finished with a cut fern collar and hanging pearl strands.",
      composition: ["White roses", "Fern", "Pearl detailing"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_28_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose", "seasonal"],
    colors: ["white", "peach"],
    ru: {
      name: "Пудровое утро",
      shortDescription: "Белые розы с альстромерией и пудровой лентой.",
      description:
        "Купол из белых роз с альстромерией и мелкими белыми соцветиями, перевязанный широкой пудрово-розовой лентой.",
      composition: ["Белые розы", "Альстромерия", "Глянцевая листва", "Пудровая лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Pudra tong",
      shortDescription: "Oq atirgullar, alstromeriya va pudra lenta.",
      description:
        "Alstromeriya va mayda oq gullar bilan oq atirgullar gumbazi, keng pudra-pushti lenta bilan bog‘langan.",
      composition: ["Oq atirgullar", "Alstromeriya", "Yaltiroq barglar", "Pudra lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Powder morning",
      shortDescription: "White roses with alstroemeria and a powder ribbon.",
      description:
        "A dome of white roses with alstroemeria and small white blooms, tied with a wide powder-pink ribbon.",
      composition: ["White roses", "Alstroemeria", "Glossy foliage", "Powder ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_31_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose", "mixed"],
    colors: ["peach", "pink", "purple"],
    ru: {
      name: "Пастельная палитра",
      shortDescription: "Пастельные розы с фиолетовым статицей.",
      description:
        "Кремовые, персиковые и розовые розы, оттенённые фиолетовым статицей и гипсофилой, на воротнике из широкого листа.",
      composition: ["Кремовые розы", "Персиковые розы", "Розовые розы", "Статица", "Гипсофила"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Pastel palitra",
      shortDescription: "Pastel atirgullar va binafsha statitsa.",
      description:
        "Krem, shaftoli va pushti atirgullar binafsha statitsa va gipsofila bilan, keng bargdan yoqa ustida.",
      composition: ["Krem atirgullar", "Shaftoli atirgullar", "Pushti atirgullar", "Statitsa", "Gipsofila"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Pastel palette",
      shortDescription: "Pastel roses accented with purple statice.",
      description:
        "Cream, peach and pink roses lifted by purple statice and gypsophila, set on a broad leaf collar.",
      composition: ["Cream roses", "Peach roses", "Pink roses", "Statice", "Gypsophila"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_33_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose"],
    colors: ["white", "green"],
    ru: {
      name: "Весенний полёт",
      shortDescription: "Белые розы с зелёными бабочками.",
      description:
        "Белоснежные розы с декоративными зелёными бабочками и свежей листвой, перевязанные тонкой белой лентой.",
      composition: ["Белые розы", "Зелёная листва", "Декоративные бабочки"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Bahorgi parvoz",
      shortDescription: "Yashil kapalaklar bilan oq atirgullar.",
      description:
        "Oppoq atirgullar dekorativ yashil kapalaklar va yangi barglar bilan, ingichka oq lenta bilan bog‘langan.",
      composition: ["Oq atirgullar", "Yashil barglar", "Dekorativ kapalaklar"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Spring flight",
      shortDescription: "White roses with green butterflies.",
      description:
        "Snow-white roses with decorative green butterflies and fresh foliage, tied with a slim white ribbon.",
      composition: ["White roses", "Green foliage", "Decorative butterflies"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_35_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose"],
    colors: ["white", "green"],
    ru: {
      name: "Длинный стебель",
      shortDescription: "Белые розы на открытых стеблях с широкой листвой.",
      description:
        "Строгий букет из белых роз с открытыми стеблями, широким воротником из зелёных листьев и белой атласной обмоткой.",
      composition: ["Белые розы", "Зелёные листья", "Атласная обмотка"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Uzun poya",
      shortDescription: "Ochiq poyali oq atirgullar va keng barglar.",
      description:
        "Ochiq poyali oq atirgullardan qat’iy buket, keng yashil barg yoqasi va oq atlas o‘ram bilan.",
      composition: ["Oq atirgullar", "Yashil barglar", "Atlas o‘ram"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Long stem",
      shortDescription: "White roses on open stems with broad foliage.",
      description:
        "A restrained bouquet of white roses with open stems, a wide green leaf collar and a white satin wrap.",
      composition: ["White roses", "Green leaves", "Satin wrap"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_36_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose", "seasonal"],
    colors: ["white", "purple"],
    ru: {
      name: "Летний сад",
      shortDescription: "Белые розы с бабочками и божьими коровками.",
      description:
        "Букет из белых роз и альстромерии с яркими декоративными бабочками и божьими коровками, с фиолетовой лентой.",
      composition: ["Белые розы", "Альстромерия", "Декоративные бабочки", "Фиолетовая лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Yozgi bog‘",
      shortDescription: "Kapalak va xonqiziqlar bilan oq atirgullar.",
      description:
        "Oq atirgul va alstromeriyadan buket, yorqin dekorativ kapalaklar va xonqiziqlar hamda binafsha lenta bilan.",
      composition: ["Oq atirgullar", "Alstromeriya", "Dekorativ kapalaklar", "Binafsha lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Summer garden",
      shortDescription: "White roses with butterflies and ladybirds.",
      description:
        "A bouquet of white roses and alstroemeria dressed with bright decorative butterflies and ladybirds, finished with a purple ribbon.",
      composition: ["White roses", "Alstroemeria", "Decorative butterflies", "Purple ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_37_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose", "seasonal"],
    colors: ["white", "green"],
    ru: {
      name: "Серебряный иней",
      shortDescription: "Белые розы с блёстками и зелёными бабочками.",
      description:
        "Белые розы с серебристым мерцанием на лепестках, альстромерия и зелёные бабочки, перевязанные белой лентой.",
      composition: ["Белые розы", "Альстромерия", "Декоративные бабочки", "Белая лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Kumush qirov",
      shortDescription: "Yaltiroqli oq atirgullar va yashil kapalaklar.",
      description:
        "Gulbargida kumush yaltirog‘i bor oq atirgullar, alstromeriya va yashil kapalaklar, oq lenta bilan bog‘langan.",
      composition: ["Oq atirgullar", "Alstromeriya", "Dekorativ kapalaklar", "Oq lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Silver frost",
      shortDescription: "Glittered white roses with green butterflies.",
      description:
        "White roses with a silver shimmer across the petals, alstroemeria and green butterflies, tied with a white ribbon.",
      composition: ["White roses", "Alstroemeria", "Decorative butterflies", "White ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_39_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose", "seasonal"],
    colors: ["pink", "peach", "purple"],
    ru: {
      name: "Сиреневый вечер",
      shortDescription: "Розовые розы с альстромерией в листовой обёртке.",
      description:
        "Нежно-розовые розы и персиковая альстромерия в обёртке из широкого зелёного листа, с сиреневыми и белыми лентами.",
      composition: ["Розовые розы", "Альстромерия", "Зелёный лист", "Сиреневые ленты"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Siren oqshom",
      shortDescription: "Barg o‘ramidagi pushti atirgul va alstromeriya.",
      description:
        "Mayin pushti atirgullar va shaftoli alstromeriya keng yashil barg o‘ramida, siren va oq lentalar bilan.",
      composition: ["Pushti atirgullar", "Alstromeriya", "Yashil barg", "Siren lentalar"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Lilac evening",
      shortDescription: "Pink roses with alstroemeria in a leaf wrap.",
      description:
        "Soft pink roses and peach alstroemeria in a broad green leaf wrap, finished with lilac and white ribbons.",
      composition: ["Pink roses", "Alstroemeria", "Green leaf", "Lilac ribbons"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_40_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose"],
    colors: ["white", "pink"],
    ru: {
      name: "Малиновый акцент",
      shortDescription: "Белые розы с яркой малиновой кустовой розой.",
      description:
        "Белые розы с акцентом из ярко-малиновых кустовых роз и гипсофилы, перевязанные розовой и сиреневой лентами.",
      composition: ["Белые розы", "Кустовые розы", "Гипсофила", "Ленты"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Malina urg‘u",
      shortDescription: "Yorqin malina buta atirgulli oq atirgullar.",
      description:
        "Yorqin malina rangli buta atirgullar va gipsofila urg‘usi bilan oq atirgullar, pushti va siren lentalar bilan bog‘langan.",
      composition: ["Oq atirgullar", "Buta atirgullar", "Gipsofila", "Lentalar"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Raspberry accent",
      shortDescription: "White roses with vivid raspberry spray roses.",
      description:
        "White roses accented with vivid raspberry spray roses and gypsophila, tied with pink and lilac ribbons.",
      composition: ["White roses", "Spray roses", "Gypsophila", "Ribbons"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_43_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose", "peony"],
    colors: ["pink", "red"],
    ru: {
      name: "Ягодный сад",
      shortDescription: "Пионовидные розы с красным гиперикумом.",
      description:
        "Пышные пионовидные розы в розовых тонах с гроздьями красного гиперикума, собранные на открытых стеблях.",
      composition: ["Пионовидные розы", "Кремовые розы", "Гиперикум", "Зелёная листва"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Rezavor bog‘",
      shortDescription: "Qizil giperikumli pion shaklidagi atirgullar.",
      description:
        "Pushti tusdagi to‘kis pion shaklidagi atirgullar qizil giperikum shingillari bilan, ochiq poyalarda yig‘ilgan.",
      composition: ["Pion atirgullar", "Krem atirgullar", "Giperikum", "Yashil barglar"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "Berry garden",
      shortDescription: "Peony roses with red hypericum berries.",
      description:
        "Full peony-shaped roses in pink tones with clusters of red hypericum berries, gathered on open stems.",
      composition: ["Peony roses", "Cream roses", "Hypericum", "Green foliage"],
      deliveryEstimate: DELIVERY.en,
    },
  },
  {
    images: ["photo_51_2026-08-12_17-47-11.png"],
    flowerTypes: ["rose"],
    colors: ["white", "green"],
    ru: {
      name: "Первый снег",
      shortDescription: "Белые розы с гипсофилой и листовым воротником.",
      description:
        "Аккуратный букет невесты из белых роз с гипсофилой, уложенный на воротник из плотных зелёных листьев.",
      composition: ["Белые розы", "Гипсофила", "Зелёные листья", "Белая лента"],
      deliveryEstimate: DELIVERY.ru,
    },
    uz: {
      name: "Ilk qor",
      shortDescription: "Gipsofila va barg yoqali oq atirgullar.",
      description:
        "Gipsofilali oq atirgullardan ixcham kelin buketi, qalin yashil barglardan yoqa ustida joylashgan.",
      composition: ["Oq atirgullar", "Gipsofila", "Yashil barglar", "Oq lenta"],
      deliveryEstimate: DELIVERY.uz,
    },
    en: {
      name: "First snow",
      shortDescription: "White roses with gypsophila and a leaf collar.",
      description:
        "A neat bridal bouquet of white roses with gypsophila, resting on a collar of firm green leaves.",
      composition: ["White roses", "Gypsophila", "Green leaves", "White ribbon"],
      deliveryEstimate: DELIVERY.en,
    },
  },
];

runBouquetImport(
  {
    sourceRoot: SOURCE_ROOT,
    categorySlug: "wedding",
    cloudinaryFolder: "flowers/products/wedding",
    sortOrderBase: 20_000,
    bouquets: BOUQUETS,
  },
  { dryRun: DRY_RUN }
).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
