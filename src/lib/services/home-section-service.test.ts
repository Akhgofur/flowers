import { describe, expect, it, vi } from "vitest";
import type { AdminHomeSection } from "@/lib/contracts";
import {
  createHomeSectionService,
  type HomeSectionStore,
} from "./home-section-service";

const activeSection: AdminHomeSection = {
  id: "507f1f77bcf86cd799439021",
  translations: {
    ru: { title: "Топ цветов", description: "Выбор флориста" },
    uz: { title: "Top gullar", description: "Florist tanlovi" },
    en: { title: "Top flowers", description: "Florist selection" },
  },
  productIds: [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
  ],
  sortOrder: 2,
  status: "published",
  startsAt: "2026-08-01T00:00:00.000Z",
  endsAt: "2026-09-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z",
};

function createStore(): HomeSectionStore {
  return {
    listAll: vi.fn().mockResolvedValue([activeSection]),
    listPublished: vi.fn().mockResolvedValue([
      activeSection,
      { ...activeSection, id: "draft", status: "draft" },
      {
        ...activeSection,
        id: "expired",
        startsAt: "2026-06-01T00:00:00.000Z",
        endsAt: "2026-07-01T00:00:00.000Z",
      },
      { ...activeSection, id: "first", sortOrder: 1, startsAt: undefined, endsAt: undefined },
    ]),
    countExistingProducts: vi.fn().mockResolvedValue(2),
    create: vi.fn().mockResolvedValue(activeSection),
    update: vi.fn().mockResolvedValue(activeSection),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe("home-section service", () => {
  it("returns only active published sections in admin order and requested locale", async () => {
    const service = createHomeSectionService({ store: createStore() });

    await expect(
      service.listPublic("uz", new Date("2026-08-11T10:00:00.000Z"))
    ).resolves.toEqual([
      {
        id: "first",
        title: "Top gullar",
        description: "Florist tanlovi",
        productIds: activeSection.productIds,
        sortOrder: 1,
      },
      {
        id: activeSection.id,
        title: "Top gullar",
        description: "Florist tanlovi",
        productIds: activeSection.productIds,
        sortOrder: 2,
      },
    ]);
  });

  it("creates a section only when every selected product exists and invalidates public data", async () => {
    const store = createStore();
    const invalidate = vi.fn();
    const service = createHomeSectionService({ store, invalidate });
    const input = {
      translations: activeSection.translations,
      productIds: activeSection.productIds,
      sortOrder: activeSection.sortOrder,
      status: activeSection.status,
      startsAt: activeSection.startsAt,
      endsAt: activeSection.endsAt,
    } as const;

    await expect(service.create(input)).resolves.toEqual(activeSection);
    expect(invalidate).toHaveBeenCalledTimes(1);

    vi.mocked(store.countExistingProducts).mockResolvedValueOnce(1);
    await expect(service.create(input)).rejects.toMatchObject({ status: 404 });
  });
});
