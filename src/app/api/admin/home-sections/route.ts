import { NextResponse } from "next/server";
import { adminErrorResponse, assertSameOrigin, requireAdmin } from "@/lib/admin-api";
import {
  createAdminHomeSection,
  getAdminHomeSections,
} from "@/lib/services/home-section-service";
import { homeSectionInputSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ sections: await getAdminHomeSections() });
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
      return NextResponse.json(
        { error: "Bosh sahifa bo'limi JSON formatida bo'lishi kerak." },
        { status: 400 }
      );
    }

    const parsed = homeSectionInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bosh sahifa bo'limi ma'lumotlarini tekshiring." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { section: await createAdminHomeSection(parsed.data) },
      { status: 201 }
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
