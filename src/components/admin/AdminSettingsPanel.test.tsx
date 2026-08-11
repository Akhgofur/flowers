import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminSiteSettings } from "@/lib/contracts";
import { AdminSettingsPanel } from "./AdminSettingsPanel";

const settings: AdminSiteSettings = {
  siteName: "Floraluxe",
  translations: {
    ru: { siteDescription: "Авторские букеты в Ташкенте." },
    uz: { siteDescription: "Toshkentdagi mualliflik buketlari." },
    en: { siteDescription: "Signature bouquets in Tashkent." },
  },
  deliveryFee: 0,
};

describe("AdminSettingsPanel locale drafts", () => {
  it("saves horizontal and compact brand assets with contact details", async () => {
    const user = userEvent.setup();
    const saved = {
      ...settings,
      siteName: "Floraluxe",
      phone: "+998887802208",
      brandLogo: { url: "https://example.com/logo.jpg", alt: "Floraluxe" },
      brandMark: { url: "https://example.com/mark.jpg", alt: "Floraluxe mark" },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ settings: saved }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminSettingsPanel initialSettings={settings} />);

    await user.clear(screen.getByLabelText(/do.*kon nomi/i));
    await user.type(screen.getByLabelText(/do.*kon nomi/i), "Floraluxe");
    await user.type(screen.getByLabelText("Telefon"), "+998887802208");
    await user.type(screen.getByLabelText("Gorizontal logo URL"), "https://example.com/logo.jpg");
    await user.type(screen.getByLabelText("Gorizontal logo tavsifi"), "Floraluxe");
    await user.type(screen.getByLabelText("Ixcham logo URL"), "https://example.com/mark.jpg");
    await user.type(screen.getByLabelText("Ixcham logo tavsifi"), "Floraluxe mark");
    await user.click(screen.getByRole("button", { name: /sozlamalarni saqlash/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      siteName: "Floraluxe",
      phone: "+998887802208",
      brandLogo: { url: "https://example.com/logo.jpg", alt: "Floraluxe" },
      brandMark: { url: "https://example.com/mark.jpg", alt: "Floraluxe mark" },
    });
    vi.unstubAllGlobals();
  });

  it("edits each localized site description independently", async () => {
    const user = userEvent.setup();
    render(<AdminSettingsPanel initialSettings={settings} />);

    expect(screen.getByLabelText("Sayt tavsifi")).toHaveValue(
      "Авторские букеты в Ташкенте."
    );
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByLabelText("Sayt tavsifi")).toHaveValue(
      "Signature bouquets in Tashkent."
    );
    await user.clear(screen.getByLabelText("Sayt tavsifi"));
    await user.type(screen.getByLabelText("Sayt tavsifi"), "Premium flower studio.");
    await user.click(screen.getByRole("button", { name: "Русский" }));
    expect(screen.getByLabelText("Sayt tavsifi")).toHaveValue(
      "Авторские букеты в Ташкенте."
    );
  });
});
