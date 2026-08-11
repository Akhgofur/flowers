import type { Category, CategoryId } from "../../shared/types";
import { applyImageFallback } from "../../shared/image-fallback";

export type CategoryStripProps = {
  categories: readonly Category[];
  selectedCategory: CategoryId | null;
  onSelectCategory: (categoryId: CategoryId) => void;
};

export function CategoryStrip({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryStripProps) {
  return (
    <section id="categories" className="categories section" tabIndex={-1}>
      <div className="shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Kayfiyatga mos tanlov</p>
            <h2>Gulingizni toping</h2>
          </div>
          <p>Har bir kompozitsiya floristlarimiz tomonidan buyurtma kuni yaratiladi.</p>
        </div>

        <div className="category-grid">
          {categories.map((category) => (
            <button
              key={category.id}
              className="category-card"
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => onSelectCategory(category.id)}
            >
              <span className="category-card__image">
                <img src={category.image} alt="" onError={applyImageFallback} />
              </span>
              <span className="category-card__copy">
                <strong>{category.title}</strong>
                <small>{category.productCountLabel}</small>
              </span>
              <span className="category-card__arrow" aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
