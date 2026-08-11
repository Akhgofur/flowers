import mongoose, { type Model, type Types } from "mongoose";
import type { ProductImage, ProductStatus } from "@/lib/contracts";

const { model, models, Schema } = mongoose;

export type ProductDocument = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  composition: string[];
  categoryId: Types.ObjectId;
  price: number;
  originalPrice?: number;
  currency: "UZS";
  images: ProductImage[];
  flowerTypes: string[];
  colors: string[];
  stockQuantity: number;
  sortOrder: number;
  isFeatured: boolean;
  /** Stored under a non-reserved name; public contracts expose this as `isNew`. */
  isNewArrival: boolean;
  isOnSale: boolean;
  status: ProductStatus;
  deliveryEstimate?: string;
  size?: string;
  seoTitle?: string;
  seoDescription?: string;
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

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 140 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
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
        message: "A product must have between 1 and 20 composition entries.",
      },
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: {
      type: Number,
      required: true,
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
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: integerValidator,
        message: "Stock quantity must be a non-negative integer.",
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
    deliveryEstimate: { type: String, trim: true, maxlength: 160 },
    size: { type: String, trim: true, maxlength: 80 },
    seoTitle: { type: String, trim: true, maxlength: 70 },
    seoDescription: { type: String, trim: true, maxlength: 160 },
  },
  { timestamps: true, versionKey: false }
);

productSchema.pre("validate", function validatePriceRelationship() {
  if (
    this.originalPrice !== undefined &&
    this.originalPrice !== null &&
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
productSchema.index({ name: "text", shortDescription: "text", description: "text" });

export const ProductModel =
  (models.Product as Model<ProductDocument> | undefined) ??
  model<ProductDocument>("Product", productSchema);
