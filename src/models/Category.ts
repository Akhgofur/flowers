import mongoose, { type Model } from "mongoose";
import type {
  CategoryStatus,
  CategoryTranslation,
  Localized,
  ProductImage,
} from "@/lib/contracts";

const { model, models, Schema } = mongoose;

export type CategoryDocument = {
  slug: string;
  translations: Localized<CategoryTranslation>;
  image?: ProductImage;
  order: number;
  status: CategoryStatus;
  createdAt: Date;
  updatedAt: Date;
};

const categoryImageSchema = new Schema<ProductImage>(
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
    publicId: { type: String, trim: true, maxlength: 255 },
  },
  { _id: false }
);

const categoryTranslationSchema = new Schema<CategoryTranslation>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, trim: true, minlength: 2, maxlength: 800 },
    seoTitle: { type: String, trim: true, minlength: 2, maxlength: 70 },
    seoDescription: { type: String, trim: true, minlength: 2, maxlength: 160 },
  },
  { _id: false }
);

const localizedCategorySchema = new Schema<Localized<CategoryTranslation>>(
  {
    ru: { type: categoryTranslationSchema, required: true },
    uz: { type: categoryTranslationSchema, required: true },
    en: { type: categoryTranslationSchema, required: true },
  },
  { _id: false }
);

const categorySchema = new Schema<CategoryDocument>(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    translations: { type: localizedCategorySchema, required: true },
    image: { type: categoryImageSchema, required: false },
    order: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "Category order must be a non-negative integer.",
      },
    },
    status: {
      type: String,
      required: true,
      enum: ["published", "hidden"],
      default: "published",
    },
  },
  { timestamps: true, versionKey: false }
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ status: 1, order: 1 });

export const CategoryModel =
  (models.Category as Model<CategoryDocument> | undefined) ??
  model<CategoryDocument>("Category", categorySchema);
