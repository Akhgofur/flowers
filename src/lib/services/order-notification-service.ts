import "server-only";
import nodemailer from "nodemailer-runtime";
import type { PaymentMethod } from "@/lib/contracts";
import { env } from "@/lib/env";
import { formatSum } from "@/shared/format";

export type NewOrderNotificationItem = {
  name: string;
  quantity: number;
  lineTotal?: number;
  /** Snapshot taken when the order was placed; empty when the product had none. */
  imageUrl: string;
};

export type NewOrderNotification = {
  orderNumber: string;
  total: number;
  paymentMethod: PaymentMethod;
  customer: {
    fullName: string;
    phone: string;
    address: string;
    deliveryDate?: string;
    comment?: string;
  };
  /** Absent for notifications stored before the operator message listed items. */
  items?: NewOrderNotificationItem[];
};

export type TelegramMessage = {
  text: string;
  /** Product photos, already filtered to usable URLs and capped for one album. */
  photos: string[];
};

/** Telegram renders at most 10 media per album and 1024 characters of caption. */
const TELEGRAM_ALBUM_LIMIT = 10;
const TELEGRAM_CAPTION_LIMIT = 1024;

export type EmailNotificationConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  to: string;
};

export type TelegramNotificationConfig = {
  botToken: string;
  chatId: string;
};

export type OrderNotificationConfig = {
  email?: EmailNotificationConfig;
  telegram?: TelegramNotificationConfig;
};

type NotificationDependencies = {
  getConfig: () => OrderNotificationConfig;
  sendEmail: (config: EmailNotificationConfig, text: string) => Promise<void>;
  sendTelegram: (
    config: TelegramNotificationConfig,
    message: TelegramMessage
  ) => Promise<void>;
  logFailure: (channel: "email" | "telegram" | "configuration") => void;
};

export class TelegramNotificationError extends Error {
  constructor(readonly code: "CONFIG_MISSING" | "TIMEOUT" | "HTTP_REJECTED") {
    super("Telegram notification delivery failed.");
    this.name = "TelegramNotificationError";
  }
}

function paymentMethodLabel(paymentMethod: PaymentMethod): string {
  return paymentMethod === "cash_on_delivery" ? "Yetkazilganda naqd" : "Yetkazilganda karta";
}

export function formatNewOrderNotification(order: NewOrderNotification): string {
  const optionalRows = [
    order.customer.deliveryDate ? `Yetkazish sanasi: ${order.customer.deliveryDate}` : null,
    order.customer.comment ? `Izoh: ${order.customer.comment}` : null,
  ].filter(Boolean);

  // The florist needs to know what to prepare, which the totals alone never said.
  const itemRows = order.items?.length
    ? [
        "",
        "Mahsulotlar:",
        ...order.items.map(
          (item, index) =>
            `${index + 1}. ${item.name} × ${item.quantity} — ${
              item.lineTotal === undefined
                ? "narx so‘rov bo‘yicha"
                : formatSum(item.lineTotal, "uz")
            }`
        ),
      ]
    : [];

  return [
    `Yangi buyurtma: ${order.orderNumber}`,
    `Jami: ${formatSum(order.total, "uz")}`,
    `To'lov: ${paymentMethodLabel(order.paymentMethod)}`,
    ...itemRows,
    "",
    `Mijoz: ${order.customer.fullName}`,
    `Telefon: ${order.customer.phone}`,
    `Manzil: ${order.customer.address}`,
    ...optionalRows,
  ].join("\n");
}

export function buildTelegramMessage(order: NewOrderNotification): TelegramMessage {
  return {
    text: formatNewOrderNotification(order),
    photos: (order.items ?? [])
      .map((item) => item.imageUrl)
      .filter((url) => url.startsWith("https://"))
      .slice(0, TELEGRAM_ALBUM_LIMIT),
  };
}

function readConfig(): OrderNotificationConfig {
  const smtpHost = env.SMTP_HOST;
  const smtpPort = env.SMTP_PORT;
  const smtpUser = env.SMTP_USER;
  const smtpPassword = env.SMTP_PASSWORD;
  const smtpFrom = env.SMTP_FROM;
  const emailTo = env.ORDER_NOTIFICATION_EMAIL;
  const port = smtpPort ? Number(smtpPort) : undefined;
  const hasFullEmailConfig = Boolean(
    smtpHost && smtpUser && smtpPassword && smtpFrom && emailTo && port && port <= 65_535
  );

  const telegramBotToken = env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = env.TELEGRAM_CHAT_ID;

  return {
    ...(hasFullEmailConfig
      ? {
          email: {
            host: smtpHost!,
            port: port!,
            user: smtpUser!,
            password: smtpPassword!,
            from: smtpFrom!,
            to: emailTo!,
          },
        }
      : {}),
    ...(telegramBotToken && telegramChatId
      ? { telegram: { botToken: telegramBotToken, chatId: telegramChatId } }
      : {}),
  };
}

