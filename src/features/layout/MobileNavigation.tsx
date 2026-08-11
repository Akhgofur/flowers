"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type MobileNavigationProps = {
  cartItemCount: number;
  favoriteCount: number;
  onOpenCart: (origin: HTMLElement) => void;
};

export function MobileNavigation({
  cartItemCount,
  favoriteCount,
  onOpenCart,
}: MobileNavigationProps) {
  const t = useTranslations("Header");

  return (
    <nav className="mobile-bottom-nav" aria-label={t("mobileNavigationLabel")}>
      <Link href="/" aria-label={t("navHome")}>
        <span aria-hidden="true">⌂</span>
        <small>{t("navHome")}</small>
      </Link>
      <Link href="/catalog" aria-label={t("navCatalog")}>
        <span aria-hidden="true">⌗</span>
        <small>{t("navCatalog")}</small>
      </Link>
      <Link
        href="/catalog?favorites=true"
        aria-label={`${t("favorites")}, ${favoriteCount}`}
      >
        <span aria-hidden="true">♡</span>
        <small>{t("favorites")}</small>
        {favoriteCount > 0 ? <strong aria-hidden="true">{favoriteCount}</strong> : null}
      </Link>
      <button
        type="button"
        aria-label={`${t("cart")}, ${cartItemCount}`}
        onClick={(event) => onOpenCart(event.currentTarget)}
      >
        <span aria-hidden="true">□</span>
        <small>{t("cart")}</small>
        {cartItemCount > 0 ? <strong aria-hidden="true">{cartItemCount}</strong> : null}
      </button>
    </nav>
  );
}
