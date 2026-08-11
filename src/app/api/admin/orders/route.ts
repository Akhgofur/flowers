import { NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/lib/admin-api";
import { getAdminOrders } from "@/lib/services/admin-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ orders: await getAdminOrders() });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
