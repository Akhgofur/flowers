import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { AdminSiteSettings } from "@/lib/contracts";
import { AdminSettingsPanel } from "./AdminSettingsPanel";

const settings: AdminSiteSettings = {
  siteName: "Nafis Flowers",
  translations: {
    ru: { siteDescription: "Авторские букеты в Ташкенте." },
    uz: { siteDescription: "Toshkentdagi mualliflik buketlari." },
    en: { siteDescription: "Signature bouquets in Tashkent." },
  },
  deliveryFee: 0,
};

describe("AdminSettingsPanel locale drafts", () => {
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
