"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { roundGeoPoint, type GeoPoint } from "@/shared/geo-point";

/** Tashkent: the shop's own city, so an unset map still opens where deliveries happen. */
const DEFAULT_CENTER: GeoPoint = { latitude: 41.311081, longitude: 69.240562 };
const CITY_ZOOM = 12;
/** Close enough to tell one entrance from the next. */
const PIN_ZOOM = 16;

/**
 * Leaflet's packaged marker points at image files by relative URL, which a bundler
 * rewrites out from under it. Drawing the pin in CSS keeps it an asset-free element.
 */
const PIN_ICON = L.divIcon({
  className: "checkout-map__pin",
  html: '<span aria-hidden="true"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

type LocationMapProps = {
  value: GeoPoint | null;
  onChange: (point: GeoPoint) => void;
  /** Names the map for screen readers, which cannot use the pin itself. */
  label: string;
};

function toGeoPoint(latLng: L.LatLng): GeoPoint {
  return roundGeoPoint({ latitude: latLng.lat, longitude: latLng.lng });
}

export function LocationMap({ value, onChange, label }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // The map is built once and lives outside React's render cycle, so it must read
  // the current handler at event time rather than close over the one it mounted with.
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const start = value ?? DEFAULT_CENTER;
    const map = L.map(container, {
      center: [start.latitude, start.longitude],
      zoom: value ? PIN_ZOOM : CITY_ZOOM,
      // Checkout is a long scrolling form. A wheel that zoomed the map instead of
      // the page would trap the shopper halfway through it.
      scrollWheelZoom: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onChangeRef.current(toGeoPoint(event.latlng));
    });

    // The container is measured on mount, but a panel that animates or lays out a
    // frame later leaves Leaflet with stale dimensions and half the tiles missing.
    const resized = requestAnimationFrame(() => map.invalidateSize());

    mapRef.current = map;

    return () => {
      cancelAnimationFrame(resized);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Mount-only: later `value` changes are applied by the sync effect below, which
    // moves the existing pin instead of rebuilding the map under the shopper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const latLng: L.LatLngTuple = [value.latitude, value.longitude];
    const existing = markerRef.current;

    if (existing) {
      existing.setLatLng(latLng);
      // Recentring on every update would yank the map away mid-drag, so it only
      // follows a point that arrived from elsewhere — geolocation or a pasted link.
      if (!map.getBounds().pad(-0.2).contains(latLng)) {
        map.setView(latLng, Math.max(map.getZoom(), PIN_ZOOM));
      }
      return;
    }

    const marker = L.marker(latLng, { draggable: true, icon: PIN_ICON, title: label });
    marker.on("dragend", () => {
      onChangeRef.current(toGeoPoint(marker.getLatLng()));
    });
    marker.addTo(map);
    markerRef.current = marker;
    map.setView(latLng, Math.max(map.getZoom(), PIN_ZOOM));
  }, [label, value]);

  return (
    <div
      ref={containerRef}
      className="checkout-map"
      role="application"
      aria-label={label}
    />
  );
}
