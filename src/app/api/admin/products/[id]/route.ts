import { NextResponse } from "next/server";
import { adminErrorResponse, assertSameOrigin, requireAdmin } from "@/lib/admin-api";
import { patchAdminProductFields, removeAdminProduct } from "@/lib/services/admin-service";
import { objectIdSchema, productPatchInputSchema } from "@/lib/validations";

export const runtime = "nodejs";

type ProductContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: ProductContext) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    const { id } = await params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Mahsulot identifikatori noto'g'ri." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Mahsulot JSON formatida bo'lishi kerak." }, { status: 400 });
    }

    const parsed = productPatchInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Mahsulot ma'lumotlarini tekshiring." }, { status: 400 });
    }

    return NextResponse.json({ product: await patchAdminProductFields(id, parsed.data) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: ProductContext) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    const { id } = await params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Mahsulot identifikatori noto'g'ri." }, { status: 400 });
    }

    await removeAdminProduct(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
