import mongoose, { type Model, type Types } from "mongoose";
import type {
  Localized,
  ProductImage,
  Season,
  ProductStatus,
  ProductTranslation,
} from "@/lib/contracts";

const { model, models, Schema } = mongoose;

export type ProductDocument = {
  slug: string;
  translations: Localized<ProductTranslation>;
  categoryId: Types.ObjectId;
  price?: number;
  originalPrice?: number;
  currency: "UZS";
  images: ProductImage[];
  flowerTypes: string[];
  colors: string[];
  seasons: Season[];
  sortOrder: number;
  isFeatured: boolean;
  /** Stored under a non-reserved name; public contracts expose this as `isNew`. */
  isNewArrival: boolean;
  isOnSale: boolean;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
};

const productImageSchema = new Schema<ProductImage>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      match: /^https:\/\//,
    },
    alt: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 180,
    },
    publicId: {
      type: String,
      trim: true,
      maxlength: 255,
    },
  },
  { _id: false }
);

const integerValidator = (value: number) => Number.isInteger(value);

const productTranslationSchema = new Schema<ProductTranslation>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 140 },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 280,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 4_000,
    },
    composition: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length > 0 && value.length <= 20,
        message: "A product translation must have between 1 and 20 composition entries.",
      },
    },
    deliveryEstimate: { type: String, trim: true, minlength: 2, maxlength: 160 },
    size: { type: String, trim: true, minlength: 2, maxlength: 80 },
    seoTitle: { type: String, trim: true, minlength: 2, maxlength: 70 },
    seoDescription: { type: String, trim: true, minlength: 2, maxlength: 160 },
  },
  { _id: false }
);

const localizedProductSchema = new Schema<Localized<ProductTranslation>>(
  {
    ru: { type: productTranslationSchema, required: true },
    uz: { type: productTranslationSchema, required: true },
    en: { type: productTranslationSchema, required: true },
  },
  { _id: false }
);

const productSchema = new Schema<ProductDocument>(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    translations: { type: localizedProductSchema, required: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: {
      type: Number,
      required: false,
      min: 1,
      validate: { validator: integerValidator, message: "Price must be an integer." },
    },
    originalPrice: {
      type: Number,
      min: 1,
      validate: { validator: integerValidator, message: "Original price must be an integer." },
    },
    currency: { type: String, required: true, enum: ["UZS"], default: "UZS" },
    images: {
      type: [productImageSchema],
      required: true,
      validate: {
        validator: (value: ProductImage[]) => value.length > 0 && value.length <= 8,
        message: "A product must have between 1 and 8 images.",
      },
    },
    flowerTypes: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length > 0 && value.length <= 12,
        message: "A product must have between 1 and 12 flower types.",
      },
    },
    colors: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length > 0 && value.length <= 12,
        message: "A product must have between 1 and 12 colors.",
      },
    },
    seasons: {
      type: [String],
      required: true,
      enum: ["spring", "summer", "autumn", "winter", "all_year"],
      default: ["all_year"],
      validate: {
        validator: (value: Season[]) =>
          value.length > 0 &&
          new Set(value).size === value.length &&
          !(value.includes("all_year") && value.length > 1),
        message:
          "Product seasons must be unique and all_year cannot be combined with another season.",
      },
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: integerValidator,
        message: "Sort order must be a non-negative integer.",
      },
    },
    isFeatured: { type: Boolean, required: true, default: false },
    // `isNew` is a Mongoose document lifecycle property. Using it as a schema
    // path would make unsaved documents look persisted and risks data loss.
    isNewArrival: { type: Boolean, required: true, default: false },
    isOnSale: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      required: true,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
  },
  { timestamps: true, versionKey: false }
);

productSchema.pre("validate", function validatePriceRelationship() {
  if (
    this.price === undefined &&
    (this.originalPrice !== undefined || this.isOnSale)
  ) {
    this.invalidate("price", "Inquiry-only products cannot have sale pricing.");
  }

  if (
    this.originalPrice !== undefined &&
    this.originalPrice !== null &&
    this.price !== undefined &&
    this.originalPrice <= this.price
  ) {
    this.invalidate(
      "originalPrice",
      "Original price must be greater than the current price."
    );
  }

  if (this.isOnSale && this.originalPrice === undefined) {
    this.invalidate("originalPrice", "Sale products require an original price.");
  }
});

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ status: 1, categoryId: 1 });
productSchema.index({ isOnSale: 1, status: 1 });
productSchema.index({ status: 1, seasons: 1 });

export const ProductModel =
  (models.Product as Model<ProductDocument> | undefined) ??
  model<ProductDocument>("Product", productSchema);
