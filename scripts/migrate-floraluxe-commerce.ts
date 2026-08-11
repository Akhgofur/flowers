import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import { dbConnect } from "../src/lib/mongodb";
import { ProductModel } from "../src/models/Product";
import { SiteSettingsModel } from "../src/models/SiteSettings";

export type FloraluxeMigrationInspection = {
  productsMissingSeasons: number;
  legacySiteName: boolean;
};

export type FloraluxeMigrationChanges = {
  productsUpdated: number;
  settingsUpdated: number;
};

export type FloraluxeMigrationSummary = FloraluxeMigrationChanges & {
  dryRun: boolean;
};

export type FloraluxeMigrationStore = {
  connect: () => Promise<unknown>;
  inspect: () => Promise<FloraluxeMigrationInspection>;
  apply: () => Promise<FloraluxeMigrationChanges>;
};

const productsMissingSeasonsFilter = {
  $or: [{ seasons: { $exists: false } }, { seasons: { $size: 0 } }],
};

const legacySiteNameFilter = {
  key: "default",
  $or: [
    { siteName: { $exists: false } },
    { siteName: "" },
    { siteName: "Nafis" },
    { siteName: "Nafis Flowers" },
  ],
};

const defaultSettings = {
  key: "default",
  siteName: "Floraluxe",
  translations: {
    ru: {
      siteDescription: "Авторские букеты и бережная доставка цветов по Ташкенту.",
      deliveryPolicy: "Доставка по Ташкенту, время подтверждает оператор.",
    },
    uz: {
      siteDescription: "Toshkent bo‘ylab mualliflik buketlari va ehtiyotkor yetkazib berish.",
      deliveryPolicy: "Toshkent bo‘ylab yetkazamiz, vaqtni operator tasdiqlaydi.",
    },
    en: {
      siteDescription: "Signature bouquets and thoughtful flower delivery across Tashkent.",
      deliveryPolicy: "Delivery across Tashkent; timing is confirmed by our operator.",
    },
  },
  phone: "+998 88 780 22 08",
  address: "Yunusobod, Toshkent",
  workingHours: "08:00–22:00",
  deliveryFee: 0,
} as const;

export function createMongoMigrationStore(): FloraluxeMigrationStore {
  return {
    connect: dbConnect,
    async inspect() {
      const [productsMissingSeasons, settings] = await Promise.all([
        ProductModel.collection.countDocuments(productsMissingSeasonsFilter),
        SiteSettingsModel.collection.findOne(
          { key: "default" },
          { projection: { siteName: 1 } }
        ),
      ]);
      const siteName = typeof settings?.siteName === "string"
        ? settings.siteName.trim()
        : "";

      return {
        productsMissingSeasons,
        legacySiteName:
          !settings || ["", "Nafis", "Nafis Flowers"].includes(siteName),
      };
    },
    async apply() {
      const [productResult, legacySettingsResult] = await Promise.all([
        ProductModel.collection.updateMany(productsMissingSeasonsFilter, {
          $set: { seasons: ["all_year"] },
        }),
        SiteSettingsModel.collection.updateOne(legacySiteNameFilter, {
          $set: { siteName: "Floraluxe" },
        }),
      ]);
      const settingsInsertResult = await SiteSettingsModel.collection.updateOne(
        { key: "default" },
        { $setOnInsert: defaultSettings },
        { upsert: true }
      );

      return {
        productsUpdated: productResult.modifiedCount,
        settingsUpdated:
          legacySettingsResult.modifiedCount + settingsInsertResult.upsertedCount,
      };
    },
  };
}

export async function migrateFloraluxeCommerce({
  dryRun,
  store = createMongoMigrationStore(),
}: {
  dryRun: boolean;
  store?: FloraluxeMigrationStore;
}): Promise<FloraluxeMigrationSummary> {
  await store.connect();

  if (dryRun) {
    const inspection = await store.inspect();
    return {
      dryRun: true,
      productsUpdated: inspection.productsMissingSeasons,
      settingsUpdated: inspection.legacySiteName ? 1 : 0,
    };
  }

  return { dryRun: false, ...(await store.apply()) };
}

async function runCli() {
  const projectDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
  );
  nextEnv.loadEnvConfig(
    projectDirectory,
    process.env.NODE_ENV !== "production"
  );

  const apply = process.argv.includes("--apply");

  try {
    const summary = await migrateFloraluxeCommerce({ dryRun: !apply });
    console.info(
      `${summary.dryRun ? "Dry run" : "Migration complete"}: ` +
        `${summary.productsUpdated} products, ${summary.settingsUpdated} settings document ` +
        `${summary.dryRun ? "would be updated" : "updated"}.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

const invokedScript = process.argv[1];
if (
  invokedScript &&
  path.resolve(invokedScript) === path.resolve(fileURLToPath(import.meta.url))
) {
  void runCli().catch(() => {
    console.error("Floraluxe migration failed. Check database configuration and connectivity.");
    process.exitCode = 1;
  });
}
