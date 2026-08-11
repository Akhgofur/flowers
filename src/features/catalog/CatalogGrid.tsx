import type { CatalogTab, FlowerType, Product } from "../../shared/types";
import { formatSum } from "../../shared/format";
import { applyImageFallback } from "../../shared/image-fallback";
import { FavoriteButton } from "../product/FavoriteButton";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";

export type CatalogGridProps = {
  products: readonly Product[];
  categoryNames: ReadonlyMap<string, string>;
  activeTab: CatalogTab;
  onTabChange: (tab: CatalogTab) => void;
  onOpenProduct: (product: Product, origin: HTMLElement) => void;
  onAddToCart: (product: Product) => void;
  favoriteIds: readonly string[];
  onToggleFavorite: (productId: string) => void;
  onReset: () => void;
};

const TABS: readonly CatalogTab[] = ["all", "new", "sale"];
const KNOWN_FLOWER_TYPES = new Set([
  "rose",
  "tulip",
  "peony",
  "orchid",
  "seasonal",
  "mixed",
]);

export function CatalogGrid({
  products,
  categoryNames,
  activeTab,
  onTabChange,
  onOpenProduct,
  onAddToCart,
  favoriteIds,
  onToggleFavorite,
  onReset,
}: CatalogGridProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Catalog");
  const flowerTypeLabel = (flowerType: FlowerType) =>
    KNOWN_FLOWER_TYPES.has(flowerType)
      ? t(`flowerTypes.${flowerType}` as "flowerTypes.rose")
      : flowerType;

  return (
    <div className="catalog-results">
      <div className="catalog-toolbar">
        <div className="catalog-tabs" aria-label={t("tabsLabel")}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={activeTab === tab}
              onClick={() => onTabChange(tab)}
            >
              {t(tab)}
            </button>
          ))}
        </div>
        <p className="catalog-result-count" aria-live="polite">
          {t("resultCount", { count: products.length })}
        </p>
      </div>

      {products.length === 0 ? (
        <div className="catalog-empty" role="status">
          <span aria-hidden="true">✿</span>
          <h3>{t("noResults")}</h3>
          <p>{t("noResultsDescription")}</p>
          <button className="secondary-button" type="button" onClick={onReset}>
            {t("resetAll")}
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-card__image">
                <img
                  src={product.image}
                  alt={t("imageAlt", { name: product.name })}
                  onError={applyImageFallback}
                />
                <span className="product-card__badges" aria-hidden="true">
                  {product.isNew ? <span>{t("newBadge")}</span> : null}
                  {product.isOnSale ? <span>{t("saleBadge")}</span> : null}
                </span>
                <FavoriteButton
                  product={product}
                  isFavorite={favoriteIds.includes(product.id)}
                  onToggle={onToggleFavorite}
                />
              </div>

              <div className="product-card__body">
                <p className="product-card__meta">
                  {categoryNames.get(product.category) ?? product.category} ·{" "}
                  {product.flowerTypes.map(flowerTypeLabel).join(", ")}
                </p>
                <h3>{product.name}</h3>
                <div className="product-card__price">
                  <strong>{formatSum(product.price, locale)}</strong>
                  {product.originalPrice ? <s>{formatSum(product.originalPrice, locale)}</s> : null}
                </div>
                <div className="product-card__actions">
                  <button
                    className="product-view-button"
                    type="button"
                    aria-label={t("viewProductAria", { name: product.name })}
                    onClick={(event) => onOpenProduct(product, event.currentTarget)}
                  >
                    {t("viewProduct")}
                  </button>
                  <button
                    className="product-cart-button"
                    type="button"
                    aria-label={t("addToCartAria", { name: product.name })}
                    onClick={() => onAddToCart(product)}
                  >
                    <span aria-hidden="true">+</span>
                    {t("addToCart")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
