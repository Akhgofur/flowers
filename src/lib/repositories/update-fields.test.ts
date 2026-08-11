import { describe, expect, it } from "vitest";
import { setAndUnsetOptionalFields } from "./update-fields";

describe("setAndUnsetOptionalFields", () => {
  it("keeps defined values and explicitly clears omitted optional fields", () => {
    expect(
      setAndUnsetOptionalFields(
        { name: "Floraluxe", seoTitle: undefined, deliveryFee: 20_000 },
        ["seoTitle", "seoDescription"]
      )
    ).toEqual({
      $set: { name: "Floraluxe", deliveryFee: 20_000 },
      $unset: { seoTitle: "", seoDescription: "" },
    });
  });

  it("does not issue an empty $unset document", () => {
    expect(
      setAndUnsetOptionalFields({ name: "Floraluxe", seoTitle: "Gullar" }, ["seoTitle"])
    ).toEqual({ $set: { name: "Floraluxe", seoTitle: "Gullar" } });
  });
});
