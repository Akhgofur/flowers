import { NextResponse } from "next/server";
import { adminErrorResponse, assertSameOrigin, requireAdmin } from "@/lib/admin-api";
import { createAdminProduct, getAdminProducts } from "@/lib/services/admin-service";
import { productInputSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ products: await getAdminProducts() });
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
      return NextResponse.json({ error: "Mahsulot JSON formatida bo'lishi kerak." }, { status: 400 });
    }

    const parsed = productInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Mahsulot ma'lumotlarini tekshiring." }, { status: 400 });
    }

    return NextResponse.json(
      { product: await createAdminProduct(parsed.data) },
      { status: 201 }
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
