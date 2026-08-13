import { describe, expect, it } from "vitest";
import { parseGeoPoint } from "./geo-point";
import { buildMapLinks } from "./map-links";

const TASHKENT = { latitude: 41.311081, longitude: 69.240562 };

describe("buildMapLinks", () => {
  it("points Yandex at the pin longitude-first and the ride latitude-first", () => {
    const links = buildMapLinks(TASHKENT);

    expect(links.yandexMaps).toContain("pt=69.240562,41.311081");
    expect(links.yandexTaxi).toContain("rtext=~41.311081,69.240562");
    // The taxi tab is the whole point: the operator orders the ride from here.
    expect(links.yandexTaxi).toContain("rtt=taxi");
    expect(links.googleMaps).toContain("query=41.311081,69.240562");
  });

  /** A link that cannot be read back is a link that sends someone to the wrong door. */
  it("produces links that parse back to the same point", () => {
    const links = buildMapLinks(TASHKENT);

    expect(parseGeoPoint(links.yandexMaps)).toEqual(TASHKENT);
    expect(parseGeoPoint(links.yandexTaxi)).toEqual(TASHKENT);
    expect(parseGeoPoint(links.googleMaps)).toEqual(TASHKENT);
  });

  it("rounds before building so raw GPS output cannot bloat the link", () => {
    const links = buildMapLinks({ latitude: 41.31108123456, longitude: 69.2405621234 });

    expect(links.googleMaps).toContain("query=41.311081,69.240562");
  });
});
