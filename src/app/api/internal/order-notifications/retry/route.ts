import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { orderNotificationOutboxService } from "@/lib/services/order-notification-outbox-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await orderNotificationOutboxService.retryDue(20);
  return NextResponse.json(result);
}
