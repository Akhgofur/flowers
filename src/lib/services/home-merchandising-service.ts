import "server-only";
import type {
  CatalogProduct,
  PublicHomeSection,
} from "@/lib/contracts";
import type { Locale } from "@/i18n/config";
import { cacheHomeMerchandisingReader } from "@/lib/cache";
import { getProductAvailability } from "@/lib/product-availability";
import {
  findBestSellerProductIds,
  findPublishedProductsByIds,
  findRecommendationCandidates,
  type RecommendationCandidate,
} from "@/lib/repositories/catalog-repository";
import { getPublicHomeSections } from "@/lib/services/home-section-service";

export type DynamicHomeSection = PublicHomeSection & {
  products: CatalogProduct[];
};

export type HomePageCatalogData = {
  dynamicSections: DynamicHomeSection[];
  bestSellers: CatalogProduct[];
  recommended: CatalogProduct[];
};

export type HomeMerchandisingStore = {
  listSections(locale: Locale): Promise<PublicHomeSection[]>;
  listBestSellerProductIds(): Promise<string[]>;
  findProductsByIds(
    locale: Locale,
    productIds: readonly string[]
  ): Promise<CatalogProduct[]>;
  listRecommendationCandidates(locale: Locale): Promise<RecommendationCandidate[]>;
};

type HomeMerchandisingDependencies = {
  store: HomeMerchandisingStore;
};

function isAvailable(product: CatalogProduct, now: Date): boolean {
  return getProductAvailability(product, now).available;
}

function orderByIds(
  productIds: readonly string[],
  productsById: ReadonlyMap<string, CatalogProduct>
): CatalogProduct[] {
  return productIds.flatMap((id) => {
    const product = productsById.get(id);
    return product ? [product] : [];
  });
}

function compareFeatured(
  left: RecommendationCandidate,
  right: RecommendationCandidate
): number {
  return (
    left.product.sortOrder - right.product.sortOrder ||
    right.updatedAt.localeCompare(left.updatedAt) ||
    left.product.id.localeCompare(right.product.id)
  );
}

function compareNewest(
  left: RecommendationCandidate,
  right: RecommendationCandidate
): number {
  return (
    right.updatedAt.localeCompare(left.updatedAt) ||
    left.product.id.localeCompare(right.product.id)
  );
}

export function createHomeMerchandisingService({
  store,
}: HomeMerchandisingDependencies) {
  return {
    async getHomePageCatalogData(
      locale: Locale,
      now: Date
    ): Promise<HomePageCatalogData> {
      const [sections, bestSellerIds, recommendationCandidates] = await Promise.all([
        store.listSections(locale),
        store.listBestSellerProductIds(),
        store.listRecommendationCandidates(locale),
      ]);

      const linkedIds = [
        ...new Set([
          ...sections.flatMap((section) => section.productIds),
          ...bestSellerIds,
        ]),
      ];
      const linkedProducts = await store.findProductsByIds(locale, linkedIds);
      const productsById = new Map(linkedProducts.map((product) => [product.id, product]));

      const dynamicSections = sections.flatMap((section) => {
        const products = orderByIds(section.productIds, productsById);
        return products.length > 0 ? [{ ...section, products }] : [];
      });

      const bestSellers = orderByIds(bestSellerIds, productsById)
        .filter((product) => isAvailable(product, now))
        .slice(0, 12);

      const availableCandidates = recommendationCandidates.filter(({ product }) =>
        isAvailable(product, now)
      );
      const featured = availableCandidates
        .filter(({ product }) => product.isFeatured)
        .sort(compareFeatured);
      const recommendedCandidates = featured.slice(0, 12);

      if (recommendedCandidates.length < 4) {
        const selectedIds = new Set(
          recommendedCandidates.map(({ product }) => product.id)
        );
        const newest = availableCandidates
          .filter(({ product }) => !selectedIds.has(product.id))
          .sort(compareNewest);
        recommendedCandidates.push(
          ...newest.slice(0, 4 - recommendedCandidates.length)
        );
      }

      return {
        dynamicSections,
        bestSellers,
        recommended: recommendedCandidates.map(({ product }) => product),
      };
    },
  };
}

const homeMerchandisingService = createHomeMerchandisingService({
  store: {
    listSections: getPublicHomeSections,
    listBestSellerProductIds: findBestSellerProductIds,
    findProductsByIds: findPublishedProductsByIds,
    listRecommendationCandidates: findRecommendationCandidates,
  },
});

const readHomePageCatalogData = cacheHomeMerchandisingReader(async (locale: Locale) =>
  homeMerchandisingService.getHomePageCatalogData(locale, new Date())
);

export const getHomePageCatalogData = (locale: Locale) =>
  readHomePageCatalogData(locale);
