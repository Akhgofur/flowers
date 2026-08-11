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
  expect(visual.topLeftRadius).toBe("20px");
  expect(visual.topRightRadius).toBe("20px");

  const firstRowHeights = await cards.evaluateAll((elements) =>
    elements.slice(0, 4).map((element) => element.getBoundingClientRect().height)
  );
  expect(Math.max(...firstRowHeights) - Math.min(...firstRowHeights)).toBeLessThanOrEqual(2);
});

test("mobile catalog has no horizontal overflow and keeps card actions tappable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/ru/catalog");

  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);

  const actionHeights = await page
    .locator(".product-card:first-child .product-card__actions button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height)
    );

  expect(actionHeights).toHaveLength(2);
  expect(actionHeights.every((height) => height >= 44)).toBe(true);
});
