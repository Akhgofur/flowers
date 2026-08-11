import { ImageResponse } from "next/og";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { formatSum } from "@/shared/format";

export const dynamic = "force-dynamic";
export const alt = "Nafis Flowers product preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ProductOpenGraphImageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

type OpenGraphProduct = {
  name: string;
  price: number;
};

function getPublicProductUrl(locale: string, slug: string): string | null {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredSiteUrl) return null;

  try {
    return new URL(
      `/api/products/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
      configuredSiteUrl
    ).toString();
  } catch {
    return null;
  }
}

async function loadOpenGraphProduct(locale: string, slug: string): Promise<OpenGraphProduct | null> {
  const productUrl = getPublicProductUrl(locale, slug);
  if (!productUrl) return null;

  try {
    const response = await fetch(productUrl, { next: { revalidate: 300 } });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      product?: { name?: unknown; price?: unknown };
    };
    const product = payload.product;

    return typeof product?.name === "string" && typeof product.price === "number"
      ? { name: product.name, price: product.price }
      : null;
  } catch {
    return null;
  }
}

const OPEN_GRAPH_COPY: Record<Locale, { brand: string; delivery: string }> = {
  ru: {
    brand: "NAFIS · ДОМ ЦВЕТОВ",
    delivery: "Собрано сегодня · доставлено с заботой",
  },
  uz: {
    brand: "NAFIS · GULLAR UYI",
    delivery: "Bugun terilgan · mehr bilan yetkazilgan",
  },
  en: {
    brand: "NAFIS · HOUSE OF FLOWERS",
    delivery: "Gathered today · delivered with care",
  },
};

export default async function ProductOpenGraphImage({
  params,
}: ProductOpenGraphImageProps) {
  const { locale: candidate, slug } = await params;
  const locale = isLocale(candidate) ? candidate : DEFAULT_LOCALE;
  const product = await loadOpenGraphProduct(locale, slug);
  const copy = OPEN_GRAPH_COPY[locale];
  const title = product?.name ?? "Nafis Flowers";
  const price = product ? formatSum(product.price, locale) : copy.delivery;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px",
          color: "#2c1a20",
          backgroundColor: "#fff2f5",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: "0.18em",
            color: "#c84464",
          }}
        >
          {copy.brand}
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "800px" }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
            {title}
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#a03954" }}>
            {price}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#6f4d56" }}>
          {copy.delivery}
        </div>
      </div>
    ),
    size
  );
}
