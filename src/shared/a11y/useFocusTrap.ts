import { useLayoutEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "iframe",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const ALWAYS_RESTORE_FOCUS = () => true;

type UseFocusTrapOptions = {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
  restoreFocusTarget: HTMLElement | null;
  shouldRestoreFocus?: () => boolean;
  onEscape: () => void;
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.tabIndex >= 0
  );
}

export function useFocusTrap({
  active,
  containerRef,
  initialFocusRef,
  restoreFocusTarget,
  shouldRestoreFocus = ALWAYS_RESTORE_FOCUS,
  onEscape,
}: UseFocusTrapOptions) {
  const originRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    originRef.current =
      restoreFocusTarget ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    (initialFocusRef.current ?? getFocusableElements(container)[0] ?? container).focus({
      preventScroll: true,
    });

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onEscape();
        return;
      }

      if (event.key !== "Tab") return;

      const activeContainer = containerRef.current;
      if (!activeContainer) return;

      const focusableElements = getFocusableElements(activeContainer);
      if (focusableElements.length === 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        activeContainer.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const focusIsInside = activeContainer.contains(activeElement);
      const shouldWrapBackward =
        event.shiftKey && (!focusIsInside || activeElement === firstElement);
      const shouldWrapForward =
        !event.shiftKey && (!focusIsInside || activeElement === lastElement);

      if (!shouldWrapBackward && !shouldWrapForward) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      (event.shiftKey ? lastElement : firstElement).focus({
        preventScroll: true,
      });
    };

    document.addEventListener("keydown", trapFocus, true);
    return () => {
      document.removeEventListener("keydown", trapFocus, true);
      const origin = originRef.current;
      originRef.current = null;

      // The parent removes its inert background during the same commit. Restore
      // after that commit so the opener is focusable in browsers that enforce inert.
      queueMicrotask(() => {
        if (shouldRestoreFocus() && origin?.isConnected) {
          origin.focus({ preventScroll: true });
        }
      });
    };
  }, [
    active,
    containerRef,
    initialFocusRef,
    onEscape,
    restoreFocusTarget,
    shouldRestoreFocus,
  ]);
}
