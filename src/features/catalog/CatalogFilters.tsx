import type {
  CatalogFilters as CatalogFilterState,
  FlowerType,
  ProductColor,
} from "../../shared/types";
import { formatSum } from "../../shared/format";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";

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

const KNOWN_FLOWER_TYPES = new Set(FLOWER_TYPES);

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

const KNOWN_PRODUCT_COLORS = new Set(PRODUCT_COLORS);

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
  const locale = useLocale() as Locale;
  const t = useTranslations("Catalog");
  const flowerTypeLabel = (flowerType: FlowerType) =>
    KNOWN_FLOWER_TYPES.has(flowerType)
      ? t(`flowerTypes.${flowerType}` as "flowerTypes.rose")
      : flowerType;
  const colorLabel = (color: ProductColor) =>
    KNOWN_PRODUCT_COLORS.has(color)
      ? t(`colors.${color}` as "colors.red")
      : color;

  return (
    <aside className="catalog-filters" aria-labelledby="catalog-filters-title">
      <div className="catalog-filters__heading">
        <div>
          <p className="eyebrow">{t("kicker")}</p>
          <h3 id="catalog-filters-title">{t("filtersTitle")}</h3>
        </div>
      </div>

      <label className="filter-search">
        <span>{t("searchLabel")}</span>
        <span className="filter-search__field">
          <input
            type="search"
            value={filters.query}
            placeholder={t("searchPlaceholder")}
            onChange={(event) =>
              onChange({ ...filters, query: event.currentTarget.value })
            }
          />
          <span aria-hidden="true">⌕</span>
        </span>
      </label>

      <fieldset className="filter-group filter-price">
        <legend>{t("priceRange")}</legend>
        <label>
          <span>{t("minimumPrice")}</span>
          <span className="filter-price__value">{formatSum(filters.minPrice, locale)}</span>
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
          <span>{t("maximumPrice")}</span>
          <span className="filter-price__value">{formatSum(filters.maxPrice, locale)}</span>
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
        <legend>{t("flowerType")}</legend>
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
              <span>{flowerTypeLabel(flowerType)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>{t("color")}</legend>
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
              <span>{colorLabel(color)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="catalog-filters__actions">
        <button className="primary-button" type="button" onClick={onApply}>
          {t("applyFilters")}
        </button>
        <button className="filter-reset-button" type="button" onClick={onReset}>
          {t("resetFilters")}
        </button>
      </div>
    </aside>
  );
}
