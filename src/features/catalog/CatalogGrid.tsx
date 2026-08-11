import type { CatalogTab, CategoryId, FlowerType, Product } from "../../shared/types";
import { formatSum } from "../../shared/format";
import { applyImageFallback } from "../../shared/image-fallback";
import { FavoriteButton } from "../product/FavoriteButton";

export type CatalogGridProps = {
  products: readonly Product[];
  activeTab: CatalogTab;
  onTabChange: (tab: CatalogTab) => void;
  onOpenProduct: (product: Product, origin: HTMLElement) => void;
  onAddToCart: (product: Product) => void;
  favoriteIds: readonly string[];
  onToggleFavorite: (productId: string) => void;
  onReset: () => void;
};

const TABS: ReadonlyArray<{ id: CatalogTab; label: string }> = [
  { id: "all", label: "Barchasi" },
  { id: "new", label: "Yangi" },
  { id: "sale", label: "Aksiya" },
];

const CATEGORY_LABELS: Record<CategoryId, string> = {
  roses: "Atirgullar",
  tulips: "Lolalar",
  mixed: "Aralash buket",
  orchids: "Orkide",
  boxed: "Sovg'a qutisi",
  wedding: "To'y guldastasi",
};

const FLOWER_TYPE_LABELS: Record<FlowerType, string> = {
  rose: "atirgul",
  tulip: "lola",
  peony: "pion",
  orchid: "orkide",
  seasonal: "mavsumiy gul",
  mixed: "aralash gul",
};

export function CatalogGrid({
  products,
  activeTab,
  onTabChange,
  onOpenProduct,
  onAddToCart,
  favoriteIds,
  onToggleFavorite,
  onReset,
}: CatalogGridProps) {
  return (
    <div className="catalog-results">
      <div className="catalog-toolbar">
        <div className="catalog-tabs" aria-label="Katalog bo'limlari">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="catalog-result-count" aria-live="polite">
          {products.length} ta natija
        </p>
      </div>

      {products.length === 0 ? (
        <div className="catalog-empty" role="status">
          <span aria-hidden="true">✿</span>
          <h3>Mos buket topilmadi</h3>
          <p>Filtrlarni tozalab, Nafis kolleksiyasini yana ko'ring.</p>
          <button className="secondary-button" type="button" onClick={onReset}>
            Tozalash
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-card__image">
                <img
                  src={product.image}
                  alt={`${product.name} gul kompozitsiyasi`}
                  onError={applyImageFallback}
                />
                <span className="product-card__badges" aria-hidden="true">
                  {product.isNew ? <span>Yangi</span> : null}
                  {product.isOnSale ? <span>Aksiya</span> : null}
                </span>
                <FavoriteButton
                  product={product}
                  isFavorite={favoriteIds.includes(product.id)}
                  onToggle={onToggleFavorite}
                />
              </div>

              <div className="product-card__body">
                <p className="product-card__meta">
                  {CATEGORY_LABELS[product.category]} ·{" "}
                  {product.flowerTypes.map((type) => FLOWER_TYPE_LABELS[type]).join(", ")}
                </p>
                <h3>{product.name}</h3>
                <div className="product-card__price">
                  <strong>{formatSum(product.price)}</strong>
                  {product.originalPrice ? <s>{formatSum(product.originalPrice)}</s> : null}
                </div>
                <div className="product-card__actions">
                  <button
                    className="product-view-button"
                    type="button"
                    aria-label={`${product.name}ni ko'rish`}
                    onClick={(event) => onOpenProduct(product, event.currentTarget)}
                  >
                    Ko'rish
                  </button>
                  <button
                    className="product-cart-button"
                    type="button"
                    aria-label={`${product.name} ni savatga qo'shish`}
                    onClick={() => onAddToCart(product)}
                  >
                    <span aria-hidden="true">+</span>
                    Savatga
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
