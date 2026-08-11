import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import {
  CART_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
} from "../features/cart/cart-storage";
import App from "./App";
import { renderWithIntl as render } from "@/test/render-with-intl";

beforeEach(() => {
  localStorage.clear();
});

it("renders the Nafis catalog shell", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { name: /baxtni gullar bilan yuboring/i })
  ).toBeInTheDocument();
  const cartButton = screen.getByRole("button", { name: /savatni ochish/i });
  expect(cartButton).toHaveAccessibleName(/savat bo'sh/i);
  expect(cartButton).not.toHaveTextContent("0");
  expect(cartButton.querySelector(".cart-count-badge")).toBeNull();
});

it("keeps the product catalog anchor unique", () => {
  render(<App />);

  expect(document.querySelectorAll("#catalog")).toHaveLength(1);
  expect(document.querySelector("#catalog")).toHaveAttribute(
    "aria-labelledby",
    "catalog-title"
  );
});

it("opens the empty cart drawer", async () => {
  const user = userEvent.setup();

  render(<App />);

  const cartButton = screen.getByRole("button", { name: /savatni ochish/i });
  expect(cartButton).toHaveAttribute("aria-expanded", "false");

  await user.click(cartButton);

  expect(cartButton).toHaveAttribute("aria-expanded", "true");
  const drawer = screen.getByRole("complementary", { name: /savat/i });
  expect(drawer).toBeVisible();
  expect(within(drawer).getByText(/savatingiz hozircha bo'sh/i)).toBeVisible();
});

it("changes the hero slide and opens the mobile navigation", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /keyingi slayd/i }));
  expect(
    screen.getByRole("heading", { name: /sevimli gullaringizga yoqimli narx/i })
  ).toBeInTheDocument();

  const menuButton = screen.getByRole("button", { name: /mobil menyuni ochish/i });
  await user.click(menuButton);
  expect(menuButton).toHaveAttribute("aria-expanded", "true");
  expect(menuButton).toHaveAccessibleName(/mobil menyuni yopish/i);
  expect(screen.getByRole("navigation", { name: /mobil navigatsiya/i })).toBeVisible();
});

it("describes the about shortcut without claiming a profile action", () => {
  render(<App />);

  expect(
    screen.getByRole("link", { name: /biz haqimizda bo'limiga o'tish/i })
  ).toHaveAttribute("href", "#about");
  expect(screen.queryByRole("link", { name: /profilni ochish/i })).not.toBeInTheDocument();
});

it("wraps the previous hero control from the first slide to the last slide", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /oldingi slayd/i }));

  expect(
    screen.getByRole("heading", { name: /sovg'angizni unutilmas qiling/i })
  ).toBeInTheDocument();
});

it("changes the active hero slide from a dot control", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /2-slayd/i }));

  expect(
    screen.getByRole("heading", { name: /sevimli gullaringizga yoqimli narx/i })
  ).toBeInTheDocument();
});

it("auto-advances the hero after seven seconds when reduced motion is not requested", () => {
  const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
  vi.useFakeTimers();

  try {
    render(<App />);

    act(() => vi.advanceTimersByTime(7000));

    expect(
      screen.getByRole("heading", { name: /sevimli gullaringizga yoqimli narx/i })
    ).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
    if (originalMatchMedia) {
      Object.defineProperty(window, "matchMedia", originalMatchMedia);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  }
});

it("pauses auto-advance and restarts it when the carousel is resumed", () => {
  const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
  vi.useFakeTimers();

  try {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /karuselni pauza qilish/i }));
    expect(
      screen.getByRole("button", { name: /karuselni davom ettirish/i })
    ).toBeVisible();

    act(() => vi.advanceTimersByTime(7000));
    expect(
      screen.getByRole("heading", { name: /har bir lahzaga gul yarashing/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /karuselni davom ettirish/i }));
    act(() => vi.advanceTimersByTime(7000));

    expect(
      screen.getByRole("heading", { name: /sevimli gullaringizga yoqimli narx/i })
    ).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
    if (originalMatchMedia) {
      Object.defineProperty(window, "matchMedia", originalMatchMedia);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  }
});

