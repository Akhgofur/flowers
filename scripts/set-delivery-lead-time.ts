import nextEnv from "@next/env";
import mongoose from "mongoose";
import { ProductModel } from "@/models/Product";
import { LOCALES } from "@/i18n/config";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

/**
 * States one lead time on every product that does not already promise a later
 * one.
 *
 * The shop needs a day's notice, but 26 products still advertised same-day
 * delivery ("Сегодня от 90 минут") and 139 said nothing at all, falling back to
 * "we will confirm when ordering". Both read as if an order placed now could
 * arrive now.
 *
 * Deliberately left alone: products already promising a day or more — the
 * wedding batch's "the florist agrees the date and time", "Предзаказ за 24 часа",
 * and the two "Завтра с 10:00/12:00". Those are already honest and more
 * specific than a blanket minimum.
 */

const LEAD_TIME = {
  ru: "Заказ минимум за 1 день",
  uz: "Buyurtma kamida 1 kun oldin",
  en: "Order at least 1 day ahead",
} as const;

/** Anything advertising same-day fulfilment, in any of the three locales. */
const SAME_DAY = /сегодня|bugun|today/i;

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("Missing environment variable: MONGODB_URI");

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const { host, name } = mongoose.connection;
    console.log(`Reading database "${name}" on ${host}.`);

    const products = await ProductModel.find({})
      .select({ slug: 1, translations: 1 })
      .lean()
      .exec();

    const targets = products.filter((product) => {
      const translations = (product as { translations?: Record<string, { deliveryEstimate?: string }> })
        .translations;
      return LOCALES.some((locale) => {
        const current = translations?.[locale]?.deliveryEstimate?.trim();
        // No promise at all, or a same-day one. Either way it needs the notice.
        return !current || SAME_DAY.test(current);
      });
    });

    console.log(`${products.length} products, ${targets.length} to restate.`);
    for (const locale of LOCALES) {
      console.log(`  ${locale}: ${LEAD_TIME[locale]}`);
    }

    if (DRY_RUN) {
      console.log("Dry run: nothing written.");
      return;
    }

    let updated = 0;
    for (const product of targets) {
      const set = Object.fromEntries(
        LOCALES.map((locale) => [`translations.${locale}.deliveryEstimate`, LEAD_TIME[locale]])
      );
      const result = await ProductModel.updateOne(
        { _id: product._id },
        { $set: set },
        { runValidators: true }
      );
      if (result.modifiedCount) updated += 1;
    }

    console.log(`Restated ${updated} of ${targets.length}.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
