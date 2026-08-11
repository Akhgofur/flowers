import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/storefront/LanguageSwitcher";
import type { ProductImage } from "@/lib/contracts";

export type HeaderProps = {
  cartItemCount: number;
  isCartOpen: boolean;
  brandLogo?: ProductImage;
  onOpenCart: (origin: HTMLElement) => void;
};

const NAVIGATION_LINKS = [
  { href: "/catalog", label: "navCatalog" },
  { href: "/catalog?sale=true", label: "navSales" },
  { href: "#gift", label: "navGifts" },
  { href: "#about", label: "navAbout" },
  { href: "#delivery", label: "navDelivery" },
  { href: "#contact", label: "navContacts" },
] as const;

export function Header({ cartItemCount, isCartOpen, brandLogo, onOpenCart }: HeaderProps) {
  const t = useTranslations("Header");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const cartStateLabel =
    cartItemCount === 0 ? t("cartEmpty") : t("cartItems", { count: cartItemCount });

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMobileMenuOpen]);

  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="shell utility-bar__content">
          <div className="utility-bar__group">
            <span>{t("location")}</span>
            <span>{t("schedule")}</span>
            <span>{t("deliveryNotice")}</span>
          </div>
          <div className="utility-bar__group utility-bar__meta">
            <LanguageSwitcher />
            <span>Instagram</span>
            <span>Telegram</span>
          </div>
        </div>
      </div>

      <div className="shell header-main">
        <Link className="wordmark" href="/" aria-label={t("homeLabel")}>
          <Image
            className="wordmark__image"
            src={brandLogo?.url ?? "/brand/floraluxe-logo.jpg"}
            alt={brandLogo?.alt ?? "Floraluxe"}
            width={320}
            height={120}
            priority
          />
          <span className="visually-hidden">Floraluxe</span>
        </Link>

        <nav className="desktop-nav" aria-label={t("navigationLabel")}>
          {NAVIGATION_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>{t(link.label)}</Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link className="icon-link" href="/catalog" aria-label={t("search")}>
            <span aria-hidden="true">⌕</span>
          </Link>
          <a
            className="icon-link"
            href="#about"
            aria-label={t("aboutShortcut")}
          >
            <span aria-hidden="true">♙</span>
          </a>
          <button
            className="cart-button"
            type="button"
            data-has-items={cartItemCount > 0}
            aria-label={`${isCartOpen ? t("cartClose") : t("cartOpen")}, ${cartStateLabel}`}
            aria-controls="cart-drawer"
            aria-expanded={isCartOpen}
            onClick={(event) => onOpenCart(event.currentTarget)}
          >
            <span aria-hidden="true">{t("cart")}</span>
            {cartItemCount > 0 ? (
              <strong className="cart-count-badge" aria-hidden="true">
                {cartItemCount}
              </strong>
            ) : null}
          </button>
          <button
            ref={mobileMenuButtonRef}
            className="menu-toggle"
            type="button"
            aria-label={
              isMobileMenuOpen ? t("menuClose") : t("menuOpen")
            }
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          >
            <span aria-hidden="true">{isMobileMenuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label={t("mobileNavigationLabel")}
        >
          <div className="shell mobile-nav__language">
            <LanguageSwitcher />
          </div>
          <div className="shell mobile-nav__links">
            {NAVIGATION_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t(link.label)}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