it("keeps the hero still when reduced motion is requested", () => {
  const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true }),
  });
  vi.useFakeTimers();

  try {
    render(<App />);

    act(() => vi.advanceTimersByTime(7000));

    expect(
      screen.getByRole("heading", { name: /har bir lahzaga gul yarashing/i })
    ).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
    if (originalMatchMedia) {
      Object.defineProperty(window, "matchMedia", originalMatchMedia);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  }
});

it("closes the mobile navigation on Escape", async () => {
  const user = userEvent.setup();
  render(<App />);

  const menuButton = screen.getByRole("button", { name: /mobil menyuni ochish/i });
  await user.click(menuButton);
  const mobileNavigation = screen.getByRole("navigation", { name: /mobil navigatsiya/i });
  const catalogLink = within(mobileNavigation).getByRole("link", { name: /katalog/i });
  catalogLink.focus();
  expect(catalogLink).toHaveFocus();
  await user.keyboard("{Escape}");

  expect(menuButton).toHaveAttribute("aria-expanded", "false");
  expect(menuButton).toHaveFocus();
  expect(
    screen.queryByRole("navigation", { name: /mobil navigatsiya/i })
  ).not.toBeInTheDocument();
});

it("closes the mobile navigation after a navigation link is selected", async () => {
  const user = userEvent.setup();
  render(<App />);

  const menuButton = screen.getByRole("button", { name: /mobil menyuni ochish/i });
  await user.click(menuButton);
  const mobileNavigation = screen.getByRole("navigation", { name: /mobil navigatsiya/i });
  await user.click(within(mobileNavigation).getByRole("link", { name: /katalog/i }));

  expect(menuButton).toHaveAttribute("aria-expanded", "false");
  expect(mobileNavigation).not.toBeInTheDocument();
});

it("selects a category and announces that catalog filtering will apply", async () => {
  const user = userEvent.setup();
  render(<App />);

  const tulipCategory = screen.getByRole("button", { name: /lolalar.*2 ta tanlov/i });
  await user.click(tulipCategory);

  expect(tulipCategory).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText(/lolalar tanlandi.*katalog filtri qo'llanadi/i)).toBeVisible();
});

it("selects the boxed category from the gift promotion and announces the selection", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /sovg'a qutilarini tanlash/i }));

  expect(
    screen.getByRole("button", { name: /sovg'a qutilari.*2 ta tanlov/i })
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.getByText(/sovg'a qutilari tanlandi.*katalog filtri qo'llanadi/i)
  ).toBeVisible();
});

it("filters by query and resets the catalog", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.type(
    screen.getByRole("searchbox", { name: /mahsulot qidirish/i }),
    "pion"
  );
  await user.click(screen.getByRole("button", { name: /filtrni qo'llash/i }));

  expect(screen.getByText(/pushti pion buketi/i)).toBeVisible();
  expect(screen.queryByText(/qirmizi atirgul buketi/i)).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /tozalash/i }));
  expect(screen.getByText(/qirmizi atirgul buketi/i)).toBeVisible();
});

it("immediately filters the catalog from a category card", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /lolalar.*2 ta tanlov/i }));

  expect(screen.getByText(/tonggi lola dastasi/i)).toBeVisible();
  expect(screen.getByText(/marjon lolalar/i)).toBeVisible();
  expect(screen.queryByText(/qirmizi atirgul buketi/i)).not.toBeInTheDocument();
});

it("filters the catalog to boxed products from the promotion", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /sovg'a qutilarini tanlash/i }));

  expect(screen.getByText(/atirgullar qutisi/i)).toBeVisible();
  expect(screen.getByText(/yoqut yurak/i)).toBeVisible();
  expect(screen.queryByText(/qirmizi atirgul buketi/i)).not.toBeInTheDocument();
});

