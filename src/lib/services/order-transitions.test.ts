import { describe, expect, it } from "vitest";
import {
  InvalidOrderTransitionError,
  assertAllowedOrderTransition,
  canTransitionOrder,
} from "./order-transitions";

describe("order transition policy", () => {
  it("allows only the declared forward lifecycle", () => {
    expect(canTransitionOrder("pending", "confirmed")).toBe(true);
    expect(canTransitionOrder("preparing", "delivering")).toBe(true);
    expect(canTransitionOrder("delivering", "delivered")).toBe(true);
    expect(canTransitionOrder("confirmed", "pending")).toBe(false);
    expect(canTransitionOrder("delivered", "cancelled")).toBe(false);
  });

  it("rejects invalid and terminal-state transitions with a public-safe conflict", () => {
    expect(() => assertAllowedOrderTransition("pending", "delivered")).toThrow(
      InvalidOrderTransitionError
    );
    expect(() => assertAllowedOrderTransition("cancelled", "confirmed")).toThrow(
      expect.objectContaining({ code: "ORDER_TRANSITION_INVALID", status: 409 })
    );
  });
});
