import { z } from "zod";
import {
  CATEGORY_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PRODUCT_STATUSES,
} from "@/lib/contracts";

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
const nonNegativeIntegerSchema = z.number().int().min(0);

export const productImageSchema = z
  .object({
    url: z.string().trim().url().startsWith("https://"),
    alt: z.string().trim().min(2).max(180),
    publicId: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export const productInputSchema = z
  .object({
    name: textSchema.max(140),
    slug: slugSchema,
    shortDescription: textSchema.max(280),
    description: textSchema.max(4_000),
    composition: z.array(textSchema.max(140)).min(1).max(20),
    categoryId: objectIdSchema,
    price: moneySchema,
    originalPrice: moneySchema.optional(),
    currency: z.literal("UZS").default("UZS"),
    images: z.array(productImageSchema).min(1).max(8),
    flowerTypes: z.array(z.string().trim().min(1).max(48)).min(1).max(12),
    colors: z.array(z.string().trim().min(1).max(48)).min(1).max(12),
    stockQuantity: nonNegativeIntegerSchema.default(0),
    sortOrder: nonNegativeIntegerSchema.default(0),
    isFeatured: z.boolean().default(false),
    isNew: z.boolean().default(false),
    isOnSale: z.boolean().default(false),
    status: z.enum(PRODUCT_STATUSES).default("draft"),
    deliveryEstimate: z.string().trim().min(2).max(160).optional(),
    size: z.string().trim().min(2).max(80).optional(),
    seoTitle: z.string().trim().min(2).max(70).optional(),
    seoDescription: z.string().trim().min(2).max(160).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.originalPrice !== undefined && input.originalPrice <= input.price) {
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

export const categoryInputSchema = z
  .object({
    name: textSchema.max(100),
    slug: slugSchema,
    description: z.string().trim().min(2).max(800).optional(),
    image: productImageSchema.optional(),
    order: nonNegativeIntegerSchema.default(0),
    status: z.enum(CATEGORY_STATUSES).default("published"),
  })
  .strict();

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+998|998)?\d{9}$/, "Phone must be a valid Uzbekistan phone number");

export const checkoutSchema = z
  .object({
    customer: z
      .object({
        fullName: z.string().trim().min(3).max(120),
        phone: phoneSchema,
        address: z.string().trim().min(8).max(500),
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
  });

export const orderStatusSchema = z.enum(ORDER_STATUSES);

const optionalUrlSchema = z.string().trim().url().startsWith("https://").optional();

export const siteSettingsInputSchema = z
  .object({
    siteName: textSchema.max(100),
    siteDescription: textSchema.max(300),
    phone: z.string().trim().min(7).max(32).optional(),
    email: z.string().trim().email().max(254).optional(),
    address: z.string().trim().min(4).max(500).optional(),
    workingHours: z.string().trim().min(2).max(160).optional(),
    deliveryFee: nonNegativeIntegerSchema,
    deliveryPolicy: z.string().trim().min(2).max(2_000).optional(),
    instagramUrl: optionalUrlSchema,
    telegramUrl: optionalUrlSchema,
    seoTitle: z.string().trim().min(2).max(70).optional(),
    seoDescription: z.string().trim().min(2).max(160).optional(),
    seoOgImage: productImageSchema.optional(),
  })
  .strict();

export type ProductInput = z.infer<typeof productInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;
