import type { OrderStatus } from "@/lib/contracts";
import { allowedOrderTransitions } from "@/lib/contracts";

export class InvalidOrderTransitionError extends Error {
  readonly code = "ORDER_TRANSITION_INVALID";
  readonly status = 409;

  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Order cannot transition from ${from} to ${to}.`);
    this.name = "InvalidOrderTransitionError";
  }
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return allowedOrderTransitions[from].includes(to);
}

export function assertAllowedOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new InvalidOrderTransitionError(from, to);
  }
}
