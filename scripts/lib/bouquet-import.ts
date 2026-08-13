import { createHash } from "node:crypto";
import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { CategoryModel } from "@/models/Category";
import { ProductModel } from "@/models/Product";

/**
 * Shared machinery for importing a folder of studio photographs as catalogue
 * entries. Each import script owns only its manifest -- the source folder, the
 * category, and the copy for every bouquet.
 */

export type BouquetCopy = {
  name: string;
  shortDescription: string;
  description: string;
  composition: string[];
  deliveryEstimate: string;
};

export type Bouquet = {
  /** File names in the source folder. More than one means views of one bouquet. */
  images: string[];
  flowerTypes: string[];
  colors: string[];
  ru: BouquetCopy;
  uz: BouquetCopy;
  en: BouquetCopy;
};

export type BouquetImport = {
  sourceRoot: string;
  /** Slug of an already published category; the import refuses to create one. */
  categorySlug: string;
  /** Cloudinary folder, e.g. `flowers/products/wedding`. */
  cloudinaryFolder: string;
  /** Products sort after this, keeping each import grouped in the catalogue. */
  sortOrderBase: number;
  bouquets: Bouquet[];
};

export function digest(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

/**
 * Every photograph must be claimed exactly once. A dropped file silently loses
 * a bouquet and a doubled one silently duplicates it, so both fail the run
 * before anything is uploaded or written.
 */
export async function assertSourcesMatch({
  sourceRoot,
  bouquets,
}: Pick<BouquetImport, "sourceRoot" | "bouquets">): Promise<void> {
  const onDisk = (await readdir(sourceRoot))
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .sort();

  assertManifestCoversSources(
    onDisk,
    bouquets.flatMap((bouquet) => bouquet.images)
  );
}

/** Split out from the filesystem so the rule itself is directly testable. */
export function assertManifestCoversSources(
  onDisk: readonly string[],
  claimed: readonly string[]
): void {
  const missing = claimed.filter((name) => !onDisk.includes(name));
  if (missing.length) {
    throw new Error(`Manifest names files that are not on disk: ${missing.join(", ")}`);
  }

  const unclaimed = onDisk.filter((name) => !claimed.includes(name));
  if (unclaimed.length) {
    throw new Error(`Source files no bouquet claims: ${unclaimed.join(", ")}`);
  }

  const duplicated = claimed.filter((name, index) => claimed.indexOf(name) !== index);
  if (duplicated.length) {
    throw new Error(`Source files claimed twice: ${[...new Set(duplicated)].join(", ")}`);
  }
}

async function upload(sourceRoot: string, folder: string, fileName: string) {
  const absolutePath = path.join(sourceRoot, fileName);
  await access(absolutePath);

  const result = await cloudinary.uploader.upload(absolutePath, {
    public_id: `${folder}/${digest(fileName)}`,
    overwrite: true,
    resource_type: "image",
  });

  if (!result.secure_url || !result.public_id) {
    throw new Error(`Cloudinary did not return a URL for ${fileName}`);
  }
  return { url: result.secure_url, publicId: result.public_id };
}

export async function runBouquetImport(
  config: BouquetImport,
  { dryRun }: { dryRun: boolean }
): Promise<void> {
  const required = [
    "MONGODB_URI",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

  await assertSourcesMatch(config);

  const imageCount = config.bouquets.reduce((count, b) => count + b.images.length, 0);
  console.log(
    `Import plan for "${config.categorySlug}": ${imageCount} source images -> ${config.bouquets.length} products.`
  );
  for (const bouquet of config.bouquets) {
    console.log(`  ${bouquet.ru.name} <- ${bouquet.images.join(", ")}`);
  }
  if (dryRun) {
    console.log("Dry run: nothing uploaded, nothing written.");
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  await mongoose.connect(process.env.MONGODB_URI!);
  try {
    // Names the target without printing credentials: an import aimed at the
    // wrong database is otherwise invisible until the wrong shop changes.
    const { host, name } = mongoose.connection;
    const published = await ProductModel.countDocuments({ status: "published" });
    console.log(`Writing to database "${name}" on ${host} (${published} published products today).`);

    const category = await CategoryModel.findOne({ slug: config.categorySlug }).lean();
    if (!category) {
      throw new Error(`Category "${config.categorySlug}" is missing; create it before importing.`);
    }

    let index = 0;
    for (const bouquet of config.bouquets) {
      index += 1;

      const images = [];
      for (const fileName of bouquet.images) {
        const uploaded = await upload(config.sourceRoot, config.cloudinaryFolder, fileName);
        images.push({ ...uploaded, alt: bouquet.ru.name });
      }

      const slug = `${config.categorySlug}-${digest(bouquet.images.join("|"))}`;
      await ProductModel.findOneAndUpdate(
        { slug },
        {
          $set: {
            slug,
            translations: { ru: bouquet.ru, uz: bouquet.uz, en: bouquet.en },
            categoryId: category._id,
            currency: "UZS",
            images,
            flowerTypes: bouquet.flowerTypes,
            colors: bouquet.colors,
            seasons: ["all_year"],
            sortOrder: config.sortOrderBase + index,
            isFeatured: false,
            isNewArrival: true,
            isOnSale: false,
            status: "published",
          },
          // Priced by the florist after a call, like the rest of the catalogue.
          $unset: { price: 1, originalPrice: 1 },
        },
        {
          returnDocument: "after",
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      console.log(`[${index}/${config.bouquets.length}] ${slug} — ${bouquet.ru.name}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}
