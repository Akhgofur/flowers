import { expect, test } from "@playwright/test";

test("catalog cards render as aligned rectangular premium surfaces", async ({
  page,
}) => {
  await page.goto("/ru/catalog");

  const cards = page.locator(".product-card");
  const card = cards.first();
  const image = card.locator(".product-card__image");
  await expect(card).toBeVisible();

  const visual = await image.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      ratio: rect.width / rect.height,
      topLeftRadius: style.borderTopLeftRadius,
      topRightRadius: style.borderTopRightRadius,
    };
  });

  expect(visual.ratio).toBeCloseTo(0.8, 2);
  expect(visual.topLeftRadius).toBe("0px");
  expect(visual.topRightRadius).toBe("0px");

  const firstRowHeights = await cards.evaluateAll((elements) =>
    elements.slice(0, 4).map((element) => element.getBoundingClientRect().height)
  );
  expect(Math.max(...firstRowHeights) - Math.min(...firstRowHeights)).toBeLessThanOrEqual(2);
});

test("mobile catalog has no horizontal overflow and keeps navigation tappable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/ru/catalog");

  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);

  const firstCard = page.locator(".product-card").first();
  await expect(firstCard.locator('a[href*="/products/"]')).toBeVisible();
  const favoriteTarget = await firstCard.getByRole("button").boundingBox();
  expect(favoriteTarget).not.toBeNull();
  expect(favoriteTarget!.width).toBeGreaterThanOrEqual(44);
  expect(favoriteTarget!.height).toBeGreaterThanOrEqual(44);
});
