import { NextResponse } from "next/server";
import { getPublishedCategories } from "@/lib/services/catalog-service";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";
import { z } from "zod";

export const runtime = "nodejs";

const localeSchema = z.enum(LOCALES).default(DEFAULT_LOCALE);

export async function GET(request: Request) {
  const parsedLocale = localeSchema.safeParse(
    new URL(request.url).searchParams.get("locale") ?? undefined
  );
  if (!parsedLocale.success) {
    return NextResponse.json({ error: "Til parametri noto‘g‘ri." }, { status: 400 });
  }

  try {
    const categories = await getPublishedCategories(parsedLocale.data);
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Public category request failed", error);
    return NextResponse.json(
      { error: "Kategoriyalar vaqtincha mavjud emas." },
      { status: 503 }
    );
  }
}
