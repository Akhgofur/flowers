import type { Product } from "../../shared/types";
import { useTranslations } from "next-intl";

export type FavoriteButtonProps = {
  product: Product;
  isFavorite: boolean;
  onToggle: (productId: string) => void;
};

export function FavoriteButton({
  product,
  isFavorite,
  onToggle,
}: FavoriteButtonProps) {
  const t = useTranslations("Product");

  return (
    <button
      className="favorite-button"
      type="button"
      aria-label={`${product.name} — ${isFavorite ? t("removeFavorite") : t("favorite")}`}
      aria-pressed={isFavorite}
      onClick={() => onToggle(product.id)}
    >
      <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
    </button>
  );
}
