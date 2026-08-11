import { expect, test } from "@playwright/test";

test("defaults to Russian and keeps public pathnames in English", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ru$/);

  await page.goto("/ru/catalog");
  const productLink = page.locator('main a[href*="/products/"]').first();
  await expect(productLink).toHaveAttribute("href", /\/ru\/products\/[a-z0-9-]+$/);

  await productLink.click();
  await expect(page).toHaveURL(/\/ru\/products\/[a-z0-9-]+$/);
  await expect(page.locator(".product-detail__image-frame")).toHaveCSS(
    "border-radius",
    "0px"
  );
});

test("mobile catalog filter is modal and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru/catalog");

  const filterTrigger = page.getByRole("button", { name: "Фильтры", exact: true });
  await filterTrigger.click();

  await expect(page.getByRole("dialog", { name: "Фильтры" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Фильтры" })).toBeHidden();
  await expect(filterTrigger).toBeFocused();

  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});

test("sticky header compacts and mobile cart stays above bottom navigation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/ru/catalog");
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect(page.locator(".site-header")).toHaveClass(/site-header--compact/);

  const cartTrigger = page.getByRole("button", { name: /Открыть корзину/ }).first();
  await cartTrigger.click();
  const dialog = page.getByRole("dialog", { name: "Корзина" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  const layers = await page.evaluate(() => ({
    cart: Number(getComputedStyle(document.querySelector(".cart-drawer-backdrop")!).zIndex),
    bottomNav: Number(getComputedStyle(document.querySelector(".mobile-bottom-nav")!).zIndex),
  }));
  expect(layers.cart).toBeGreaterThan(layers.bottomNav);
});
