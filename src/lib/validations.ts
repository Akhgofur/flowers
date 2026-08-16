import { z } from "zod";
import {
  CATEGORY_STATUSES,
  FULFILMENT_METHODS,
  HOME_SECTION_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PRODUCT_STATUSES,
  SEASONS,
} from "@/lib/contracts";
import { LOCALES } from "@/i18n/config";

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "ObjectId must be a 24-character hexadecimal value");

const textSchema = z.string().trim().min(2).max(500);
const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase and URL-safe");
const moneySchema = z.number().int().positive();
const optionalMoneySchema = moneySchema.optional();
const nonNegativeIntegerSchema = z.number().int().min(0);
const seasonsSchema = z
  .array(z.enum(SEASONS))
  .min(1)
  .max(SEASONS.length)
  .superRefine((seasons, context) => {
    if (new Set(seasons).size !== seasons.length) {
      context.addIssue({
        code: "custom",
        message: "Product seasons must be unique.",
      });
    }
    if (seasons.includes("all_year") && seasons.length > 1) {
      context.addIssue({
        code: "custom",
        message: "all_year cannot be combined with another season.",
      });
    }
  });

export const productTranslationInputSchema = z
  .object({
    name: textSchema.max(140),
    shortDescription: textSchema.max(280),
    description: textSchema.max(4_000),
    composition: z.array(textSchema.max(140)).min(1).max(20),
    deliveryEstimate: z.string().trim().min(2).max(160).optional(),
    size: z.string().trim().min(2).max(80).optional(),
    seoTitle: z.string().trim().min(2).max(70).optional(),
    seoDescription: z.string().trim().min(2).max(160).optional(),
  })
  .strict();

export const categoryTranslationInputSchema = z
  .object({
    name: textSchema.max(100),
    description: z.string().trim().min(2).max(800).optional(),
    seoTitle: z.string().trim().min(2).max(70).optional(),
    seoDescription: z.string().trim().min(2).max(160).optional(),
  })
  .strict();

const localizedProductInputSchema = z
  .object({
    ru: productTranslationInputSchema,
    uz: productTranslationInputSchema,
    en: productTranslationInputSchema,
  })
  .strict();

const localizedCategoryInputSchema = z
  .object({
    ru: categoryTranslationInputSchema,
    uz: categoryTranslationInputSchema,
    en: categoryTranslationInputSchema,
  })
  .strict();

export const siteSettingsTranslationInputSchema = z
  .object({
    siteDescription: textSchema.max(300),
    deliveryPolicy: z.string().trim().min(2).max(2_000).optional(),
    seoTitle: z.string().trim().min(2).max(70).optional(),
    seoDescription: z.string().trim().min(2).max(160).optional(),
  })
  .strict();

const localizedSiteSettingsInputSchema = z
  .object({
    ru: siteSettingsTranslationInputSchema,
    uz: siteSettingsTranslationInputSchema,
    en: siteSettingsTranslationInputSchema,
  })
  .strict();

const homeSectionTranslationInputSchema = z
  .object({
    title: textSchema.max(120),
    description: z.string().trim().min(2).max(500).optional(),
  })
  .strict();

const localizedHomeSectionInputSchema = z
  .object({
    ru: homeSectionTranslationInputSchema,
    uz: homeSectionTranslationInputSchema,
    en: homeSectionTranslationInputSchema,
  })
  .strict();

const isoDateTimeSchema = z.string().datetime({ offset: true });
const homeSectionProductIdsSchema = z
  .array(objectIdSchema)
  .min(1)
  .max(24)
  .superRefine((productIds, context) => {
    if (new Set(productIds).size !== productIds.length) {
      context.addIssue({
        code: "custom",
        message: "Home section product IDs must be unique.",
      });
    }
  });

function validateHomeSectionSchedule(
  value: { startsAt?: string | null; endsAt?: string | null },
  context: z.RefinementCtx
): void {
  if (
    value.startsAt &&
    value.endsAt &&
    new Date(value.startsAt).getTime() >= new Date(value.endsAt).getTime()
  ) {
    context.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "Home section end must be after its start.",
    });
  }
}

