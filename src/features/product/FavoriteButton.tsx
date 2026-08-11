import type { Product } from "../../shared/types";

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
  const action = isFavorite
    ? "sevimlilardan olib tashlash"
    : "sevimlilarga qo'shish";

  return (
    <button
      className="favorite-button"
      type="button"
      aria-label={`${product.name} ni ${action}`}
      aria-pressed={isFavorite}
      onClick={() => onToggle(product.id)}
    >
      <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
    </button>
  );
}
