import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublishedCatalog } from "@/lib/services/catalog-service";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";

export const runtime = "nodejs";

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
