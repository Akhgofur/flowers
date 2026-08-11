import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type HeaderProps = {
  cartItemCount: number;
  isCartOpen: boolean;
  onOpenCart: (origin: HTMLElement) => void;
};

const NAVIGATION_LINKS = [
  { href: "/gullar", label: "Katalog" },
  { href: "/gullar?sale=true", label: "Chegirmalar" },
  { href: "#gift", label: "Sovg'alar" },
  { href: "#about", label: "Biz haqimizda" },
  { href: "#delivery", label: "Yetkazib berish" },
  { href: "#contact", label: "Aloqa" },
] as const;

export function Header({ cartItemCount, isCartOpen, onOpenCart }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const cartStateLabel =
    cartItemCount === 0 ? "savat bo'sh" : `${cartItemCount} ta mahsulot`;

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
            <span>Toshkent</span>
            <span>Har kuni 08:00–22:00</span>
            <span>Shahar bo'ylab yetkazib beramiz</span>
          </div>
          <div className="utility-bar__group utility-bar__meta">
            <span>UZ</span>
            <span>Instagram</span>
            <span>Telegram</span>
          </div>
        </div>
      </div>

      <div className="shell header-main">
        <Link className="wordmark" href="/" aria-label="Nafis bosh sahifasi">
          <span className="wordmark__bloom" aria-hidden="true">✿</span>
          <span>Nafis</span>
          <small>gullar uyi</small>
        </Link>

        <nav className="desktop-nav" aria-label="Asosiy navigatsiya">
          {NAVIGATION_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link className="icon-link" href="/gullar" aria-label="Gullarni qidirish">
            <span aria-hidden="true">⌕</span>
          </Link>
          <a
            className="icon-link"
            href="#about"
            aria-label="Biz haqimizda bo'limiga o'tish"
          >
            <span aria-hidden="true">♙</span>
          </a>
          <button
            className="cart-button"
            type="button"
            data-has-items={cartItemCount > 0}
            aria-label={`${isCartOpen ? "Savatni yopish" : "Savatni ochish"}, ${cartStateLabel}`}
            aria-controls="cart-drawer"
            aria-expanded={isCartOpen}
            onClick={(event) => onOpenCart(event.currentTarget)}
          >
            <span aria-hidden="true">Bag</span>
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
              isMobileMenuOpen
                ? "Mobil menyuni yopish"
                : "Mobil menyuni ochish"
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
          aria-label="Mobil navigatsiya"
        >
          <div className="shell mobile-nav__links">
            {NAVIGATION_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
