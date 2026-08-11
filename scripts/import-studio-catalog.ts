import { createHash } from "node:crypto";
import { access, readdir } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { CategoryModel } from "@/models/Category";
import { ProductModel } from "@/models/Product";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const SOURCE_ROOT = "C:\\Users\\gofur\\Desktop\\studio-background";
const DRY_RUN = process.argv.includes("--dry-run");

type SourceFolder = "buket" | "jivoy" | "savat";

type StudioGroup = {
  folder: SourceFolder;
  sourceImages: string[];
};

type LocalizedContent = [string, string, string, string[]];

type ProductContent = {
  ru: LocalizedContent;
  uz: LocalizedContent;
  en: LocalizedContent;
  flowerTypes: string[];
  colors: string[];
};

/** Visually confirmed alternate views of the same bouquet. */
const CONFIRMED_GALLERIES: StudioGroup[] = [
  {
    folder: "buket",
    sourceImages: [
      "buket/photo_10_2026-08-09_23-04-03.png",
      "buket/photo_18_2026-08-09_23-04-03.png",
    ],
  },
  {
    folder: "buket",
    sourceImages: [
      "buket/photo_12_2026-08-09_23-04-03.png",
      "buket/photo_14_2026-08-09_23-04-03.png",
    ],
  },
  {
    folder: "buket",
    sourceImages: [
      "buket/photo_15_2026-08-09_23-04-03.png",
      "buket/photo_19_2026-08-09_23-04-03.png",
      "buket/photo_23_2026-08-09_23-04-03.png",
    ],
  },
];

function digest(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function categorySlug(folder: SourceFolder): "mixed" | "roses" | "baskets" {
  return folder === "jivoy" ? "roses" : folder === "savat" ? "baskets" : "mixed";
}

function productContent(folder: SourceFolder, number: number) {
  const copy: ProductContent =
    folder === "jivoy"
      ? {
          ru: ["Букет красных роз", "Свежие красные розы для важного момента.", "Красные розы, оформленные вручную.", ["Красные розы", "Декоративная зелень"]],
          uz: ["Qizil atirgullar buketi", "Muhim lahza uchun yangi qizil atirgullar.", "Qo‘lda bezatilgan qizil atirgullar kompozitsiyasi.", ["Qizil atirgullar", "Dekorativ yashillik"]],
          en: ["Red rose bouquet", "Fresh red roses for an important moment.", "A hand-arranged composition of red roses.", ["Red roses", "Decorative greenery"]],
          flowerTypes: ["rose"],
          colors: ["red"],
        }
      : folder === "savat"
        ? {
            ru: ["Цветочная корзина", "Авторская композиция в корзине.", "Свежие цветы в подарочной корзине.", ["Сезонные цветы", "Декоративная зелень"]],
            uz: ["Gul savati", "Savatdagi mualliflik kompozitsiyasi.", "Sovg‘a savatidagi yangi gullar.", ["Mavsumiy gullar", "Dekorativ yashillik"]],
            en: ["Flower basket", "A signature arrangement in a basket.", "Fresh flowers arranged in a gift basket.", ["Seasonal flowers", "Decorative greenery"]],
            flowerTypes: ["mixed"],
            colors: ["mixed"],
          }
        : {
            ru: ["Авторский букет", "Свежая авторская композиция.", "Букет из свежих сезонных цветов, собранный вручную.", ["Сезонные цветы", "Декоративная зелень"]],
            uz: ["Mualliflik buketi", "Yangi mualliflik kompozitsiyasi.", "Qo‘lda yig‘ilgan yangi mavsumiy gullar buketi.", ["Mavsumiy gullar", "Dekorativ yashillik"]],
            en: ["Signature bouquet", "A fresh signature flower arrangement.", "A hand-arranged bouquet of fresh seasonal flowers.", ["Seasonal flowers", "Decorative greenery"]],
            flowerTypes: ["mixed"],
            colors: ["mixed"],
          };

  const withNumber = (value: string) => `${value} №${number}`;
  return {
    translations: {
      ru: { name: withNumber(copy.ru[0]), shortDescription: copy.ru[1], description: copy.ru[2], composition: copy.ru[3] },
      uz: { name: `${copy.uz[0]} ${number}`, shortDescription: copy.uz[1], description: copy.uz[2], composition: copy.uz[3] },
      en: { name: `${copy.en[0]} ${number}`, shortDescription: copy.en[1], description: copy.en[2], composition: copy.en[3] },
    },
    flowerTypes: copy.flowerTypes,
    colors: copy.colors,
  };
}

async function listSources(folder: SourceFolder): Promise<string[]> {
  const directory = path.join(SOURCE_ROOT, folder);
  const files = (await readdir(directory)).filter((name) => name.toLowerCase().endsWith(".png"));
  return files.sort().map((name) => `${folder}/${name}`);
}

async function buildGroups(): Promise<StudioGroup[]> {
  const allSources = (await Promise.all((["buket", "jivoy", "savat"] as const).map(listSources))).flat();
  const confirmed = new Set(CONFIRMED_GALLERIES.flatMap((group) => group.sourceImages));
  const unknownConfirmed = [...confirmed].filter((source) => !allSources.includes(source));
  if (unknownConfirmed.length) throw new Error(`Manifest references missing files: ${unknownConfirmed.join(", ")}`);

  return [
    ...CONFIRMED_GALLERIES,
    ...allSources
      .filter((source) => !confirmed.has(source))
      .map((source) => ({ folder: source.split("/")[0] as SourceFolder, sourceImages: [source] })),
  ];
}

async function upload(source: string) {
  const absolutePath = path.join(SOURCE_ROOT, source);
  await access(absolutePath);
  const publicId = `flowers/products/studio/${digest(source)}`;
  const result = await cloudinary.uploader.upload(absolutePath, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
  });
  if (!result.secure_url || !result.public_id) throw new Error(`Cloudinary did not return a URL for ${source}`);
  return { url: result.secure_url, publicId: result.public_id };
}

