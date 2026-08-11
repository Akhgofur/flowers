import { beforeEach, describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.floraluxe.uz";
  });

  it("allows public pages and blocks admin and API crawlers", () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/*/checkout"],
      },
      sitemap: "https://shop.floraluxe.uz/sitemap.xml",
    });
  });
});
