import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPublishedCatalog,
  getPublishedProductsByIds,
} from "@/lib/services/catalog-service";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";
import { objectIdSchema } from "@/lib/validations";

export const runtime = "nodejs";

/** A basket far larger than any real order, but small enough to bound the query. */
const MAX_PRODUCT_IDS = 100;

const productIdsQuerySchema = z.object({
  locale: z.enum(LOCALES).default(DEFAULT_LOCALE),
  ids: z
    .string()
    .transform((value) => value.split(",").map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(objectIdSchema).min(1).max(MAX_PRODUCT_IDS)),
});

const catalogQuerySchema = z.object({
  locale: z.enum(LOCALES).default(DEFAULT_LOCALE),
  category: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  sale: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  query: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedIds = searchParams.get("ids");

  // An explicit id list is a cart lookup, not a catalog page: paging and
  // category filters do not apply, so it is answered before they are parsed.
  if (requestedIds !== null) {
    const parsedIds = productIdsQuerySchema.safeParse({
      locale: searchParams.get("locale") ?? undefined,
      ids: requestedIds,
    });

    if (!parsedIds.success) {
      return NextResponse.json(
        { error: "Mahsulot identifikatorlari noto‘g‘ri." },
        { status: 400 }
      );
    }

    try {
      const { locale, ids } = parsedIds.data;
      const products = await getPublishedProductsByIds(locale, ids);
      return NextResponse.json({ products });
    } catch (error) {
      console.error("Cart product lookup failed", error);
      return NextResponse.json(
        { error: "Katalog vaqtincha mavjud emas." },
        { status: 503 }
      );
    }
  }

  const parsedQuery = catalogQuerySchema.safeParse({
    category: searchParams.get("category") ?? undefined,
    locale: searchParams.get("locale") ?? undefined,
    sale: searchParams.get("sale") ?? undefined,
    query: searchParams.get("query") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Katalog so‘rov parametrlari noto‘g‘ri." },
      { status: 400 }
    );
  }

  try {
    const { locale, ...filters } = parsedQuery.data;
    const products = await getPublishedCatalog(locale, filters);
    return NextResponse.json({ products });
  } catch (error) {
    console.error("Public catalog request failed", error);
    return NextResponse.json(
      { error: "Katalog vaqtincha mavjud emas." },
      { status: 503 }
    );
  }
}
