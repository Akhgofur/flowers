import { describe, expect, it } from "vitest";
import { setAndUnsetOptionalFields } from "./update-fields";

describe("setAndUnsetOptionalFields", () => {
  it("keeps defined values and explicitly clears omitted optional fields", () => {
    expect(
      setAndUnsetOptionalFields(
        { name: "Nafis", seoTitle: undefined, deliveryFee: 20_000 },
        ["seoTitle", "seoDescription"]
      )
    ).toEqual({
      $set: { name: "Nafis", deliveryFee: 20_000 },
      $unset: { seoTitle: "", seoDescription: "" },
    });
  });

  it("does not issue an empty $unset document", () => {
    expect(
      setAndUnsetOptionalFields({ name: "Nafis", seoTitle: "Gullar" }, ["seoTitle"])
    ).toEqual({ $set: { name: "Nafis", seoTitle: "Gullar" } });
  });
});
