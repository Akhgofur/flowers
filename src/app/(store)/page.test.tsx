import { render, screen } from "@testing-library/react";
import StorePage from "./page";

describe("store route shell", () => {
  it("renders the Nafis storefront route shell", async () => {
    render(await StorePage());

    expect(
      screen.getByRole("main", { name: /nafis gullar katalogi/i })
    ).toBeInTheDocument();
  });
});
