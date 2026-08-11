import mongoose, { type Model } from "mongoose";

const { model, models, Schema } = mongoose;

export type SiteSettingsDocument = {
  key: "default";
  siteName: string;
  siteDescription: string;
  phone?: string;
  email?: string;
  address?: string;
  workingHours?: string;
  deliveryFee: number;
  deliveryPolicy?: string;
  instagramUrl?: string;
  telegramUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: {
    url: string;
    alt: string;
    publicId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

const siteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    key: { type: String, required: true, default: "default", enum: ["default"] },
    siteName: {
      type: String,
      required: true,
      default: "Nafis Flowers",
      trim: true,
      maxlength: 100,
    },
    siteDescription: {
      type: String,
      required: true,
      default: "Toshkent bo‘ylab nafis guldastalar va tezkor yetkazib berish xizmati.",
      trim: true,
      maxlength: 300,
    },
    phone: { type: String, trim: true, maxlength: 32 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    address: { type: String, trim: true, maxlength: 500 },
    workingHours: { type: String, trim: true, maxlength: 160 },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "Delivery fee must be a non-negative integer.",
      },
    },
    deliveryPolicy: { type: String, trim: true, maxlength: 2_000 },
    instagramUrl: { type: String, trim: true, maxlength: 500 },
    telegramUrl: { type: String, trim: true, maxlength: 500 },
    seoTitle: { type: String, trim: true, maxlength: 70 },
    seoDescription: { type: String, trim: true, maxlength: 160 },
    seoOgImage: {
      url: { type: String, trim: true, match: /^https:\/\// },
      alt: { type: String, trim: true, minlength: 2, maxlength: 180 },
      publicId: { type: String, trim: true, maxlength: 255 },
    },
  },
  { timestamps: true, versionKey: false }
);

siteSettingsSchema.index({ key: 1 }, { unique: true });

export const SiteSettingsModel =
  (models.SiteSettings as Model<SiteSettingsDocument> | undefined) ??
  model<SiteSettingsDocument>("SiteSettings", siteSettingsSchema);
