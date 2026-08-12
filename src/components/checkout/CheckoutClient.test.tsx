import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CART_STORAGE_KEY } from "@/features/cart/cart-storage";
import type { CatalogProduct } from "@/lib/contracts";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { CheckoutClient } from "./CheckoutClient";

const products: CatalogProduct[] = [
  {
    id: "507f1f77bcf86cd799439011",
    name: "Pushti lola buketi",
    slug: "pushti-lola-buketi",
    shortDescription: "Yangi lolalardan tuzilgan mayin kompozitsiya.",
    description: "Bayram va yaqin insonlar uchun nafis sovg'a.",
    composition: ["Lola"],
    price: 150_000,
    currency: "UZS",
    images: [
      {
        url: "https://images.pexels.com/photos/1234567/tulips.jpg",
        alt: "Pushti lolalardan tayyorlangan buket",
      },
    ],
    categorySlug: "tulips",
    flowerTypes: ["tulip"],
    colors: ["pink"],
    seasons: ["all_year"],
    stockQuantity: 12,
    sortOrder: 1,
    isFeatured: false,
    isNew: true,
    isOnSale: false,
    status: "published",
  },
  // Published and browsable, but the operator has not set a price yet. Most of the
  // imported studio catalog looks like this, so it is the realistic stale line.
  {
    id: "507f1f77bcf86cd799439012",
    name: "Gul savati №79",
    slug: "gul-savati-79",
    shortDescription: "Savatdagi mualliflik kompozitsiyasi.",
    description: "Sovg‘a savatida yangi gullar.",
    composition: ["Mavsumiy gullar"],
    currency: "UZS",
    images: [
      {
        url: "https://images.pexels.com/photos/1234568/basket.jpg",
        alt: "Gul savati",
      },
    ],
    categorySlug: "baskets",
    flowerTypes: ["mixed"],
    colors: ["mixed"],
    seasons: ["all_year"],
    stockQuantity: 100,
    sortOrder: 2,
    isFeatured: false,
    isNew: true,
    isOnSale: false,
    status: "published",
  },
];

describe("CheckoutClient", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ productId: products[0]?.id, quantity: 2 }])
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits only customer data and cart lines, then clears the browser cart after success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          order: {
            orderId: "507f191e810c19729de860ea",
            orderNumber: "FL-20260811-ORDER1234",
            total: 320_000,
            status: "pending",
          },
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutClient products={products} />, { locale: "uz" });

    await screen.findByText(/pushti lola buketi/i);
    await user.type(screen.getByLabelText(/ism va familiya/i), "Ali Valiyev");
    await user.type(screen.getByLabelText(/telefon raqami/i), "+998901234567");
    await user.type(
      screen.getByLabelText(/yetkazib berish manzili/i),
      "Toshkent shahri, Chilonzor tumani"
    );
    await user.click(screen.getByRole("button", { name: /buyurtmani tasdiqlash/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/orders");
    expect(JSON.parse(String((request as RequestInit).body))).toEqual({
      locale: "uz",
      customer: {
        fullName: "Ali Valiyev",
        phone: "+998901234567",
        address: "Toshkent shahri, Chilonzor tumani",
      },
      paymentMethod: "cash_on_delivery",
      items: [{ productId: products[0]?.id, quantity: 2 }],
    });
    expect(await screen.findByText(/buyurtmangiz qabul qilindi/i)).toBeVisible();
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBe("[]");
  });

  it("keeps the cart intact and announces a safe server error on failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Mahsulot qoldig'i yangilandi." }), {
          status: 409,
          headers: { "content-type": "application/json" },
        })
      )
    );

    render(<CheckoutClient products={products} />, { locale: "uz" });
    await screen.findByText(/pushti lola buketi/i);
    await user.type(screen.getByLabelText(/ism va familiya/i), "Ali Valiyev");
    await user.type(screen.getByLabelText(/telefon raqami/i), "+998901234567");
    await user.type(
      screen.getByLabelText(/yetkazib berish manzili/i),
      "Toshkent shahri, Chilonzor tumani"
    );
    await user.click(screen.getByRole("button", { name: /buyurtmani tasdiqlash/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/mahsulot qoldig'i/i);
    expect(localStorage.getItem(CART_STORAGE_KEY)).toContain(products[0]?.id ?? "");
  });

  // A line the checkout refuses to show must not be posted: the shopper cannot see
  // it, cannot remove it, and the server rejects the whole order because of it.
  it("posts only the lines it can price, ignoring stale cart entries", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: products[0]?.id, quantity: 2 },
        { productId: products[1]?.id, quantity: 1 },
      ])
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          order: {
            orderId: "507f191e810c19729de860ea",
            orderNumber: "FL-20260812-ORDER1234",
            total: 300_000,
            status: "pending",
          },
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutClient products={products} />, { locale: "uz" });

    await screen.findByText(/pushti lola buketi/i);
    await user.type(screen.getByLabelText(/ism va familiya/i), "Ali Valiyev");
    await user.type(screen.getByLabelText(/telefon raqami/i), "+998901234567");
    await user.type(
      screen.getByLabelText(/yetkazib berish manzili/i),
      "Toshkent shahri, Chilonzor tumani"
    );
    await user.click(screen.getByRole("button", { name: /buyurtmani tasdiqlash/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String((request as RequestInit).body)) as {
      items: Array<{ productId: string }>;
    };

    expect(body.items).toEqual([{ productId: products[0]?.id, quantity: 2 }]);
    expect(body.items.map((item) => item.productId)).not.toContain(
      products[1]?.id
    );
  });

  // With a partial catalog an unknown id may be a perfectly good product the page
  // simply did not load, so deleting it would destroy a real basket.
  it("keeps unknown lines when the catalog is truncated but still does not post them", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: products[0]?.id, quantity: 2 },
        { productId: "507f1f77bcf86cd799439099", quantity: 1 },
      ])
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          order: {
            orderId: "507f191e810c19729de860ea",
            orderNumber: "FL-20260812-ORDER1234",
            total: 300_000,
            status: "pending",
          },
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutClient products={products} catalogTruncated />, { locale: "uz" });

    await screen.findByText(/pushti lola buketi/i);
    expect(localStorage.getItem(CART_STORAGE_KEY)).toContain(
      "507f1f77bcf86cd799439099"
    );

    await user.type(screen.getByLabelText(/ism va familiya/i), "Ali Valiyev");
    await user.type(screen.getByLabelText(/telefon raqami/i), "+998901234567");
    await user.type(
      screen.getByLabelText(/yetkazib berish manzili/i),
      "Toshkent shahri, Chilonzor tumani"
    );
    await user.click(screen.getByRole("button", { name: /buyurtmani tasdiqlash/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String((request as RequestInit).body)) as {
      items: Array<{ productId: string }>;
    };
    expect(body.items).toEqual([{ productId: products[0]?.id, quantity: 2 }]);
  });

  it("drops unpriceable lines from browser storage so the cart count stays honest", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: products[0]?.id, quantity: 2 },
        { productId: products[1]?.id, quantity: 1 },
      ])
    );

    render(<CheckoutClient products={products} />, { locale: "uz" });
    await screen.findByText(/pushti lola buketi/i);

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]")).toEqual([
        { productId: products[0]?.id, quantity: 2 },
      ])
    );
  });
});
