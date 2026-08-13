"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import type { CatalogProduct, PublicSiteSettings } from "@/lib/contracts";
import { CartDrawer } from "@/features/cart/CartDrawer";
import { addToCart, removeFromCart, setCartQuantity } from "@/features/cart/cart-reducer";
import {
  readCart,
  readFavorites,
  writeCart,
  writeFavorites,
} from "@/features/cart/cart-storage";
import { Footer } from "@/features/layout/Footer";
import { Header } from "@/features/layout/Header";
import { MobileNavigation } from "@/features/layout/MobileNavigation";
import type { CartLine } from "@/shared/types";
import { toClientProduct } from "./storefront-mappers";

type StorefrontContextValue = {
  favoriteIds: readonly string[];
  addProduct: (productId: string, quantity?: number) => void;
  toggleFavorite: (productId: string) => void;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function useStorefront() {
  const value = useContext(StorefrontContext);
  if (!value) throw new Error("useStorefront must be used inside StorefrontFrame");
  return value;
}

export function useOptionalStorefront() {
  return useContext(StorefrontContext);
}

export type StorefrontFrameProps = {
  children: ReactNode;
  products: readonly CatalogProduct[];
  settings?: PublicSiteSettings;
};

type InertElement = HTMLElement & { inert: boolean };

export function StorefrontFrame({ children, products, settings }: StorefrontFrameProps) {
  const locale = useLocale() as Locale;
  const tProduct = useTranslations("Product");
  const contentRef = useRef<HTMLDivElement>(null);
  const statusIdRef = useRef(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartOrigin, setCartOrigin] = useState<HTMLElement | null>(null);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [status, setStatus] = useState<{ id: number; text: string } | null>(null);
  /** Basket products this route never shipped, fetched on demand and kept per session. */
  const [cartProducts, setCartProducts] = useState<readonly CatalogProduct[]>([]);
  const requestedIdsRef = useRef(new Set<string>());

  const clientProducts = useMemo(
    () =>
      [
        ...new Map(
          [...products, ...cartProducts].map((product) => [product.id, product])
        ).values(),
      ].map(toClientProduct),
    [products, cartProducts]
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- browser storage is intentionally hydrated after the server render */
    setCartLines(readCart());
    setFavoriteIds(readFavorites());
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (isHydrated) writeCart(cartLines);
  }, [cartLines, isHydrated]);

  useEffect(() => {
    if (isHydrated) writeFavorites(favoriteIds);
  }, [favoriteIds, isHydrated]);

  // The cart outlives the route: a product page ships one product, yet the
  // basket may name a dozen. Lines with no product data used to vanish from the
  // drawer and its total, so anything missing is looked up once per id.
  useEffect(() => {
    if (!isHydrated) return;

    const known = new Set(products.map((product) => product.id));
    const missingIds = cartLines
      .map((line) => line.productId)
      .filter((id) => !known.has(id) && !requestedIdsRef.current.has(id));

    if (missingIds.length === 0) return;
    for (const id of missingIds) requestedIdsRef.current.add(id);

    const controller = new AbortController();

    const query = new URLSearchParams({ ids: missingIds.join(","), locale });
    fetch(`/api/products?${query}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { products?: CatalogProduct[] } | null) => {
        const fetched = payload?.products;
        if (!fetched?.length) return;
        setCartProducts((current) => [...current, ...fetched]);
      })
      .catch(() => {
        // An offline or failing lookup must not break the page. The ids stay
        // marked as requested so a render loop cannot retry them forever.
      });

    return () => controller.abort();
  }, [cartLines, isHydrated, locale, products]);

  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(
      () => setStatus((current) => (current?.id === status.id ? null : current)),
      3000
    );
    return () => window.clearTimeout(timeout);
  }, [status]);

  useLayoutEffect(() => {
    const content = contentRef.current as InertElement | null;
    if (!content) return;
    content.inert = isCartOpen;
    return () => {
      content.inert = false;
    };
  }, [isCartOpen]);

  const announce = useCallback((text: string) => {
    statusIdRef.current += 1;
    setStatus({ id: statusIdRef.current, text });
  }, []);

  const addProduct = useCallback(
    (productId: string, quantity = 1) => {
      const product = products.find((candidate) => candidate.id === productId);
      if (!product) return;
      setCartLines((current) => addToCart(current, productId, quantity));
      announce(tProduct("addedToCart", { name: product.name }));
    },
    [announce, products, tProduct]
  );

  const toggleFavorite = useCallback(
    (productId: string) => {
      const product = products.find((candidate) => candidate.id === productId);
      if (!product) return;
      setFavoriteIds((current) => {
        const isFavorite = current.includes(productId);
        announce(
          tProduct(isFavorite ? "removedFromFavorites" : "addedToFavorites", {
            name: product.name,
          })
        );
        return isFavorite
          ? current.filter((id) => id !== productId)
          : [...current, productId];
      });
    },
    [announce, products, tProduct]
  );

  const openCart = (origin: HTMLElement) => {
    setCartOrigin(origin);
    setIsCartOpen(true);
  };
  const cartItemCount = cartLines.reduce((total, line) => total + line.quantity, 0);

  return (
    <StorefrontContext.Provider value={{ favoriteIds, addProduct, toggleFavorite }}>
      <div className="app-shell storefront-frame">
        <div ref={contentRef} aria-hidden={isCartOpen || undefined}>
          <Header
            cartItemCount={cartItemCount}
            favoriteCount={favoriteIds.length}
            isCartOpen={isCartOpen}
            settings={settings}
            brandLogo={settings?.brandLogo}
            onOpenCart={(origin) => (isCartOpen ? setIsCartOpen(false) : openCart(origin))}
          />
          {children}
          <Footer settings={settings} />
          <MobileNavigation
            cartItemCount={cartItemCount}
            favoriteCount={favoriteIds.length}
            onOpenCart={openCart}
          />
        </div>

        <CartDrawer
          open={isCartOpen}
          lines={cartLines}
          products={clientProducts}
          restoreFocusTarget={cartOrigin}
          onClose={() => setIsCartOpen(false)}
          onSetQuantity={(productId, quantity) =>
            setCartLines((current) => setCartQuantity(current, productId, quantity))
          }
          onRemove={(productId) =>
            setCartLines((current) => removeFromCart(current, productId))
          }
          onContinueShopping={() => {
            setIsCartOpen(false);
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- locale-aware hard navigation also refreshes server catalog data
            window.location.assign(`/${locale}/catalog`);
          }}
        />

        {status ? (
          <p key={status.id} className="catalog-action-status" role="status">
            {status.text}
          </p>
        ) : null}
      </div>
    </StorefrontContext.Provider>
  );
}
