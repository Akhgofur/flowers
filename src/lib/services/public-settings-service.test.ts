import { describe, expect, it } from "vitest";
import { getDefaultPublicSiteSettings } from "./public-settings-service";

describe("Floraluxe public settings defaults", () => {
  it("uses Floraluxe identity and both supplied logo roles", () => {
    const settings = getDefaultPublicSiteSettings("ru");

    expect(settings.siteName).toBe("Floraluxe");
    expect(settings.brandLogo?.url).toBe("/brand/floraluxe-logo.jpg");
    expect(settings.brandMark?.url).toBe("/brand/floraluxe-mark.jpg");
  });
});
