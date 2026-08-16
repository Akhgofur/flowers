import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShopAddressLink } from "./ShopAddressLink";

const ADDRESS = "Universam, Yunusobod, Toshkent";
const LOCATION = { latitude: 41.365641, longitude: 69.289935 };

describe("ShopAddressLink", () => {
  it("opens the map when the shop has a pin on file", () => {
    render(
      <ShopAddressLink address={ADDRESS} location={LOCATION} label="Xaritada ochish" />
    );

    const link = screen.getByRole("link", { name: `Xaritada ochish: ${ADDRESS}` });
    // Yandex point parameters are longitude-first.
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("pt=69.289935,41.365641")
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(link).toHaveTextContent(ADDRESS);
  });

  it("stays plain text when there is no pin, rather than linking nowhere", () => {
    render(<ShopAddressLink address={ADDRESS} label="Xaritada ochish" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(ADDRESS)).toBeVisible();
  });

  it("hides the pin mark from the accessibility tree", () => {
    const { container } = render(
      <ShopAddressLink address={ADDRESS} location={LOCATION} label="Xaritada ochish" />
    );

    const mark = container.querySelector("svg");
    expect(mark).toHaveAttribute("aria-hidden", "true");
  });
});
