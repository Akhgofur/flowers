export type GeoPoint = {
  latitude: number;
  longitude: number;
};

/** Roughly 11 cm at the equator. Past this the digits describe GPS noise, not a doorway. */
const COORDINATE_DECIMALS = 6;

const NUMBER_PATTERN = "[-+]?\\d{1,3}(?:[.,]\\d+)?";
const BARE_PAIR = new RegExp(`^(${NUMBER_PATTERN})[\\s;]*,?[\\s;]*(${NUMBER_PATTERN})$`);
const URL_IN_TEXT = /https?:\/\/\S+/i;
/** `/maps/@41.31,69.24,17z` and `/maps/place/Name/@41.31,69.24,17z` alike. */
const GOOGLE_PATH_PAIR = new RegExp(`@(${NUMBER_PATTERN}),(${NUMBER_PATTERN})`);

function toNumber(value: string): number {
  // A pasted decimal comma would otherwise parse as an integer and land in the wrong city.
  return Number(value.replace(",", "."));
}

export function isValidGeoPoint(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

export function roundGeoPoint(point: GeoPoint): GeoPoint {
  return {
    latitude: Number(point.latitude.toFixed(COORDINATE_DECIMALS)),
    longitude: Number(point.longitude.toFixed(COORDINATE_DECIMALS)),
  };
}

export function formatGeoPoint(point: GeoPoint): string {
  const rounded = roundGeoPoint(point);
  return `${rounded.latitude}, ${rounded.longitude}`;
}

function buildPoint(latitude: number, longitude: number): GeoPoint | null {
  const point = { latitude, longitude };
  return isValidGeoPoint(point) ? roundGeoPoint(point) : null;
}

/** Reads a `lat,lon` or `lon,lat` parameter, whichever order the service writes. */
function parsePair(value: string | null, order: "lat-lon" | "lon-lat"): GeoPoint | null {
  const match = value?.trim().match(BARE_PAIR);
  if (!match) return null;

  const first = toNumber(match[1]!);
  const second = toNumber(match[2]!);
  return order === "lat-lon" ? buildPoint(first, second) : buildPoint(second, first);
}

function parseYandexUrl(url: URL): GeoPoint | null {
  // Yandex writes longitude first in every point parameter, and latitude first in
  // `rtext` route legs. Reading one with the other's order silently mirrors the pin.
  for (const key of ["pt", "ll", "whatshere[point]"]) {
    const point = parsePair(url.searchParams.get(key), "lon-lat");
    if (point) return point;
  }

  const destination = url.searchParams.get("rtext")?.split("~").at(-1) ?? null;
  return parsePair(destination, "lat-lon");
}

function parseGoogleUrl(url: URL): GeoPoint | null {
  for (const key of ["query", "q", "daddr", "ll", "center"]) {
    const point = parsePair(url.searchParams.get(key), "lat-lon");
    if (point) return point;
  }

  const path = url.pathname.match(GOOGLE_PATH_PAIR);
  return path ? buildPoint(toNumber(path[1]!), toNumber(path[2]!)) : null;
}

function parseUrl(candidate: string): GeoPoint | null {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  // `geo:41.31,69.24?q=…` is what an Android share sheet hands over.
  if (url.protocol === "geo:") {
    return parsePair(url.pathname.split("?")[0] ?? null, "lat-lon");
  }

  const host = url.hostname.toLowerCase();
  if (host.includes("yandex")) return parseYandexUrl(url);
  if (host.includes("google") || host.includes("goo.gl")) return parseGoogleUrl(url);

  // An unknown map service still tends to name its parameters the usual way.
  return parseGoogleUrl(url) ?? parseYandexUrl(url);
}

/**
 * Accepts what a shopper can actually paste: a bare coordinate pair, or a link
 * copied from Yandex Maps, Google Maps or a phone's share sheet — including one
 * pasted inside a sentence. Returns null rather than a guess when nothing in the
 * text is a usable point, since a wrong pin sends the courier to another district.
 */
export function parseGeoPoint(value: string): GeoPoint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const bare = parsePair(trimmed, "lat-lon");
  if (bare) return bare;

  const embedded = trimmed.match(URL_IN_TEXT)?.[0] ?? trimmed;
  return parseUrl(embedded);
}
