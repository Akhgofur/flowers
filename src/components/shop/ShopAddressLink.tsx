import { buildMapLinks } from "@/shared/map-links";
import type { GeoPoint } from "@/shared/geo-point";

/**
 * The shop's address, opening the map when there is a pin to open.
 *
 * The pin only becomes a link once the owner has dropped it in site settings —
 * an address alone cannot be resolved to a point, and a link that went nowhere
 * would be worse than plain text.
 */

type ShopAddressLinkProps = {
  address: string;
  location?: GeoPoint;
  /** Names the link for screen readers, which cannot read the mark. */
  label: string;
  className?: string;
};

function PinMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 21.5s7-6.2 7-11.2a7 7 0 1 0-14 0c0 5 7 11.2 7 11.2z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </svg>
  );
}

export function ShopAddressLink({
  address,
  location,
  label,
  className,
}: ShopAddressLinkProps) {
  const classes = ["shop-address", className].filter(Boolean).join(" ");

  if (!location) {
    return (
      <span className={classes}>
        <PinMark />
        <span>{address}</span>
      </span>
    );
  }

  return (
    <a
      className={classes}
      href={buildMapLinks(location).yandexMaps}
      target="_blank"
      rel="noreferrer"
      aria-label={`${label}: ${address}`}
    >
      <PinMark />
      <span>{address}</span>
    </a>
  );
}
