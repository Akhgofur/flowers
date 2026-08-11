import mongoose, { type Model } from "mongoose";
import type { CategoryStatus, ProductImage } from "@/lib/contracts";

const { model, models, Schema } = mongoose;

export type CategoryDocument = {
  name: string;
  slug: string;
  description?: string;
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

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, trim: true, maxlength: 800 },
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
