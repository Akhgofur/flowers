import mongoose, { type Model } from "mongoose";
import type {
  Localized,
  ProductImage,
  SiteSettingsTranslation,
} from "@/lib/contracts";
import type { GeoPoint } from "@/shared/geo-point";

const { model, models, Schema } = mongoose;

/** Bounds are Earth's own; anything outside them is a caller bug, not a shop. */
const shopLocationSchema = new Schema<GeoPoint>(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }
);

export type SiteSettingsDocument = {
  key: "default";
  siteName: string;
  brandLogo?: ProductImage;
  brandMark?: ProductImage;
  translations: Localized<SiteSettingsTranslation>;
  phone?: string;
  email?: string;
  address?: string;
  /** The shop's own pin, so a collecting customer can navigate to it. */
  location?: GeoPoint;
  workingHours?: string;
  deliveryFee: number;
  instagramUrl?: string;
  telegramUrl?: string;
  seoOgImage?: {
    url: string;
    alt: string;
    publicId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

const siteSettingsTranslationSchema = new Schema<SiteSettingsTranslation>(
  {
    siteDescription: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 300,
    },
    deliveryPolicy: { type: String, trim: true, minlength: 2, maxlength: 2_000 },
    seoTitle: { type: String, trim: true, minlength: 2, maxlength: 70 },
    seoDescription: { type: String, trim: true, minlength: 2, maxlength: 160 },
  },
  { _id: false }
);

const localizedSiteSettingsSchema = new Schema<Localized<SiteSettingsTranslation>>(
  {
    ru: { type: siteSettingsTranslationSchema, required: true },
    uz: { type: siteSettingsTranslationSchema, required: true },
    en: { type: siteSettingsTranslationSchema, required: true },
  },
  { _id: false }
);

const siteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    key: { type: String, required: true, default: "default", enum: ["default"] },
    siteName: {
      type: String,
      required: true,
      default: "Floraluxe",
      trim: true,
      maxlength: 100,
    },
    brandLogo: {
      url: { type: String, trim: true, match: /^https:\/\// },
      alt: { type: String, trim: true, minlength: 2, maxlength: 180 },
      publicId: { type: String, trim: true, maxlength: 255 },
    },
    brandMark: {
      url: { type: String, trim: true, match: /^https:\/\// },
      alt: { type: String, trim: true, minlength: 2, maxlength: 180 },
      publicId: { type: String, trim: true, maxlength: 255 },
    },
    translations: { type: localizedSiteSettingsSchema, required: true },
    phone: { type: String, trim: true, maxlength: 32 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    address: { type: String, trim: true, maxlength: 500 },
    location: { type: shopLocationSchema, required: false },
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
    instagramUrl: { type: String, trim: true, maxlength: 500 },
    telegramUrl: { type: String, trim: true, maxlength: 500 },
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