async function sendEmail(config: EmailNotificationConfig, text: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 4_000,
    greetingTimeout: 4_000,
    socketTimeout: 6_000,
  });
  await transporter.sendMail({
    from: config.from,
    to: config.to,
    subject: "Floraluxe: yangi buyurtma",
    text,
  });
}

async function callTelegram(
  config: TelegramNotificationConfig,
  method: "sendMessage" | "sendPhoto" | "sendMediaGroup",
  payload: Record<string, unknown>
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.botToken}/${method}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: config.chatId, ...payload }),
        signal: controller.signal,
      }
    );
    if (!response.ok) throw new Error("Telegram notification was rejected.");
  } finally {
    clearTimeout(timeout);
  }
}

async function sendTelegram(
  config: TelegramNotificationConfig,
  message: TelegramMessage
): Promise<void> {
  // Photos carry the order text as their caption so the group gets one message.
  // Telegram fetches the image itself, which can fail for reasons unrelated to the
  // order, so a rejected album falls back to the plain text that always worked.
  const canCaption =
    message.photos.length > 0 && message.text.length <= TELEGRAM_CAPTION_LIMIT;

  if (canCaption) {
    try {
      if (message.photos.length === 1) {
        await callTelegram(config, "sendPhoto", {
          photo: message.photos[0],
          caption: message.text,
        });
      } else {
        await callTelegram(config, "sendMediaGroup", {
          media: message.photos.map((photo, index) => ({
            type: "photo",
            media: photo,
            // Telegram shows only the first caption as the album caption.
            ...(index === 0 ? { caption: message.text } : {}),
          })),
        });
      }
      return;
    } catch {
      // Fall through: the operator must get the order even without pictures.
    }
  }

  await callTelegram(config, "sendMessage", { text: message.text });
}

function logFailure(channel: "email" | "telegram" | "configuration"): void {
  // PII, tokens and provider responses intentionally never enter server logs.
  console.error(`Order notification ${channel} delivery failed.`);
}

export function createOrderNotificationService(
  overrides: Partial<NotificationDependencies> = {}
) {
  const dependencies: NotificationDependencies = {
    getConfig: overrides.getConfig ?? readConfig,
    sendEmail: overrides.sendEmail ?? sendEmail,
    sendTelegram: overrides.sendTelegram ?? sendTelegram,
    logFailure: overrides.logFailure ?? logFailure,
  };

  return {
    async notifyTelegramOrder(order: NewOrderNotification): Promise<void> {
      let config: OrderNotificationConfig;
      try {
        config = dependencies.getConfig();
      } catch {
        throw new TelegramNotificationError("CONFIG_MISSING");
      }
      if (!config.telegram) throw new TelegramNotificationError("CONFIG_MISSING");

      try {
        await dependencies.sendTelegram(config.telegram, buildTelegramMessage(order));
      } catch (error) {
        const code =
          error instanceof Error && error.name === "AbortError"
            ? "TIMEOUT"
            : "HTTP_REJECTED";
        throw new TelegramNotificationError(code);
      }
    },

    async notifyNewOrder(order: NewOrderNotification): Promise<{
      attempted: number;
      delivered: number;
      failed: number;
    }> {
      let config: OrderNotificationConfig;
      try {
        config = dependencies.getConfig();
      } catch {
        dependencies.logFailure("configuration");
        return { attempted: 0, delivered: 0, failed: 1 };
      }

      const message = buildTelegramMessage(order);
      const deliveries: Array<{
        channel: "email" | "telegram";
        request: Promise<void>;
      }> = [];
      if (config.email) {
        deliveries.push({
          channel: "email",
          request: dependencies.sendEmail(config.email, message.text),
        });
      }
      if (config.telegram) {
        deliveries.push({
          channel: "telegram",
          request: dependencies.sendTelegram(config.telegram, message),
        });
      }

      const results = await Promise.allSettled(deliveries.map((delivery) => delivery.request));
      results.forEach((result, index) => {
        if (result.status === "rejected") dependencies.logFailure(deliveries[index]!.channel);
      });
      const failed = results.filter((result) => result.status === "rejected");

      return {
        attempted: results.length,
        delivered: results.length - failed.length,
        failed: failed.length,
      };
    },
  };
}

export const orderNotificationService = createOrderNotificationService();
