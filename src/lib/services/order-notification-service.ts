import "server-only";
import nodemailer from "nodemailer-runtime";
import type { PaymentMethod } from "@/lib/contracts";
import { env } from "@/lib/env";
import { formatSum } from "@/shared/format";

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
};

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
  sendTelegram: (config: TelegramNotificationConfig, text: string) => Promise<void>;
  logFailure: (channel: "email" | "telegram" | "configuration") => void;
};

function paymentMethodLabel(paymentMethod: PaymentMethod): string {
  return paymentMethod === "cash_on_delivery" ? "Yetkazilganda naqd" : "Yetkazilganda karta";
}

export function formatNewOrderNotification(order: NewOrderNotification): string {
  const optionalRows = [
    order.customer.deliveryDate ? `Yetkazish sanasi: ${order.customer.deliveryDate}` : null,
    order.customer.comment ? `Izoh: ${order.customer.comment}` : null,
  ].filter(Boolean);

  return [
    `Yangi buyurtma: ${order.orderNumber}`,
    `Jami: ${formatSum(order.total, "uz")}`,
    `To'lov: ${paymentMethodLabel(order.paymentMethod)}`,
    "",
    `Mijoz: ${order.customer.fullName}`,
    `Telefon: ${order.customer.phone}`,
    `Manzil: ${order.customer.address}`,
    ...optionalRows,
  ].join("\n");
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
    subject: "Nafis Flowers: yangi buyurtma",
    text,
  });
}

async function sendTelegram(config: TelegramNotificationConfig, text: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: config.chatId, text }),
        signal: controller.signal,
      }
    );
    if (!response.ok) throw new Error("Telegram notification was rejected.");
  } finally {
    clearTimeout(timeout);
  }
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

      const text = formatNewOrderNotification(order);
      const deliveries: Array<{
        channel: "email" | "telegram";
        request: Promise<void>;
      }> = [];
      if (config.email) {
        deliveries.push({ channel: "email", request: dependencies.sendEmail(config.email, text) });
      }
      if (config.telegram) {
        deliveries.push({
          channel: "telegram",
          request: dependencies.sendTelegram(config.telegram, text),
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
