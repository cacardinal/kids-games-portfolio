import { describe, it, expect } from "vitest";
import { COUNTRIES, COUNTRY_BY_ISO3, ISO3_TO_ISON3 } from "../data/countries";
import { LANDMARKS } from "../data/landmarks";
import { ROUTES } from "../data/routes";
import { MISSIONS } from "../data/missions";
import { TOPO_ISON3_SET, FEATURE_BY_ISON3 } from "../data/atlas";

// REQUIRED SUITE #1 — Data integrity. The critical one: every reference resolves,
// every isoN3 exists in the bundled topojson, every waypoint exists in data/.
describe("data integrity", () => {
  it("has exactly 45 countries with unique iso3 and isoN3", () => {
    expect(COUNTRIES.length).toBe(45);
    expect(new Set(COUNTRIES.map((c) => c.iso3)).size).toBe(45);
    expect(new Set(COUNTRIES.map((c) => c.isoN3)).size).toBe(45);
  });

  it("every country's isoN3 exists in the bundled topojson AND has a feature", () => {
    for (const c of COUNTRIES) {
      expect(TOPO_ISON3_SET.has(c.isoN3), `${c.iso3} (${c.isoN3}) missing from topojson`).toBe(true);
      expect(FEATURE_BY_ISON3[c.isoN3], `${c.iso3} has no feature`).toBeTruthy();
    }
  });

  it("isoN3 strings are zero-padded to 3 chars", () => {
    for (const c of COUNTRIES) {
      expect(c.isoN3).toMatch(/^\d{3}$/);
    }
  });

  it("has 24 landmarks, each pointing to a country in the set", () => {
    expect(LANDMARKS.length).toBe(24);
    expect(new Set(LANDMARKS.map((l) => l.id)).size).toBe(24);
    for (const l of LANDMARKS) {
      expect(COUNTRY_BY_ISO3[l.countryIso3], `${l.id} → unknown country ${l.countryIso3}`).toBeTruthy();
      expect(l.name.length).toBeGreaterThan(0);
      expect(l.blurb.length).toBeGreaterThan(0);
    }
  });

  it("DIRECTOR AMENDMENT: Borobudur (IDN) is present; Riyadh Towers (SAU) is gone", () => {
    const ids = LANDMARKS.map((l) => l.id);
    expect(ids).toContain("lm-borobudur");
    expect(ids).not.toContain("lm-desert-towers");
    const boro = LANDMARKS.find((l) => l.id === "lm-borobudur")!;
    expect(boro.countryIso3).toBe("IDN");
    expect(boro.name).toBe("Borobudur");
    // IDN must resolve to a real topojson feature for the replacement to be valid.
    expect(FEATURE_BY_ISON3[ISO3_TO_ISON3["IDN"]]).toBeTruthy();
  });

  it("has 6 routes; every waypoint exists in the country set", () => {
    expect(ROUTES.length).toBe(6);
    for (const r of ROUTES) {
      expect(r.waypoints.length).toBeGreaterThanOrEqual(2);
      for (const wp of r.waypoints) {
        expect(COUNTRY_BY_ISO3[wp], `route ${r.id} → unknown waypoint ${wp}`).toBeTruthy();
      }
    }
  });

  it("has 18 missions, 6 per region, with the right type mix", () => {
    expect(MISSIONS.length).toBe(18);
    for (const region of ["americas", "europe-africa", "asia-oceania"] as const) {
      const ms = MISSIONS.filter((m) => m.region === region);
      expect(ms.length, `${region} count`).toBe(6);
      const byType = (t: string) => ms.filter((m) => m.type === t).length;
      expect(byType("locate")).toBe(2);
      expect(byType("landmark")).toBe(2);
      expect(byType("route")).toBe(1);
      expect(byType("compare")).toBe(1);
    }
  });

  it("every mission reference resolves (locate answer, landmark, route, compare pair)", () => {
    const landmarkIds = new Set(LANDMARKS.map((l) => l.id));
    const routeIds = new Set(ROUTES.map((r) => r.id));
    for (const m of MISSIONS) {
      expect(m.fact.length, `${m.id} missing fact`).toBeGreaterThan(0);
      if (m.type === "locate") {
        expect(COUNTRY_BY_ISO3[m.answerIso3], `${m.id} → unknown answer ${m.answerIso3}`).toBeTruthy();
        expect(m.prompt.length).toBeGreaterThan(0);
      } else if (m.type === "landmark") {
        expect(landmarkIds.has(m.landmarkId), `${m.id} → unknown landmark ${m.landmarkId}`).toBe(true);
      } else if (m.type === "route") {
        expect(routeIds.has(m.routeId), `${m.id} → unknown route ${m.routeId}`).toBe(true);
      } else {
        expect(COUNTRY_BY_ISO3[m.aIso3], `${m.id} → unknown ${m.aIso3}`).toBeTruthy();
        expect(COUNTRY_BY_ISO3[m.bIso3], `${m.id} → unknown ${m.bIso3}`).toBeTruthy();
      }
    }
  });

  it("every country has a capital, a signature, and at least one fact", () => {
    for (const c of COUNTRIES) {
      expect(c.capital.length, `${c.iso3} capital`).toBeGreaterThan(0);
      expect(c.signature.length, `${c.iso3} signature`).toBeGreaterThan(0);
      expect(c.facts.length, `${c.iso3} facts`).toBeGreaterThanOrEqual(1);
      expect(c.population).toBeGreaterThan(0);
      expect(c.areaKm2).toBeGreaterThan(0);
    }
  });
});
