import { NextResponse } from "next/server";
import { adminErrorResponse, assertSameOrigin, requireAdmin } from "@/lib/admin-api";
import { getAdminSettings, saveAdminSettings } from "@/lib/services/admin-service";
import { siteSettingsInputSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ settings: await getAdminSettings() });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Sozlamalar JSON formatida bo'lishi kerak." }, { status: 400 });
    }

    const parsed = siteSettingsInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Sozlamalarni tekshiring." }, { status: 400 });
    }

    return NextResponse.json({ settings: await saveAdminSettings(parsed.data) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
