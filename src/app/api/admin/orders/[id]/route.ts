import { NextResponse } from "next/server";
import { adminErrorResponse, assertSameOrigin, requireAdmin } from "@/lib/admin-api";
import { transitionAdminOrder } from "@/lib/services/admin-service";
import { objectIdSchema, orderStatusSchema } from "@/lib/validations";

export const runtime = "nodejs";

type OrderContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: OrderContext) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    const { id } = await params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Buyurtma identifikatori noto'g'ri." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Buyurtma JSON formatida bo'lishi kerak." }, { status: 400 });
    }

    const parsed = orderStatusSchema.safeParse(
      typeof body === "object" && body !== null ? (body as { status?: unknown }).status : undefined
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Buyurtma holati noto'g'ri." }, { status: 400 });
    }

    return NextResponse.json({ order: await transitionAdminOrder(id, parsed.data) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
