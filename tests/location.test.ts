import { describe, expect, it } from "vitest";
import { haversineDistanceKm, geocodeWithPhoton } from "../lib/location";

describe("Location & Distance Utilities", () => {
  it("computes 0 km for identical coordinates", () => {
    const dist = haversineDistanceKm(13.0827, 80.2707, 13.0827, 80.2707);
    expect(dist).toBe(0);
  });

  it("calculates accurate distance between Chennai locations (Central to Velachery)", () => {
    // Chennai Central: 13.0827, 80.2707
    // Velachery: 12.9815, 80.2180
    const dist = haversineDistanceKm(13.0827, 80.2707, 12.9815, 80.218);
    // Real-world straight line distance is ~12.6 km
    expect(dist).toBeGreaterThan(10);
    expect(dist).toBeLessThan(15);
  });

  it("evaluates radius filtering correctly", () => {
    // Distance from T. Nagar (13.0418, 80.2341) to Phoenix Marketcity (12.9915, 80.2170)
    const dist = haversineDistanceKm(13.0418, 80.2341, 12.9915, 80.217);
    expect(dist).toBeLessThan(10); // ~5.8 km

    // Worker with 5 km radius: false
    expect(dist <= 5).toBe(false);
    // Worker with 10 km radius: true
    expect(dist <= 10).toBe(true);
    // Worker with 15 km radius: true
    expect(dist <= 15).toBe(true);
  });

  it("geocodes known locations with fallback support", async () => {
    const result = await geocodeWithPhoton("T. Nagar, Chennai");
    expect(result).not.toBeNull();
    if (result) {
      expect(result.latitude).toBeCloseTo(13.04, 1);
      expect(result.longitude).toBeCloseTo(80.23, 1);
    }
  });
});
