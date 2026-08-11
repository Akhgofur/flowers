import type { Category, CategoryId } from "../../shared/types";
import { applyImageFallback } from "../../shared/image-fallback";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type CategoryStripProps = {
  categories: readonly Category[];
  selectedCategory: CategoryId | null;
  onSelectCategory?: (categoryId: CategoryId) => void;
  hrefForCategory?: (categoryId: CategoryId) => string;
};

export function CategoryStrip({
  categories,
  selectedCategory,
  onSelectCategory,
  hrefForCategory,
}: CategoryStripProps) {
  const t = useTranslations("Categories");

  return (
    <section id="categories" className="categories section" tabIndex={-1}>
      <div className="shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("kicker")}</p>
            <h2>{t("title")}</h2>
          </div>
          <p>{t("subtitle")}</p>
        </div>

        <div className="category-grid">
          {categories.map((category) => {
            const content = <>
              <span className="category-card__image">
                <img src={category.image} alt="" onError={applyImageFallback} />
              </span>
              <span className="category-card__copy">
                <strong>{category.title}</strong>
                <small>{t("productCount", { count: category.productCount })}</small>
              </span>
              <span className="category-card__arrow" aria-hidden="true">↗</span>
            </>;

            return hrefForCategory ? (
              <Link
                key={category.id}
                className="category-card"
                href={hrefForCategory(category.id)}
              >
                {content}
              </Link>
            ) : (
              <button
                key={category.id}
                className="category-card"
                type="button"
                aria-pressed={selectedCategory === category.id}
                onClick={() => onSelectCategory?.(category.id)}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
