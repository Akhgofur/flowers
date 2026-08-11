import type { Metadata } from "next";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";

export const metadata: Metadata = {
  title: "Toshkentda gullar yetkazib berish",
  description:
    "Nafis Flowers — Toshkent bo'ylab yangi guldastalar, sovg'a qutilari va ishonchli yetkazib berish.",
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const storefront = await StorefrontShell({});
  return storefront;
}
