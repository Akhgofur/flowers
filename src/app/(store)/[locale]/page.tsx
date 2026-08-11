import type { Metadata } from "next";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";

export const metadata: Metadata = {
  title: "Nafis Flowers",
  description:
    "Signature bouquets, fresh flowers and thoughtful delivery across Tashkent.",
};

export const dynamic = "force-dynamic";

export default async function StorePage({
  params: _params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const storefront = await StorefrontShell({});
  return storefront;
}