it("applies the sale tab from the hero promotion and keeps it in the draft filters", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /2-slayd/i }));
  const hero = screen.getByRole("region", { name: /mavsumiy takliflar/i });
  await user.click(
    within(hero).getByRole("button", { name: /chegirmalarni ko'rish/i })
  );

  const saleTab = screen.getByRole("button", { name: /^aksiya$/i });
  expect(saleTab).toHaveAttribute("aria-pressed", "true");
  expect(document.querySelector("#catalog")).toHaveFocus();
  expect(screen.getByText(/qirmizi atirgul buketi/i)).toBeVisible();
  expect(screen.getByText(/atirgullar qutisi/i)).toBeVisible();
  expect(screen.getByText(/sokin oq orkide/i)).toBeVisible();
  expect(screen.queryByText(/tonggi lola dastasi/i)).not.toBeInTheDocument();

  await user.type(
    screen.getByRole("searchbox", { name: /mahsulot qidirish/i }),
    "orkide"
  );
  await user.click(screen.getByRole("button", { name: /filtrni qo'llash/i }));
  expect(screen.getByText(/sokin oq orkide/i)).toBeVisible();
  expect(screen.queryByText(/binafsha orkide/i)).not.toBeInTheDocument();
});

it("applies the sale tab from the sale ribbon", async () => {
  const user = userEvent.setup();
  render(<App />);

  const saleLink = screen.getByRole("link", {
    name: /chegirmalarni ko'rish/i,
  });
  expect(saleLink).toHaveAttribute("href", "/ru/catalog?sale=true");

  await user.click(saleLink);

  expect(screen.getByRole("button", { name: /^aksiya$/i })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(document.querySelector("#catalog")).toHaveFocus();
  expect(screen.getByText(/qirmizi atirgul buketi/i)).toBeVisible();
  expect(screen.getByText(/atirgullar qutisi/i)).toBeVisible();
  expect(screen.getByText(/sokin oq orkide/i)).toBeVisible();
  expect(screen.queryByText(/pushti pion buketi/i)).not.toBeInTheDocument();
});

it("keeps filters before product results in semantic DOM order", () => {
  render(<App />);

  const filters = document.querySelector(".catalog-filters");
  const results = document.querySelector(".catalog-results");

  expect(filters).not.toBeNull();
  expect(filters?.nextElementSibling).toBe(results);
});

it("shows only new products when the Yangi tab is selected", async () => {
  const user = userEvent.setup();
  render(<App />);

  const newTab = screen.getByRole("button", { name: /^yangi$/i });
  await user.click(newTab);

  expect(newTab).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText(/pushti pion buketi/i)).toBeVisible();
  expect(screen.queryByText(/qirmizi atirgul buketi/i)).not.toBeInTheDocument();
});

it("adds a product to the cart and announces the action", async () => {
  const user = userEvent.setup();
  render(<App />);

  const cartButton = screen.getByRole("button", { name: /savatni ochish/i });
  expect(cartButton).not.toHaveTextContent("0");

  await user.click(
    screen.getByRole("button", {
      name: /qirmizi atirgul buketi ni savatga qo'shish/i,
    })
  );

  expect(cartButton).toHaveTextContent("1");
  expect(cartButton).toHaveAccessibleName(/1 ta mahsulot/i);
  expect(cartButton.querySelector(".cart-count-badge")).toHaveTextContent("1");
  expect(screen.getByRole("status")).toHaveTextContent(
    /qirmizi atirgul buketi.*savatga qo'shildi/i
  );
});

it("uses a truthful floral fallback in every image render path", async () => {
  const user = userEvent.setup();
  render(<App />);

  const assertFallback = (image: HTMLImageElement) => {
    const originalSource = image.src;
    fireEvent.error(image);
    expect(image.src).not.toBe(originalSource);
    expect(image.src).toMatch(/^https:\/\//);
    expect(image).toHaveAttribute("data-image-fallback", "true");
    expect(image).toHaveAttribute("alt", "Nafis gullari — muqobil rasm");
  };

  assertFallback(
    screen.getByAltText(/har bir lahzaga gul yarashing gul kompozitsiyasi/i)
  );
  assertFallback(document.querySelector<HTMLImageElement>(".category-card img")!);
  assertFallback(
    screen.getByAltText(/qirmizi atirgul buketi gul kompozitsiyasi/i)
  );

  await user.click(
    screen.getByRole("button", { name: /pushti pion buketini ko'rish/i })
  );
  const dialog = screen.getByRole("dialog", { name: /pushti pion buketi/i });
  assertFallback(
    within(dialog).getByAltText(/pushti pion buketi gul kompozitsiyasi/i)
  );
  await user.keyboard("{Escape}");

  await user.click(
    screen.getByRole("button", {
      name: /qirmizi atirgul buketi ni savatga qo'shish/i,
    })
  );
  await user.click(screen.getByRole("button", { name: /savatni ochish/i }));
  const drawer = screen.getByRole("complementary", { name: /savat/i });
  assertFallback(
    within(drawer).getByAltText(/qirmizi atirgul buketi gul kompozitsiyasi/i)
  );
});

it("refreshes and auto-dismisses repeated cart announcements", () => {
  vi.useFakeTimers();

  try {
    render(<App />);
    const addToCart = screen.getByRole("button", {
      name: /qirmizi atirgul buketi ni savatga qo'shish/i,
    });

    fireEvent.click(addToCart);
    const firstAnnouncement = screen.getByRole("status");
    expect(firstAnnouncement).toHaveTextContent(
      /qirmizi atirgul buketi.*savatga qo'shildi/i
    );

    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(addToCart);

    const refreshedAnnouncement = screen.getByRole("status");
    expect(refreshedAnnouncement).not.toBe(firstAnnouncement);

    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByRole("status")).toBeVisible();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

it("shows an empty state and resets it", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.type(
    screen.getByRole("searchbox", { name: /mahsulot qidirish/i }),
    "mavjud bo'lmagan guldasta"
  );
  await user.click(screen.getByRole("button", { name: /filtrni qo'llash/i }));

  const emptyState = screen.getByRole("status");
  expect(emptyState).toHaveTextContent(/mos buket topilmadi/i);

  await user.click(within(emptyState).getByRole("button", { name: /tozalash/i }));
  expect(screen.getByText(/qirmizi atirgul buketi/i)).toBeVisible();
});

it("opens the selected product from its view action", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(
    screen.getByRole("button", { name: /qirmizi atirgul buketini ko'rish/i })
  );

  expect(
    screen.getByRole("dialog", { name: /qirmizi atirgul buketi/i })
  ).toBeVisible();
});

it("closes product quick-view with Escape", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /pushti pion buketini ko'rish/i }));
  expect(screen.getByRole("dialog", { name: /pushti pion buketi/i })).toBeVisible();

  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("contains quick-view focus with Tab and Shift+Tab and restores its trigger", async () => {
  const user = userEvent.setup();
  render(<App />);

  const viewTrigger = screen.getByRole("button", {
    name: /pushti pion buketini ko'rish/i,
  });
  const cartTrigger = screen.getByRole("button", { name: /savatni ochish/i });
  await user.click(viewTrigger);

  const dialog = screen.getByRole("dialog", { name: /pushti pion buketi/i });
  const closeButton = within(dialog).getByRole("button", {
    name: /mahsulot oynasini yopish/i,
  });
  const addButton = within(dialog).getByRole("button", {
    name: /^savatga qo'shish$/i,
  });
  const favoriteButton = within(dialog).getByRole("button", {
    name: /pushti pion buketi ni sevimlilarga qo'shish/i,
  });

  expect(closeButton).toHaveFocus();
  await user.click(cartTrigger);
  expect(dialog).toBeVisible();
  expect(screen.queryByRole("complementary", { name: /savat/i })).not.toBeInTheDocument();
  closeButton.focus();

  await user.tab({ shift: true });
  expect(addButton).toHaveFocus();
  await user.tab();
  expect(closeButton).toHaveFocus();

  await user.tab();
  expect(favoriteButton).toHaveFocus();
  addButton.focus();
  await user.tab();
  expect(closeButton).toHaveFocus();
  expect(cartTrigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("complementary", { name: /savat/i })).not.toBeInTheDocument();

  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(viewTrigger).toHaveFocus();
});

it("restores the actual quick-view trigger when activation does not move focus", async () => {
  const user = userEvent.setup();
  render(<App />);

  const viewTrigger = screen.getByRole("button", {
    name: /pushti pion buketini ko'rish/i,
  });
  const cartTrigger = screen.getByRole("button", { name: /savatni ochish/i });
  cartTrigger.focus();

  fireEvent.click(viewTrigger);
  expect(screen.getByRole("dialog", { name: /pushti pion buketi/i })).toBeVisible();

  await user.keyboard("{Escape}");

  expect(viewTrigger).toHaveFocus();
});

it("restores the quick-view origin when inert blurs the background trigger", async () => {
  const user = userEvent.setup();
  const originalInertDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "inert"
  );
  const inertStates = new WeakMap<HTMLElement, boolean>();

  Object.defineProperty(HTMLElement.prototype, "inert", {
    configurable: true,
    get: function getInert(this: HTMLElement) {
      return inertStates.get(this) ?? false;
    },
    set: function setInert(this: HTMLElement, value: boolean) {
      inertStates.set(this, value);
      const activeElement = document.activeElement;
      if (
        value &&
        activeElement instanceof HTMLElement &&
        this.contains(activeElement)
      ) {
        activeElement.blur();
      }
    },
  });

  try {
    render(<App />);
    const viewTrigger = screen.getByRole("button", {
      name: /pushti pion buketini ko'rish/i,
    });

    await user.click(viewTrigger);
    await user.keyboard("{Escape}");

    expect(viewTrigger).toHaveFocus();
  } finally {
    if (originalInertDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        "inert",
        originalInertDescriptor
      );
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "inert");
    }
  }
});

it("adds a quick-view product to cart and opens the drawer", async () => {
  const user = userEvent.setup();
  render(<App />);

  const cartButton = screen.getByRole("button", { name: /savatni ochish/i });
  const viewTrigger = screen.getByRole("button", {
    name: /pushti pion buketini ko'rish/i,
  });
  await user.click(viewTrigger);
  await user.click(screen.getByRole("button", { name: /^savatga qo'shish$/i }));

  expect(cartButton).toHaveTextContent("1");
  await user.keyboard("{Escape}");
  expect(viewTrigger).toHaveFocus();
  await user.click(cartButton);
  expect(screen.getByRole("complementary", { name: /savat/i })).toBeVisible();
});

it("toggles a favorite and persists its product id", async () => {
  const user = userEvent.setup();
  render(<App />);

  const favoriteButton = screen.getByRole("button", {
    name: /pushti pion buketi ni sevimlilarga qo'shish/i,
  });
  expect(favoriteButton).toHaveAttribute("aria-pressed", "false");

  await user.click(favoriteButton);

  expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("status")).toHaveTextContent(
    /pushti pion buketi sevimlilarga qo'shildi/i
  );
  await waitFor(() => {
    expect(localStorage.getItem(FAVORITES_STORAGE_KEY)).toBe(
      JSON.stringify(["pink-peony"])
    );
  });
});

it("keeps quick-view quantity within 1 through 99", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /pushti pion buketini ko'rish/i }));
  const dialog = screen.getByRole("dialog", { name: /pushti pion buketi/i });
  const decrease = within(dialog).getByRole("button", { name: /miqdorni kamaytirish/i });
  const increase = within(dialog).getByRole("button", { name: /miqdorni oshirish/i });
  const quantity = within(dialog).getByLabelText(/^miqdor$/i);

  expect(quantity).toHaveTextContent("1");
  expect(decrease).toBeDisabled();

  for (let click = 1; click < 100; click += 1) {
    fireEvent.click(increase);
  }

  expect(quantity).toHaveTextContent("99");
  expect(increase).toBeDisabled();
});

it("changes cart quantity with plus and minus and removes the line", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(
    screen.getByRole("button", {
      name: /qirmizi atirgul buketi ni savatga qo'shish/i,
    })
  );
  const cartButton = screen.getByRole("button", { name: /savatni ochish/i });
  await user.click(cartButton);
  const drawer = screen.getByRole("complementary", { name: /savat/i });

  await user.click(
    within(drawer).getByRole("button", {
      name: /qirmizi atirgul buketi miqdorini oshirish/i,
    })
  );
  expect(cartButton).toHaveTextContent("2");
  expect(
    within(drawer).getByLabelText(/^qirmizi atirgul buketi miqdori$/i)
  ).toHaveTextContent("2");

  await user.click(
    within(drawer).getByRole("button", {
      name: /qirmizi atirgul buketi miqdorini kamaytirish/i,
    })
  );
  expect(cartButton).toHaveTextContent("1");

  await user.click(
    within(drawer).getByRole("button", {
      name: /qirmizi atirgul buketini savatdan olib tashlash/i,
    })
  );
  expect(cartButton).not.toHaveTextContent("0");
  expect(cartButton).toHaveAccessibleName(/savat bo'sh/i);
  expect(within(drawer).getByText(/savatingiz hozircha bo'sh/i)).toBeVisible();
});

it("hydrates cart and favorite state from valid localStorage data", async () => {
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify([{ productId: "pink-peony", quantity: 2 }])
  );
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(["pink-peony"]));

  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /savatni ochish/i })).toHaveTextContent("2");
  });
  expect(
    screen.getByRole("button", {
      name: /pushti pion buketi ni sevimlilardan olib tashlash/i,
    })
  ).toHaveAttribute("aria-pressed", "true");
});

it("closes the empty cart and returns focus to the catalog", async () => {
  const user = userEvent.setup();
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });

  try {
    render(<App />);
    await user.click(screen.getByRole("button", { name: /savatni ochish/i }));
    await user.click(screen.getByRole("button", { name: /katalogga qaytish/i }));

    expect(screen.queryByRole("complementary", { name: /savat/i })).not.toBeInTheDocument();
    expect(document.querySelector("#catalog")).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  } finally {
    if (originalScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  }
});

it("links the cart drawer to the real checkout route", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(
    screen.getByRole("button", {
      name: /qirmizi atirgul buketi ni savatga qo'shish/i,
    })
  );
  await user.click(screen.getByRole("button", { name: /savatni ochish/i }));
  expect(
    screen.getByRole("link", { name: /buyurtmani rasmiylashtirish/i })
  ).toHaveAttribute("href", "/ru/checkout");
});

it("closes the cart drawer with Escape", async () => {
  const user = userEvent.setup();
  render(<App />);

  const cartButton = screen.getByRole("button", { name: /savatni ochish/i });
  await user.click(cartButton);
  expect(screen.getByRole("complementary", { name: /savat/i })).toBeVisible();

  await user.keyboard("{Escape}");

  expect(screen.queryByRole("complementary", { name: /savat/i })).not.toBeInTheDocument();
  expect(cartButton).toHaveFocus();
});

it("contains cart drawer focus with Tab and Shift+Tab and restores its trigger", async () => {
  const user = userEvent.setup();
  render(<App />);

  const cartButton = screen.getByRole("button", { name: /savatni ochish/i });
  await user.click(cartButton);

  const drawer = screen.getByRole("complementary", { name: /savat/i });
  const closeButton = within(drawer).getByRole("button", {
    name: /savatni yopish/i,
  });
  const continueButton = within(drawer).getByRole("button", {
    name: /katalogga qaytish/i,
  });

  expect(closeButton).toHaveFocus();
  await user.tab({ shift: true });
  expect(continueButton).toHaveFocus();
  await user.tab();
  expect(closeButton).toHaveFocus();

  await user.keyboard("{Escape}");
  expect(screen.queryByRole("complementary", { name: /savat/i })).not.toBeInTheDocument();
  expect(cartButton).toHaveFocus();
});

it("restores the actual cart trigger when activation does not move focus", async () => {
  const user = userEvent.setup();
  render(<App />);

  const cartButton = screen.getByRole("button", { name: /savatni ochish/i });
  const viewTrigger = screen.getByRole("button", {
    name: /pushti pion buketini ko'rish/i,
  });
  viewTrigger.focus();

  fireEvent.click(cartButton);
  expect(screen.getByRole("complementary", { name: /savat/i })).toBeVisible();

  await user.keyboard("{Escape}");

  expect(cartButton).toHaveFocus();
});
