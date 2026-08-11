import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import type {
  AdminHomeSection,
  PublicHomeSection,
} from "@/lib/contracts";
import type { Locale } from "@/i18n/config";
import { LOCALES } from "@/i18n/config";
import { AdminNotFoundError } from "@/lib/admin-api";
import {
  cacheHomeSectionsReader,
  HOME_SECTIONS_CACHE_TAG,
} from "@/lib/cache";
import {
  countExistingHomeSectionProducts,
  createHomeSection,
  deleteHomeSection,
  findAllHomeSections,
  findPublishedHomeSections,
  updateHomeSection,
} from "@/lib/repositories/home-section-repository";
import type {
  HomeSectionInput,
  HomeSectionPatchInput,
} from "@/lib/validations";

export type HomeSectionStore = {
  listAll(): Promise<AdminHomeSection[]>;
  listPublished(): Promise<AdminHomeSection[]>;
  countExistingProducts(productIds: readonly string[]): Promise<number>;
  create(input: HomeSectionInput): Promise<AdminHomeSection>;
  update(id: string, patch: HomeSectionPatchInput): Promise<AdminHomeSection>;
  remove(id: string): Promise<void>;
};

type HomeSectionServiceDependencies = {
  store: HomeSectionStore;
  invalidate?: () => void;
};

function invalidatePublicHomeSections(): void {
  if (process.env.NODE_ENV === "test") return;
  revalidateTag(HOME_SECTIONS_CACHE_TAG, "max");
  for (const locale of LOCALES) revalidatePath(`/${locale}`);
}

function isActive(section: AdminHomeSection, now: Date): boolean {
  if (section.status !== "published") return false;
  const timestamp = now.getTime();
  if (section.startsAt && new Date(section.startsAt).getTime() > timestamp) return false;
  if (section.endsAt && new Date(section.endsAt).getTime() <= timestamp) return false;
  return true;
}

function toPublicHomeSection(
  section: AdminHomeSection,
  locale: Locale
): PublicHomeSection {
  const translation = section.translations[locale] ?? section.translations.ru;
  return {
    id: section.id,
    title: translation.title,
    ...(translation.description === undefined
      ? {}
      : { description: translation.description }),
    productIds: [...section.productIds],
    sortOrder: section.sortOrder,
  };
}

export function createHomeSectionService({
  store,
  invalidate = invalidatePublicHomeSections,
}: HomeSectionServiceDependencies) {
  async function assertProductsExist(productIds: readonly string[]): Promise<void> {
    const existingCount = await store.countExistingProducts(productIds);
    if (existingCount !== productIds.length) {
      throw new AdminNotFoundError("Tanlangan mahsulotlardan biri topilmadi.");
    }
  }

  return {
    listAdmin: () => store.listAll(),

    async listPublic(locale: Locale, now: Date): Promise<PublicHomeSection[]> {
      const sections = await store.listPublished();
      return sections
        .filter((section) => isActive(section, now))
        .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
        .map((section) => toPublicHomeSection(section, locale));
    },

    async create(input: HomeSectionInput): Promise<AdminHomeSection> {
      await assertProductsExist(input.productIds);
      const section = await store.create(input);
      invalidate();
      return section;
    },

    async update(
      id: string,
      patch: HomeSectionPatchInput
    ): Promise<AdminHomeSection> {
      if (patch.productIds !== undefined) await assertProductsExist(patch.productIds);
      const section = await store.update(id, patch);
      invalidate();
      return section;
    },

    async remove(id: string): Promise<void> {
      await store.remove(id);
      invalidate();
    },
  };
}

const homeSectionService = createHomeSectionService({
  store: {
    listAll: findAllHomeSections,
    listPublished: findPublishedHomeSections,
    countExistingProducts: countExistingHomeSectionProducts,
    create: createHomeSection,
    update: updateHomeSection,
    remove: deleteHomeSection,
  },
});

const readPublicHomeSections = cacheHomeSectionsReader(async (locale: Locale) =>
  homeSectionService.listPublic(locale, new Date())
);

export const getAdminHomeSections = () => homeSectionService.listAdmin();
export const createAdminHomeSection = (input: HomeSectionInput) =>
  homeSectionService.create(input);
export const updateAdminHomeSection = (id: string, patch: HomeSectionPatchInput) =>
  homeSectionService.update(id, patch);
export const removeAdminHomeSection = (id: string) => homeSectionService.remove(id);
export const getPublicHomeSections = (locale: Locale) => readPublicHomeSections(locale);
