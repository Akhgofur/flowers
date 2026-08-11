import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, HERO_SLIDES, PRODUCTS } from "../data/catalog";
import { CartDrawer } from "../features/cart/CartDrawer";
import {
  addToCart,
  removeFromCart,
  setCartQuantity,
} from "../features/cart/cart-reducer";
import {
  readCart,
  readFavorites,
  writeCart,
  writeFavorites,
} from "../features/cart/cart-storage";
import { CatalogFilters } from "../features/catalog/CatalogFilters";
import { CatalogGrid } from "../features/catalog/CatalogGrid";
import {
  DEFAULT_FILTERS,
  applyCatalogFilters,
} from "../features/catalog/catalog-utils";
import { CategoryStrip } from "../features/layout/CategoryStrip";
import { Footer } from "../features/layout/Footer";
import { Header } from "../features/layout/Header";
import { HeroCarousel } from "../features/layout/HeroCarousel";
import { PromoBanner } from "../features/layout/PromoBanner";
import { ProductQuickView } from "../features/product/ProductQuickView";
import type {
  CartLine,
  Category,
  CatalogFilters as CatalogFilterState,
  CatalogTab,
  CategoryId,
  HeroSlide,
  Product,
} from "../shared/types";
import type { PublicSiteSettings } from "@/lib/contracts";

