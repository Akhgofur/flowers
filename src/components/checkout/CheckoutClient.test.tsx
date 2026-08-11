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
    stockQuantity: 12,
    sortOrder: 1,
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
            orderNumber: "NF-20260811-ORDER1234",
            total: 320_000,
            status: "pending",
          },
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutClient products={products} />);

    await screen.findByText(/pushti lola buketi/i);
    await user.type(screen.getByLabelText(/ismingiz/i), "Ali Valiyev");
    await user.type(screen.getByLabelText(/telefon raqamingiz/i), "+998901234567");
    await user.type(
      screen.getByLabelText(/yetkazib berish manzili/i),
      "Toshkent shahri, Chilonzor tumani"
    );
    await user.click(screen.getByRole("button", { name: /buyurtmani tasdiqlash/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/orders");
    expect(JSON.parse(String((request as RequestInit).body))).toEqual({
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

    render(<CheckoutClient products={products} />);
    await screen.findByText(/pushti lola buketi/i);
    await user.type(screen.getByLabelText(/ismingiz/i), "Ali Valiyev");
    await user.type(screen.getByLabelText(/telefon raqamingiz/i), "+998901234567");
    await user.type(
      screen.getByLabelText(/yetkazib berish manzili/i),
      "Toshkent shahri, Chilonzor tumani"
    );
    await user.click(screen.getByRole("button", { name: /buyurtmani tasdiqlash/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/mahsulot qoldig'i/i);
    expect(localStorage.getItem(CART_STORAGE_KEY)).toContain(products[0]?.id ?? "");
  });
});
