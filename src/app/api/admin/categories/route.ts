import { NextResponse } from "next/server";
import { adminErrorResponse, assertSameOrigin, requireAdmin } from "@/lib/admin-api";
import { createAdminCategory, getAdminCategories } from "@/lib/services/admin-service";
import { categoryInputSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ categories: await getAdminCategories() });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Kategoriya JSON formatida bo'lishi kerak." }, { status: 400 });
    }

    const parsed = categoryInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Kategoriya ma'lumotlarini tekshiring." }, { status: 400 });
    }

    return NextResponse.json(
      { category: await createAdminCategory(parsed.data) },
      { status: 201 }
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