function focusAndScrollTo(targetId: HeroSlide["ctaTarget"]) {
  const target = document.querySelector(targetId);
  if (!target) return;

  if (target instanceof HTMLElement && target.tabIndex >= -1) {
    target.focus({ preventScroll: true });
  }
  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function cloneFilters(filters: CatalogFilterState): CatalogFilterState {
  return {
    ...filters,
    flowerTypes: [...filters.flowerTypes],
    colors: [...filters.colors],
  };
}

function createDefaultFilters(): CatalogFilterState {
  return cloneFilters(DEFAULT_FILTERS);
}

type InertElement = HTMLElement & { inert: boolean };

type ActionStatus = {
  id: number;
  message: string;
};

const ACTION_STATUS_DURATION_MS = 3000;

export type AppProps = {
  products?: readonly Product[];
  categories?: readonly Category[];
  siteSettings?: PublicSiteSettings;
  initialFilters?: AppInitialCatalogFilters;
};

export type AppInitialCatalogFilters = Partial<
  Pick<CatalogFilterState, "query" | "category" | "tab">
>;

function createInitialFilters(
  initialFilters?: AppInitialCatalogFilters
): CatalogFilterState {
  const defaults = createDefaultFilters();

  return {
    ...defaults,
    query: initialFilters?.query ?? defaults.query,
    category: initialFilters?.category ?? defaults.category,
    tab: initialFilters?.tab ?? defaults.tab,
  };
}

export default function App({
  products = PRODUCTS,
  categories = CATEGORIES,
  siteSettings,
  initialFilters,
}: AppProps) {
  const appContentRef = useRef<HTMLDivElement>(null);
  const quickViewOriginRef = useRef<HTMLElement | null>(null);
  const cartOriginRef = useRef<HTMLElement | null>(null);
  const actionStatusIdRef = useRef(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<CatalogFilterState>(
    () => createInitialFilters(initialFilters)
  );
  const [appliedFilters, setAppliedFilters] = useState<CatalogFilterState>(
    () => createInitialFilters(initialFilters)
  );
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionStatus, setActionStatus] = useState<ActionStatus | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const hasActiveOverlay = selectedProduct !== null || isCartOpen;

  useLayoutEffect(() => {
    const appContent = appContentRef.current as InertElement | null;
    if (!appContent) return;

    appContent.inert = hasActiveOverlay;
    return () => {
      appContent.inert = false;
    };
  }, [hasActiveOverlay]);

  const validProductIds = useMemo(
    () => new Set(products.map((product) => product.id)),
    [products]
  );

  useEffect(() => {
    setCartLines(readCart(validProductIds));
    setFavoriteIds(readFavorites(validProductIds));
    setIsHydrated(true);
  }, [validProductIds]);

  useEffect(() => {
    if (isHydrated) writeCart(cartLines);
  }, [cartLines, isHydrated]);

  useEffect(() => {
    if (isHydrated) writeFavorites(favoriteIds);
  }, [favoriteIds, isHydrated]);

  useEffect(() => {
    if (!actionStatus) return;

    const timeoutId = window.setTimeout(() => {
      setActionStatus((currentStatus) =>
        currentStatus?.id === actionStatus.id ? null : currentStatus
      );
    }, ACTION_STATUS_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [actionStatus]);

  const visibleProducts = useMemo(
    () => applyCatalogFilters(products, appliedFilters),
    [appliedFilters, products]
  );

  const cartItemCount = cartLines.reduce(
    (total, line) => total + line.quantity,
    0
  );

  const selectCategory = (categoryId: CategoryId, targetId: "#catalog" | "#gift") => {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      category: categoryId,
    }));
    setAppliedFilters((currentFilters) => ({
      ...currentFilters,
      category: categoryId,
    }));
    focusAndScrollTo(targetId);
  };

  const selectTab = (tab: CatalogTab) => {
    setDraftFilters((currentFilters) => ({ ...currentFilters, tab }));
    setAppliedFilters((currentFilters) => ({ ...currentFilters, tab }));
  };

  const selectSale = () => {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      tab: "sale",
    }));
    setAppliedFilters((currentFilters) => ({
      ...currentFilters,
      tab: "sale",
    }));
    focusAndScrollTo("#catalog");
  };

  const handleHeroNavigate = (targetId: HeroSlide["ctaTarget"]) => {
    if (targetId === "#sale") {
      selectSale();
      return;
    }

    focusAndScrollTo(targetId);
  };

  const resetFilters = () => {
    setDraftFilters(createDefaultFilters());
    setAppliedFilters(createDefaultFilters());
  };

  const announceAction = useCallback((message: string) => {
    actionStatusIdRef.current += 1;
    setActionStatus({ id: actionStatusIdRef.current, message });
  }, []);

  const openProduct = (product: Product, origin: HTMLElement) => {
    if (isCartOpen) return;
    quickViewOriginRef.current = origin;
    setSelectedProduct(product);
  };

  const addProductToCart = (product: Product) => {
    setCartLines((currentLines) => addToCart(currentLines, product.id));
    announceAction(`${product.name} savatga qo'shildi.`);
  };

  const addQuickViewProduct = (productId: string, quantity: number) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;

    setCartLines((currentLines) =>
      addToCart(currentLines, productId, quantity)
    );
    announceAction(`${product.name} savatga qo'shildi.`);
  };

  const toggleFavorite = (productId: string) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;

    const isFavorite = favoriteIds.includes(productId);
    setFavoriteIds(
      isFavorite
        ? favoriteIds.filter((id) => id !== productId)
        : [...favoriteIds, productId]
    );
    announceAction(
      isFavorite
        ? `${product.name} sevimlilardan olib tashlandi.`
        : `${product.name} sevimlilarga qo'shildi.`
    );
  };

  const closeProduct = useCallback(() => setSelectedProduct(null), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const toggleCart = (origin: HTMLElement) => {
    if (selectedProduct !== null) return;
    if (!isCartOpen) {
      cartOriginRef.current = origin;
    }
    setActionStatus(null);
    setIsCartOpen((isOpen) => !isOpen);
  };

  const continueShopping = () => {
    setIsCartOpen(false);
    queueMicrotask(() => focusAndScrollTo("#catalog"));
  };

  const selectedCategoryTitle = categories.find(
    (category) => category.id === draftFilters.category
  )?.title;

  return (
    <div id="top" className="app-shell">
      <div
        ref={appContentRef}
        aria-hidden={hasActiveOverlay || undefined}
      >
        <Header
          cartItemCount={cartItemCount}
          isCartOpen={isCartOpen}
          onOpenCart={toggleCart}
        />

        <main aria-label="Nafis gullar katalogi">
        <h2 className="visually-hidden">Baxtni gullar bilan yuboring.</h2>
        <HeroCarousel slides={HERO_SLIDES} onNavigate={handleHeroNavigate} />

        <div id="sale" className="sale-ribbon" tabIndex={-1}>
          <div className="shell sale-ribbon__content">
            <strong>Hafta taklifi</strong>
            <span>Tanlangan buketlarda yoqimli narxlar</span>
            <Link
              href="/catalog?sale=true"
              onClick={(event) => {
                event.preventDefault();
                selectSale();
              }}
            >
              Chegirmalarni ko'rish →
            </Link>
          </div>
        </div>

        <CategoryStrip
          categories={categories}
          selectedCategory={draftFilters.category}
          onSelectCategory={(categoryId) => selectCategory(categoryId, "#catalog")}
        />

        <div className="shell selection-status" aria-live="polite">
          {selectedCategoryTitle ? (
            <p>{selectedCategoryTitle} tanlandi — katalog filtri qo'llanadi.</p>
          ) : (
            <p>Kategoriyani tanlang — natijalar katalogda ko'rsatiladi.</p>
          )}
        </div>

        <PromoBanner onSelectGiftCategory={() => selectCategory("boxed", "#gift")} />

        <section
          id="catalog"
          className="catalog-showcase section"
          aria-labelledby="catalog-title"
          tabIndex={-1}
        >
          <div className="shell">
            <div className="catalog-heading">
              <div>
                <p className="eyebrow">Florist tanlovi</p>
                <h2 id="catalog-title">Nafis kolleksiyasi</h2>
              </div>
              <p>
                Kayfiyat, gul turi va byudjetga mos kompozitsiyani toping.
                Har biri buyurtma kuni yangi gullardan tayyorlanadi.
              </p>
            </div>

            <div className="catalog-layout">
              <CatalogFilters
                filters={draftFilters}
                onChange={setDraftFilters}
                onApply={() => setAppliedFilters(cloneFilters(draftFilters))}
                onReset={resetFilters}
              />
              <CatalogGrid
                products={visibleProducts}
                activeTab={appliedFilters.tab}
                onTabChange={selectTab}
                onOpenProduct={openProduct}
                onAddToCart={addProductToCart}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onReset={resetFilters}
              />
            </div>
          </div>
        </section>
        </main>

        <Footer settings={siteSettings} />
      </div>

      <ProductQuickView
        product={selectedProduct}
        open={selectedProduct !== null}
        isFavorite={
          selectedProduct ? favoriteIds.includes(selectedProduct.id) : false
        }
        restoreFocusTarget={quickViewOriginRef.current}
        onClose={closeProduct}
        onAdd={addQuickViewProduct}
        onToggleFavorite={toggleFavorite}
      />

      <CartDrawer
        open={isCartOpen}
        lines={cartLines}
        products={products}
        restoreFocusTarget={cartOriginRef.current}
        onClose={closeCart}
        onSetQuantity={(productId, quantity) =>
          setCartLines((currentLines) =>
            setCartQuantity(currentLines, productId, quantity)
          )
        }
        onRemove={(productId) =>
          setCartLines((currentLines) =>
            removeFromCart(currentLines, productId)
          )
        }
        onContinueShopping={continueShopping}
      />

      {actionStatus ? (
        <p
          key={actionStatus.id}
          className="catalog-action-status"
          role="status"
        >
          {actionStatus.message}
        </p>
      ) : null}
    </div>
  );
}
