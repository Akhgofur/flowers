import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublishedProductBySlug } from "@/lib/services/catalog-service";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";

export const runtime = "nodejs";

const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const localeSchema = z.enum(LOCALES).default(DEFAULT_LOCALE);

type ProductRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: ProductRouteContext) {
  const { slug } = await params;
  const parsedSlug = slugSchema.safeParse(slug);
  const parsedLocale = localeSchema.safeParse(
    new URL(request.url).searchParams.get("locale") ?? undefined
  );

  if (!parsedSlug.success || !parsedLocale.success) {
    return NextResponse.json({ error: "Mahsulot manzili noto‘g‘ri." }, { status: 400 });
  }

  try {
    const product = await getPublishedProductBySlug(parsedLocale.data, parsedSlug.data);
    if (!product) {
      return NextResponse.json({ error: "Mahsulot topilmadi." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Public product request failed", error);
    return NextResponse.json(
      { error: "Mahsulot vaqtincha mavjud emas." },
      { status: 503 }
    );
  }
}
