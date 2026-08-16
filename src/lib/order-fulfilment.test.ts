import { describe, expect, it } from "vitest";
import { FULFILMENT_METHODS } from "@/lib/contracts";
import { resolveFulfilment } from "./order-fulfilment";

describe("resolveFulfilment", () => {
  it("keeps a stored method that the schema allows", () => {
    expect(resolveFulfilment("delivery")).toBe("delivery");
    expect(resolveFulfilment("pickup")).toBe("pickup");
  });

  it("reads an order written before the field existed as a delivery", () => {
    // Every order read uses .lean(), which does not apply schema defaults, so
    // the field arrives undefined rather than as "delivery".
    expect(resolveFulfilment(undefined)).toBe("delivery");
    expect(resolveFulfilment(null)).toBe("delivery");
  });

  it("falls back rather than trusting an unknown value", () => {
    expect(resolveFulfilment("courier")).toBe("delivery");
    expect(resolveFulfilment("")).toBe("delivery");
  });

  it("offers exactly the two methods", () => {
    expect(FULFILMENT_METHODS).toEqual(["delivery", "pickup"]);
  });
});
