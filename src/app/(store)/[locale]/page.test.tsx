import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/test/render-with-intl";
import StorePage from "./page";

describe("store route shell", () => {
  it("renders the Nafis storefront route shell", async () => {
    render(await StorePage({ params: Promise.resolve({ locale: "ru" }) }));

    expect(
      screen.getByRole("main", { name: /nafis gullar katalogi/i })
    ).toBeInTheDocument();
  });
});
