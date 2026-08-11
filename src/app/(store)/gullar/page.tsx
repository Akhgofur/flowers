import type { Metadata } from "next";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import type { PublicCatalogFilters } from "@/lib/contracts";

export const metadata: Metadata = {
  title: "Gullar katalogi",
  description:
    "Toshkent uchun yangi guldastalar, atirgullar, lolalar va florist tanlovlari katalogi.",
  alternates: { canonical: "/gullar" },
};

export const dynamic = "force-dynamic";

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toPositiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseCatalogFilters(
  searchParams: Record<string, string | string[] | undefined>
): PublicCatalogFilters {
  const category = firstValue(searchParams.category)?.trim();
  const query = firstValue(searchParams.q)?.trim();
  const sale = firstValue(searchParams.sale);
  const page = toPositiveInteger(firstValue(searchParams.page));

  return {
    ...(category ? { category } : {}),
    ...(query ? { query } : {}),
    ...(sale === "true" ? { sale: true } : {}),
    ...(page ? { page } : {}),
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  return await StorefrontShell({
    filters: parseCatalogFilters(await searchParams),
  });
}
