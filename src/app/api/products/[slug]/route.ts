import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublishedProductBySlug } from "@/lib/services/catalog-service";

export const runtime = "nodejs";

const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

type ProductRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: ProductRouteContext) {
  const { slug } = await params;
  const parsedSlug = slugSchema.safeParse(slug);

  if (!parsedSlug.success) {
    return NextResponse.json({ error: "Mahsulot manzili noto‘g‘ri." }, { status: 400 });
  }

  try {
    const product = await getPublishedProductBySlug(parsedSlug.data);
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
