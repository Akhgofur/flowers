import { NextResponse } from "next/server";
import { adminErrorResponse, assertSameOrigin, requireAdmin } from "@/lib/admin-api";
import { editAdminCategory, removeAdminCategory } from "@/lib/services/admin-service";
import { categoryInputSchema, objectIdSchema } from "@/lib/validations";

export const runtime = "nodejs";

type CategoryContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: CategoryContext) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    const { id } = await params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Kategoriya identifikatori noto'g'ri." }, { status: 400 });
    }

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

    return NextResponse.json({ category: await editAdminCategory(id, parsed.data) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: CategoryContext) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    const { id } = await params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Kategoriya identifikatori noto'g'ri." }, { status: 400 });
    }

    await removeAdminCategory(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
