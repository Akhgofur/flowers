import { z } from "zod";

const mongoUriSchema = z
  .string()
  .trim()
  .regex(/^mongodb(?:\+srv)?:\/\//, "must be a mongodb connection URI");
const nonEmptyString = z.string().trim().min(1);
const emailSchema = z.string().trim().email();
const bcryptHashSchema = z.string().regex(
  /^\$2[aby]\$\d{2}\$/,
  "must be a bcrypt password hash"
);
const httpUrlSchema = z.string().trim().url().refine(
  (value) => value.startsWith("http://") || value.startsWith("https://"),
  "must be an http(s) URL"
);

function requiredServerValue(name: string, schema: z.ZodType<string>): string {
  const parsed = schema.safeParse(process.env[name]);

  if (!parsed.success) {
    throw new Error(`Server configuration error: ${name} is required and invalid.`);
  }

  return parsed.data;
}

function optionalServerValue(
  name: string,
  schema: z.ZodType<string>
): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Server configuration error: ${name} is invalid.`);
  }

  return parsed.data;
}

/**
 * Every getter validates only the value being used. This keeps static storefront
 * rendering independent of local credentials while protecting DB/auth/upload code.
 */
export const env = {
  get MONGODB_URI() {
    return requiredServerValue("MONGODB_URI", mongoUriSchema);
  },
  get NEXTAUTH_SECRET() {
    return requiredServerValue(
      "NEXTAUTH_SECRET",
      z.string().trim().min(32, "must contain at least 32 characters")
    );
  },
  get ADMIN_EMAIL() {
    return requiredServerValue("ADMIN_EMAIL", emailSchema);
  },
  get ADMIN_PASSWORD_HASH() {
    return requiredServerValue("ADMIN_PASSWORD_HASH", bcryptHashSchema);
  },
  get NEXTAUTH_URL() {
    return optionalServerValue("NEXTAUTH_URL", httpUrlSchema);
  },
  get NEXT_PUBLIC_SITE_URL() {
    return optionalServerValue("NEXT_PUBLIC_SITE_URL", httpUrlSchema) ?? "http://localhost:3000";
  },
  get CLOUDINARY_CLOUD_NAME() {
    return requiredServerValue("CLOUDINARY_CLOUD_NAME", nonEmptyString);
  },
  get CLOUDINARY_API_KEY() {
    return requiredServerValue("CLOUDINARY_API_KEY", nonEmptyString);
  },
  get CLOUDINARY_API_SECRET() {
    return requiredServerValue("CLOUDINARY_API_SECRET", nonEmptyString);
  },
  get SMTP_HOST() {
    return optionalServerValue("SMTP_HOST", nonEmptyString);
  },
  get SMTP_PORT() {
    return optionalServerValue("SMTP_PORT", z.string().regex(/^\d+$/));
  },
  get SMTP_USER() {
    return optionalServerValue("SMTP_USER", nonEmptyString);
  },
  get SMTP_PASSWORD() {
    return optionalServerValue("SMTP_PASSWORD", nonEmptyString);
  },
  get SMTP_FROM() {
    return optionalServerValue("SMTP_FROM", emailSchema);
  },
  get ORDER_NOTIFICATION_EMAIL() {
    return optionalServerValue("ORDER_NOTIFICATION_EMAIL", emailSchema);
  },
  get TELEGRAM_BOT_TOKEN() {
    return optionalServerValue("TELEGRAM_BOT_TOKEN", nonEmptyString);
  },
  get TELEGRAM_CHAT_ID() {
    return optionalServerValue("TELEGRAM_CHAT_ID", nonEmptyString);
  },
  get CRON_SECRET() {
    return requiredServerValue(
      "CRON_SECRET",
      z.string().trim().min(32, "must contain at least 32 characters")
    );
  },
};
