import { NextResponse } from "next/server";
import { adminErrorResponse, assertSameOrigin, requireAdmin } from "@/lib/admin-api";
import {
  ProductImageUploadError,
  uploadProductImage,
} from "@/lib/services/image-upload-service";

export const runtime = "nodejs";

function isProductImageUpload(value: FormDataEntryValue | null): value is File {
  return (
    value !== null &&
    typeof value !== "string" &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    typeof value.size === "number"
  );
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      return NextResponse.json(
        { error: "Rasm multipart/form-data formatida yuborilishi kerak." },
        { status: 400 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Rasm formati o'qilmadi." }, { status: 400 });
    }

    const file = formData.get("file");
    const alt = formData.get("alt");
    if (!isProductImageUpload(file) || typeof alt !== "string") {
      return NextResponse.json(
        { error: "Rasm fayli va uning tavsifi majburiy." },
        { status: 400 }
      );
    }

    const image = await uploadProductImage(file, alt);
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductImageUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return adminErrorResponse(error);
  }
}
