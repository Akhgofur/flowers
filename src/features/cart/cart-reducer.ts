import type { CartLine } from "../../shared/types";

const MAX_CART_QUANTITY = 99;

const cloneLines = (lines: readonly CartLine[]): CartLine[] =>
  lines.map(({ productId, quantity }) => ({ productId, quantity }));

const isPositiveInteger = (quantity: number): boolean =>
  Number.isInteger(quantity) && quantity > 0;

export function addToCart(
  lines: readonly CartLine[],
  productId: string,
  quantity = 1,
): CartLine[] {
  if (!isPositiveInteger(quantity)) {
    return cloneLines(lines);
  }

  let matched = false;
  const nextLines = lines.map((line) => {
    if (line.productId !== productId) {
      return { ...line };
    }

    matched = true;
    return {
      productId: line.productId,
      quantity: Math.min(MAX_CART_QUANTITY, line.quantity + quantity),
    };
  });

  return matched
    ? nextLines
    : [...nextLines, { productId, quantity: Math.min(MAX_CART_QUANTITY, quantity) }];
}

export function setCartQuantity(
  lines: readonly CartLine[],
  productId: string,
  quantity: number,
): CartLine[] {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_CART_QUANTITY) {
    return cloneLines(lines);
  }

  if (quantity === 0) {
    return removeFromCart(lines, productId);
  }

  let matched = false;
  const nextLines = lines.map((line) => {
    if (line.productId !== productId) {
      return { ...line };
    }

    matched = true;
    return { productId: line.productId, quantity };
  });

  return matched ? nextLines : [...nextLines, { productId, quantity }];
}

export function removeFromCart(lines: readonly CartLine[], productId: string): CartLine[] {
  let removed = false;

  return lines.flatMap((line) => {
    if (!removed && line.productId === productId) {
      removed = true;
      return [];
    }

    return [{ productId: line.productId, quantity: line.quantity }];
  });
}
