import mongoose, { type Model, type Types } from "mongoose";
import type {
  HomeSectionStatus,
  HomeSectionTranslation,
  Localized,
} from "@/lib/contracts";

const { model, models, Schema } = mongoose;

export type HomeSectionDocument = {
  translations: Localized<HomeSectionTranslation>;
  productIds: Types.ObjectId[];
  sortOrder: number;
  status: HomeSectionStatus;
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const translationSchema = new Schema<HomeSectionTranslation>(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, trim: true, minlength: 2, maxlength: 500 },
  },
  { _id: false }
);

const localizedSchema = new Schema<Localized<HomeSectionTranslation>>(
  {
    ru: { type: translationSchema, required: true },
    uz: { type: translationSchema, required: true },
    en: { type: translationSchema, required: true },
  },
  { _id: false }
);

const homeSectionSchema = new Schema<HomeSectionDocument>(
  {
    translations: { type: localizedSchema, required: true },
    productIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      required: true,
      validate: {
        validator: (value: Types.ObjectId[]) =>
          value.length > 0 &&
          value.length <= 24 &&
          new Set(value.map((id) => id.toString())).size === value.length,
        message: "A home section must contain between 1 and 24 unique products.",
      },
    },
    sortOrder: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Home section order must be a non-negative integer.",
      },
    },
    status: {
      type: String,
      required: true,
      enum: ["draft", "published"],
      default: "draft",
    },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

homeSectionSchema.pre("validate", function validateSchedule() {
  if (this.startsAt && this.endsAt && this.startsAt >= this.endsAt) {
    this.invalidate("endsAt", "Home section end must be after its start.");
  }
});

homeSectionSchema.index({ status: 1, sortOrder: 1, _id: 1 });
homeSectionSchema.index({ startsAt: 1, endsAt: 1 });

export const HomeSectionModel =
  (models.HomeSection as Model<HomeSectionDocument> | undefined) ??
  model<HomeSectionDocument>("HomeSection", homeSectionSchema);
