import { NextResponse } from "next/server";
import { adminErrorResponse, assertSameOrigin, requireAdmin } from "@/lib/admin-api";
import { orderNotificationOutboxService } from "@/lib/services/order-notification-outbox-service";
import { objectIdSchema } from "@/lib/validations";

export const runtime = "nodejs";
type OrderContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: OrderContext) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    const { id } = await params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Buyurtma identifikatori noto'g'ri." }, { status: 400 });
    }
    return NextResponse.json(await orderNotificationOutboxService.retryForOrder(id));
  } catch (error) {
    return adminErrorResponse(error);
  }
}
