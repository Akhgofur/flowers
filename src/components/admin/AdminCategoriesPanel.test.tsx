import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminCategoriesPanel } from "./AdminCategoriesPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("AdminCategoriesPanel locale drafts", () => {
  it("keeps category names isolated by locale", async () => {
    const user = userEvent.setup();
    render(<AdminCategoriesPanel initialCategories={[]} />);

    await user.click(screen.getByRole("button", { name: /kategoriya qo‘shish/i }));
    await user.type(screen.getByLabelText("Kategoriya nomi"), "Розы");
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByLabelText("Kategoriya nomi")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Русский" }));
    expect(screen.getByLabelText("Kategoriya nomi")).toHaveValue("Розы");
  });
});

/**
 * Categories accepted an image long before the admin could produce one: the
 * only way in was pasting a URL by hand, which is why production shipped with
 * stock photographs from another site.
 */
describe("AdminCategoriesPanel image upload", () => {
  const pngFile = () =>
    new File([new Uint8Array([1, 2, 3])], "roses.png", { type: "image/png" });

  /** Saving validates every locale, so all three names have to be present. */
  const openForm = async (user: ReturnType<typeof userEvent.setup>) => {
    render(<AdminCategoriesPanel initialCategories={[]} />);
    await user.click(screen.getByRole("button", { name: /kategoriya qo‘shish/i }));
    await user.type(screen.getByLabelText("Slug"), "roses");

    for (const [tab, name] of [
      ["Русский", "Розы"],
      ["O‘zbekcha", "Atirgullar"],
      ["English", "Roses"],
    ] as const) {
      await user.click(screen.getByRole("button", { name: tab }));
      await user.type(screen.getByLabelText("Kategoriya nomi"), name);
    }
  };

  const fileInput = () =>
    screen.getByText(/Cloudinary'dan rasm yuklash/i).closest("label")!.querySelector("input")!;

  /** The panel re-renders the saved row, so the reply needs a whole category. */
  const savedCategory = {
    id: "1",
    slug: "roses",
    translations: {
      ru: { name: "Розы" },
      uz: { name: "Atirgullar" },
      en: { name: "Roses" },
    },
    order: 0,
    status: "published",
  };

  const savedPayload = (fetchMock: ReturnType<typeof vi.fn>) => {
    const save = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/admin/categories"));
    return JSON.parse(String(save![1].body));
  };

  it("fills the image fields from the upload and saves its Cloudinary id", async () => {
    const uploaded = {
      url: "https://res.cloudinary.com/dd2x7pan9/image/upload/v1/floraluxe/roses.png",
      alt: "Розы",
      publicId: "floraluxe/products/roses",
    };
    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes("/api/admin/upload")
        ? { ok: true, json: async () => ({ image: uploaded }) }
        : { ok: true, json: async () => ({ category: savedCategory }) }
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    await openForm(user);
    await user.type(screen.getByLabelText("Rasm tavsifi"), "Розы");
    await user.upload(fileInput(), pngFile());

    expect(await screen.findByLabelText("Rasm URL (ixtiyoriy)")).toHaveValue(uploaded.url);

    await user.click(screen.getByRole("button", { name: /saqlash/i }));

    expect(savedPayload(fetchMock).image).toEqual(uploaded);
    vi.unstubAllGlobals();
  });

  it("drops a stale Cloudinary id when the URL is replaced by hand", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes("/api/admin/upload")
        ? {
            ok: true,
            json: async () => ({
              image: { url: "https://res.cloudinary.com/x/a.png", alt: "Розы", publicId: "old-id" },
            }),
          }
        : { ok: true, json: async () => ({ category: savedCategory }) }
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    await openForm(user);
    await user.type(screen.getByLabelText("Rasm tavsifi"), "Розы");
    await user.upload(fileInput(), pngFile());
    await screen.findByDisplayValue("https://res.cloudinary.com/x/a.png");

    const urlField = screen.getByLabelText("Rasm URL (ixtiyoriy)");
    await user.clear(urlField);
    await user.type(urlField, "https://example.com/other.png");
    await user.click(screen.getByRole("button", { name: /saqlash/i }));

    expect(savedPayload(fetchMock).image).toEqual({
      url: "https://example.com/other.png",
      alt: "Розы",
    });
    vi.unstubAllGlobals();
  });
});
