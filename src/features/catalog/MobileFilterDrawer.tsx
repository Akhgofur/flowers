"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useFocusTrap } from "@/shared/a11y/useFocusTrap";
import type { CatalogFilters as CatalogFilterState } from "@/shared/types";
import { CatalogFilters } from "./CatalogFilters";

export type MobileFilterDrawerProps = {
  filters: CatalogFilterState;
  onChange: (filters: CatalogFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  priceCeiling?: number | null;
};

export function MobileFilterDrawer({
  filters,
  onChange,
  onApply,
  onReset,
  priceCeiling,
}: MobileFilterDrawerProps) {
  const t = useTranslations("Catalog");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useFocusTrap({
    active: open,
    containerRef: dialogRef,
    initialFocusRef: closeRef,
    restoreFocusTarget: triggerRef.current,
    onEscape: () => setOpen(false),
  });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="mobile-filter-control">
      <button
        ref={triggerRef}
        className="mobile-filter-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="mobile-filter-dialog"
        onClick={() => setOpen(true)}
      >
        <span>{t("filtersTitle")}</span>
        <span aria-hidden="true">⌘</span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
        <div className="mobile-filter-backdrop" onMouseDown={() => setOpen(false)}>
          <div
            ref={dialogRef}
            id="mobile-filter-dialog"
            className="mobile-filter-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">{t("kicker")}</p>
                <h2 id="mobile-filter-title">{t("filtersTitle")}</h2>
              </div>
              <button
                ref={closeRef}
                className="overlay-close-button"
                type="button"
                aria-label={t("closeFilters")}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <CatalogFilters
              headingId="mobile-catalog-filters-title"
              filters={filters}
              priceCeiling={priceCeiling}
              onChange={onChange}
              onApply={() => {
                onApply();
                setOpen(false);
              }}
              onReset={onReset}
            />
          </div>
        </div>,
        document.body
        )
        : null}
    </div>
  );
}
