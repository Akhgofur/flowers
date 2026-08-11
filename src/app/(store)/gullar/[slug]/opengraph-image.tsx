import { ImageResponse } from "next/og";

// ImageResponse is verified in the Edge runtime here; importing the Mongo/Mongoose
// stack into this specialized metadata route makes the Node dev route unstable.
export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "Nafis Flowers mahsulot previewi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ProductOpenGraphImageProps = {
  params: Promise<{ slug: string }>;
};

type OpenGraphProduct = {
  name: string;
  price: number;
};

function getPublicProductUrl(slug: string): string | null {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredSiteUrl) return null;

  try {
    return new URL(
      `/api/products/${encodeURIComponent(slug)}`,
      configuredSiteUrl
    ).toString();
  } catch {
    return null;
  }
}

async function loadOpenGraphProduct(slug: string): Promise<OpenGraphProduct | null> {
  const productUrl = getPublicProductUrl(slug);
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

function formatOpenGraphSum(value: number): string {
  return `${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm`;
}

export default async function ProductOpenGraphImage({
  params,
}: ProductOpenGraphImageProps) {
  const { slug } = await params;
  const product = await loadOpenGraphProduct(slug);
  const title = product?.name ?? "Nafis Flowers";
  const price = product
    ? formatOpenGraphSum(product.price)
    : "Toshkent bo'ylab yetkazib berish";

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
          NAFIS · GULLAR UYI
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
          Bugun terilgan · Mehr bilan yetkazilgan
        </div>
      </div>
    ),
    size
  );
}
