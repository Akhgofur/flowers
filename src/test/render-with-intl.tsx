import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uz from "../../messages/uz.json";
import type { Locale } from "@/i18n/config";

const messages = { ru, uz, en } as const;

type IntlRenderOptions = RenderOptions & {
  locale?: Locale;
};

export function renderWithIntl(
  ui: ReactElement,
  { locale = "ru", ...options }: IntlRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
