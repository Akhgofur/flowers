import type {
  CatalogFilters as CatalogFilterState,
  FlowerType,
  ProductColor,
} from "../../shared/types";
import { formatSum } from "../../shared/format";

export type CatalogFiltersProps = {
  filters: CatalogFilterState;
  onChange: (nextFilters: CatalogFilterState) => void;
  onApply: () => void;
  onReset: () => void;
};

const FLOWER_TYPES: readonly FlowerType[] = [
  "rose",
  "tulip",
  "peony",
  "orchid",
  "seasonal",
  "mixed",
];

const FLOWER_TYPE_LABELS: Record<FlowerType, string> = {
  rose: "Atirgul",
  tulip: "Lola",
  peony: "Pion",
  orchid: "Orkide",
  seasonal: "Mavsumiy gullar",
  mixed: "Aralash gullar",
};

const PRODUCT_COLORS: readonly ProductColor[] = [
  "red",
  "pink",
  "white",
  "yellow",
  "purple",
  "blue",
  "green",
  "peach",
];

const PRODUCT_COLOR_LABELS: Record<ProductColor, string> = {
  red: "Qizil",
  pink: "Pushti",
  white: "Oq",
  yellow: "Sariq",
  purple: "Binafsha",
  blue: "Moviy",
  green: "Yashil",
  peach: "Shaftolirang",
};

function toggleItem<T extends string>(items: readonly T[], item: T): T[] {
  return items.includes(item)
    ? items.filter((currentItem) => currentItem !== item)
    : [...items, item];
}

export function CatalogFilters({
  filters,
  onChange,
  onApply,
  onReset,
}: CatalogFiltersProps) {
  return (
    <aside className="catalog-filters" aria-labelledby="catalog-filters-title">
      <div className="catalog-filters__heading">
        <div>
          <p className="eyebrow">Aniq tanlov</p>
          <h3 id="catalog-filters-title">Filtrlar</h3>
        </div>
      </div>

      <label className="filter-search">
        <span>Mahsulot qidirish</span>
        <span className="filter-search__field">
          <input
            type="search"
            value={filters.query}
            placeholder="Masalan, pion"
            onChange={(event) =>
              onChange({ ...filters, query: event.currentTarget.value })
            }
          />
          <span aria-hidden="true">⌕</span>
        </span>
      </label>

      <fieldset className="filter-group filter-price">
        <legend>Narx oralig'i</legend>
        <label>
          <span>Eng past narx</span>
          <span className="filter-price__value">{formatSum(filters.minPrice)}</span>
          <input
            type="range"
            min={20000}
            max={1000000}
            step={5000}
            value={filters.minPrice}
            onChange={(event) =>
              onChange({ ...filters, minPrice: Number(event.currentTarget.value) })
            }
          />
        </label>
        <label>
          <span>Eng yuqori narx</span>
          <span className="filter-price__value">{formatSum(filters.maxPrice)}</span>
          <input
            type="range"
            min={20000}
            max={1000000}
            step={5000}
            value={filters.maxPrice}
            onChange={(event) =>
              onChange({ ...filters, maxPrice: Number(event.currentTarget.value) })
            }
          />
        </label>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Gul turi</legend>
        <div className="filter-check-list">
          {FLOWER_TYPES.map((flowerType) => (
            <label key={flowerType}>
              <input
                type="checkbox"
                checked={filters.flowerTypes.includes(flowerType)}
                onChange={() =>
                  onChange({
                    ...filters,
                    flowerTypes: toggleItem(filters.flowerTypes, flowerType),
                  })
                }
              />
              <span>{FLOWER_TYPE_LABELS[flowerType]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Rang</legend>
        <div className="filter-color-list">
          {PRODUCT_COLORS.map((color) => (
            <label key={color}>
              <input
                type="checkbox"
                checked={filters.colors.includes(color)}
                onChange={() =>
                  onChange({
                    ...filters,
                    colors: toggleItem(filters.colors, color),
                  })
                }
              />
              <span className={`color-swatch color-swatch--${color}`} aria-hidden="true" />
              <span>{PRODUCT_COLOR_LABELS[color]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="catalog-filters__actions">
        <button className="primary-button" type="button" onClick={onApply}>
          Filtrni qo'llash
        </button>
        <button className="filter-reset-button" type="button" onClick={onReset}>
          Tozalash
        </button>
      </div>
    </aside>
  );
}
