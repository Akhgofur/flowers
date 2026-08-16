import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { CatalogFilters } from "./CatalogFilters";
import { DEFAULT_FILTERS } from "./catalog-utils";

function renderFilters(priceCeiling?: number | null) {
  return render(
    <CatalogFilters
      filters={DEFAULT_FILTERS}
      priceCeiling={priceCeiling}
      onChange={vi.fn()}
      onApply={vi.fn()}
      onReset={vi.fn()}
    />,
    { locale: "ru" }
  );
}

describe("CatalogFilters", () => {
  it("caps both sliders at the supplied ceiling", () => {
    renderFilters(440000);

    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(2);
    for (const slider of sliders) {
      expect(slider).toHaveAttribute("max", "440000");
      expect(slider).toHaveAttribute("min", "20000");
    }
  });

  it("hides the price filter when no bouquet carries a price", () => {
    renderFilters(null);

    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByText(/диапазон цены/i)).not.toBeInTheDocument();
    // The rest of the filters must survive; only the price range goes away.
    expect(screen.getByText(/вид цветка/i)).toBeInTheDocument();
  });

  it("still shows the price filter for callers that supply no ceiling", () => {
    renderFilters(undefined);

    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });
});
