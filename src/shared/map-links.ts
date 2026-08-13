import { roundGeoPoint, type GeoPoint } from "./geo-point";

export type MapLinks = {
  /** Opens the pin itself — the app takes over on a phone. */
  yandexMaps: string;
  /** Opens Yandex with the drop-off filled in and the taxi tab selected. */
  yandexTaxi: string;
  googleMaps: string;
};

export function buildMapLinks(point: GeoPoint): MapLinks {
  const { latitude, longitude } = roundGeoPoint(point);

  return {
    // Yandex point parameters are longitude-first; `rtext` legs are latitude-first.
    yandexMaps: `https://yandex.uz/maps/?pt=${longitude},${latitude}&ll=${longitude},${latitude}&z=17`,
    // The empty leg before `~` leaves the pick-up as wherever the phone is, so the
    // courier only has to confirm the ride the shop already addressed for them.
    yandexTaxi: `https://yandex.uz/maps/?rtext=~${latitude},${longitude}&rtt=taxi`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  };
}