async function main() {
  const required = ["MONGODB_URI", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

  const groups = await buildGroups();
  const sourceCount = groups.reduce((count, group) => count + group.sourceImages.length, 0);
  console.log(`Studio import plan: ${sourceCount} source images -> ${groups.length} products.`);
  if (DRY_RUN) return;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  await mongoose.connect(process.env.MONGODB_URI!);
  try {
    const basketCategory = await CategoryModel.findOneAndUpdate(
      { slug: "baskets" },
      {
        $set: {
          slug: "baskets",
          translations: {
            ru: { name: "Цветочные корзины", description: "Композиции в подарочных корзинах." },
            uz: { name: "Gul savatlari", description: "Sovg‘a savatlaridagi gul kompozitsiyalari." },
            en: { name: "Flower baskets", description: "Flower arrangements in gift baskets." },
          },
          order: 6,
          status: "published",
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
    const categories = await CategoryModel.find({ slug: { $in: ["mixed", "roses", "baskets"] } }).lean();
    const categoryIds = new Map(categories.map((category) => [category.slug, category._id]));
    if (!basketCategory || ["mixed", "roses", "baskets"].some((slug) => !categoryIds.has(slug))) {
      throw new Error("Required product categories are missing.");
    }

    const counters: Record<SourceFolder, number> = { buket: 0, jivoy: 0, savat: 0 };
    for (const group of groups) {
      counters[group.folder] += 1;
      const number = counters[group.folder];
      const images = [];
      for (const source of group.sourceImages) {
        const uploaded = await upload(source);
        images.push({ ...uploaded, alt: productContent(group.folder, number).translations.ru.name });
      }
      const content = productContent(group.folder, number);
      const slug = `studio-${group.folder}-${digest(group.sourceImages.join("|"))}`;
      await ProductModel.findOneAndUpdate(
        { slug },
        {
          $set: {
            slug,
            ...content,
            categoryId: categoryIds.get(categorySlug(group.folder)),
            currency: "UZS",
            images,
            seasons: ["all_year"],
            stockQuantity: 100,
            sortOrder: 10_000 + number,
            isFeatured: false,
            isNewArrival: true,
            isOnSale: false,
            status: "published",
          },
          $unset: { price: 1, originalPrice: 1 },
        },
        {
          returnDocument: "after",
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
      console.log(`[${group.folder}] ${number}/${counters[group.folder]} ${slug}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
