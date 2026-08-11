import { NextResponse } from "next/server";
import { getPublishedCategories } from "@/lib/services/catalog-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await getPublishedCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Public category request failed", error);
    return NextResponse.json(
      { error: "Kategoriyalar vaqtincha mavjud emas." },
      { status: 503 }
    );
  }
}
