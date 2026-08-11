import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BEST_SELLERS_CACHE_TAG,
  CATALOG_CACHE_TAGS,
  RECOMMENDATIONS_CACHE_TAG,
} from "@/lib/cache";

const nextCache = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
const repository = vi.hoisted(() => ({
  archiveAdminProduct: vi.fn(),
  createAdminCategory: vi.fn(),
  createAdminProduct: vi.fn(),
  findAdminCategories: vi.fn(),
  findAdminOrders: vi.fn(),
  findAdminProducts: vi.fn(),
  findAdminSettings: vi.fn(),
  hideAdminCategory: vi.fn(),
  patchAdminProduct: vi.fn(),
  updateAdminCategory: vi.fn(),
  updateAdminProduct: vi.fn(),
  updateAdminSettings: vi.fn(),
}));
const order = vi.hoisted(() => ({
  transitionOrderStatus: vi.fn(),
}));

vi.mock("next/cache", () => nextCache);
vi.mock("@/lib/repositories/admin-repository", () => repository);
vi.mock("@/lib/services/order-service", () => ({ orderService: order }));

import {
  patchAdminProductFields,
  transitionAdminOrder,
} from "./admin-service";

describe("admin cache invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.patchAdminProduct.mockResolvedValue({ id: "product" });
  });

  it("invalidates catalog, best sellers, and recommendations after a product mutation", async () => {
    await patchAdminProductFields("507f1f77bcf86cd799439011", { price: null });

    expect(nextCache.revalidateTag.mock.calls).toEqual([
      [CATALOG_CACHE_TAGS.all, "max"],
      [CATALOG_CACHE_TAGS.products, "max"],
      [CATALOG_CACHE_TAGS.categories, "max"],
      [BEST_SELLERS_CACHE_TAG, "max"],
      [RECOMMENDATIONS_CACHE_TAG, "max"],
    ]);
  });

  it("invalidates best sellers only when an order reaches delivered", async () => {
    order.transitionOrderStatus.mockResolvedValue({ status: "confirmed" });
    await transitionAdminOrder("507f1f77bcf86cd799439021", "confirmed");
    expect(nextCache.revalidateTag).not.toHaveBeenCalledWith(
      BEST_SELLERS_CACHE_TAG,
      "max"
    );

    order.transitionOrderStatus.mockResolvedValue({ status: "delivered" });
    await transitionAdminOrder("507f1f77bcf86cd799439021", "delivered");
    expect(nextCache.revalidateTag).toHaveBeenCalledWith(
      BEST_SELLERS_CACHE_TAG,
      "max"
    );
  });
});
