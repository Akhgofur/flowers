import mongoose, { type Model } from "mongoose";

const { model, models, Schema } = mongoose;

export type RateLimitDocument = {
  key: string;
  count: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const rateLimitSchema = new Schema<RateLimitDocument>(
  {
    key: { type: String, required: true, trim: true, maxlength: 255 },
    count: { type: Number, required: true, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false }
);

rateLimitSchema.index({ key: 1 }, { unique: true });
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitModel =
  (models.RateLimit as Model<RateLimitDocument> | undefined) ??
  model<RateLimitDocument>("RateLimit", rateLimitSchema);
