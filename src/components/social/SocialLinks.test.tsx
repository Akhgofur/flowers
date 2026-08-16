import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SocialLinks } from "./SocialLinks";

const URLS = {
  instagramUrl: "https://instagram.com/floraluxe",
  telegramUrl: "https://t.me/floraluxe",
};

describe("SocialLinks", () => {
  it("names an unlabelled mark so it is not an anonymous link", () => {
    render(<SocialLinks {...URLS} />);

    // The header shows marks alone; without the label the name has to come from
    // aria-label, or a screen reader announces only the href.
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      URLS.instagramUrl
    );
    expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute(
      "href",
      URLS.telegramUrl
    );
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
  });

  it("shows the name beside the mark when there is room for it", () => {
    render(<SocialLinks {...URLS} showLabels />);

    expect(screen.getByText("Instagram")).toBeVisible();
    expect(screen.getByText("Telegram")).toBeVisible();
    // Still one accessible name, not "Instagram Instagram".
    expect(screen.getByRole("link", { name: "Instagram" })).toBeVisible();
  });

  it("renders only the networks the shop actually filled in", () => {
    render(<SocialLinks telegramUrl={URLS.telegramUrl} />);

    expect(screen.getByRole("link", { name: "Telegram" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Instagram" })).not.toBeInTheDocument();
  });

  it("renders nothing at all when no network is configured", () => {
    const { container } = render(<SocialLinks />);

    expect(container).toBeEmptyDOMElement();
  });

  it("opens off-site links in a new tab without leaking the referrer", () => {
    render(<SocialLinks {...URLS} />);

    for (const name of ["Instagram", "Telegram"]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    }
  });

  it("hides the marks from the accessibility tree", () => {
    const { container } = render(<SocialLinks {...URLS} />);

    const marks = container.querySelectorAll("svg");
    expect(marks).toHaveLength(2);
    for (const mark of marks) {
      expect(mark).toHaveAttribute("aria-hidden", "true");
    }
  });
});