export const homeSectionInputSchema = z
  .object({
    translations: localizedHomeSectionInputSchema,
    productIds: homeSectionProductIdsSchema,
    sortOrder: nonNegativeIntegerSchema.default(0),
    status: z.enum(HOME_SECTION_STATUSES).default("draft"),
    startsAt: isoDateTimeSchema.optional(),
    endsAt: isoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine(validateHomeSectionSchedule);

export const homeSectionPatchInputSchema = z
  .object({
    translations: localizedHomeSectionInputSchema.optional(),
    productIds: homeSectionProductIdsSchema.optional(),
    sortOrder: nonNegativeIntegerSchema.optional(),
    status: z.enum(HOME_SECTION_STATUSES).optional(),
    startsAt: isoDateTimeSchema.nullable().optional(),
    endsAt: isoDateTimeSchema.nullable().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "At least one home section field is required.",
  })
  .superRefine(validateHomeSectionSchedule);

export const productImageSchema = z
  .object({
    url: z.string().trim().url().startsWith("https://"),
    alt: z.string().trim().min(2).max(180),
    publicId: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export const productInputSchema = z
  .object({
    slug: slugSchema,
    translations: localizedProductInputSchema,
    categoryId: objectIdSchema,
    price: optionalMoneySchema,
    originalPrice: optionalMoneySchema,
    currency: z.literal("UZS").default("UZS"),
    images: z.array(productImageSchema).min(1).max(8),
    flowerTypes: z.array(z.string().trim().min(1).max(48)).min(1).max(12),
    colors: z.array(z.string().trim().min(1).max(48)).min(1).max(12),
    seasons: seasonsSchema.default(["all_year"]),
    sortOrder: nonNegativeIntegerSchema.default(0),
    isFeatured: z.boolean().default(false),
    isNew: z.boolean().default(false),
    isOnSale: z.boolean().default(false),
    status: z.enum(PRODUCT_STATUSES).default("draft"),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.price === undefined && (input.originalPrice !== undefined || input.isOnSale)) {
      context.addIssue({
        code: "custom",
        path: ["price"],
        message: "Inquiry-only products cannot have sale pricing.",
      });
    }

    if (
      input.price !== undefined &&
      input.originalPrice !== undefined &&
      input.originalPrice <= input.price
    ) {
      context.addIssue({
        code: "custom",
        path: ["originalPrice"],
        message: "Original price must be greater than the current price.",
      });
    }

    if (input.isOnSale && input.originalPrice === undefined) {
      context.addIssue({
        code: "custom",
        path: ["originalPrice"],
        message: "Sale products require an original price.",
      });
    }
  });

export const productPatchInputSchema = z
  .object({
    translations: z
      .object({
        ru: z.object({ name: textSchema.max(140) }).strict(),
      })
      .strict()
      .optional(),
    categoryId: objectIdSchema.optional(),
    price: z.number().int().positive().nullable().optional(),
    seasons: seasonsSchema.optional(),
    sortOrder: nonNegativeIntegerSchema.optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
    isFeatured: z.boolean().optional(),
    isNew: z.boolean().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "At least one product field is required.",
  });

export const categoryInputSchema = z
  .object({
    slug: slugSchema,
    translations: localizedCategoryInputSchema,
    image: productImageSchema.optional(),
    order: nonNegativeIntegerSchema.default(0),
    status: z.enum(CATEGORY_STATUSES).default("published"),
  })
  .strict();

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+998|998)?\d{9}$/, "Phone must be a valid Uzbekistan phone number");

/** Earth's own bounds. Anything outside them is a bug in the caller, not a delivery. */
const geoPointSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict();

export const checkoutSchema = z
  .object({
    locale: z.enum(LOCALES),
    fulfilment: z.enum(FULFILMENT_METHODS),
    customer: z
      .object({
        fullName: z.string().trim().min(3).max(120),
        phone: phoneSchema,
        address: z.string().trim().min(8).max(500).optional(),
        location: geoPointSchema.optional(),
        deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        comment: z.string().trim().max(500).optional(),
      })
      .strict(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    items: z
      .array(
        z
          .object({
            productId: objectIdSchema,
            quantity: z.number().int().min(1).max(99),
          })
          .strict()
      )
      .min(1)
      .max(20),
  })
  .strict()
  .superRefine((input, context) => {
    const productIds = new Set<string>();

    input.items.forEach((item, index) => {
      if (productIds.has(item.productId)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "productId"],
          message: "A product can appear only once in an order.",
        });
      }
      productIds.add(item.productId);
    });

    if (input.fulfilment === "delivery" && !input.customer.address) {
      context.addIssue({
        code: "custom",
        path: ["customer", "address"],
        message: "A delivery needs an address.",
      });
    }

    // Rejected rather than quietly dropped: a client that sends these is broken,
    // and silently cleaning the body would write a half-truth instead.
    if (input.fulfilment === "pickup") {
      if (input.customer.address !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["customer", "address"],
          message: "A collected order must not carry an address.",
        });
      }
      if (input.customer.location !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["customer", "location"],
          message: "A collected order must not carry a map point.",
        });
      }
    }
  });

export const orderStatusSchema = z.enum(ORDER_STATUSES);

const optionalUrlSchema = z.string().trim().url().startsWith("https://").optional();

export const siteSettingsInputSchema = z
  .object({
    siteName: textSchema.max(100),
    brandLogo: productImageSchema.optional(),
    brandMark: productImageSchema.optional(),
    translations: localizedSiteSettingsInputSchema,
    phone: z.string().trim().min(7).max(32).optional(),
    email: z.string().trim().email().max(254).optional(),
    address: z.string().trim().min(4).max(500).optional(),
    workingHours: z.string().trim().min(2).max(160).optional(),
    deliveryFee: nonNegativeIntegerSchema,
    instagramUrl: optionalUrlSchema,
    telegramUrl: optionalUrlSchema,
    seoOgImage: productImageSchema.optional(),
  })
  .strict();

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductPatchInput = z.infer<typeof productPatchInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;
export type HomeSectionInput = z.infer<typeof homeSectionInputSchema>;
export type HomeSectionPatchInput = z.infer<typeof homeSectionPatchInputSchema>;
