import { NextResponse } from "next/server";
import { adminErrorResponse, assertSameOrigin, requireAdmin } from "@/lib/admin-api";
import {
  removeAdminHomeSection,
  updateAdminHomeSection,
} from "@/lib/services/home-section-service";
import { homeSectionPatchInputSchema, objectIdSchema } from "@/lib/validations";

export const runtime = "nodejs";

type HomeSectionContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: HomeSectionContext) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    const { id } = await params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Bo'lim identifikatori noto'g'ri." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Bo'lim JSON formatida bo'lishi kerak." }, { status: 400 });
    }
    const parsed = homeSectionPatchInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Bo'lim ma'lumotlarini tekshiring." }, { status: 400 });
    }

    return NextResponse.json({
      section: await updateAdminHomeSection(id, parsed.data),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: HomeSectionContext) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    const { id } = await params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Bo'lim identifikatori noto'g'ri." }, { status: 400 });
    }

    await removeAdminHomeSection(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
