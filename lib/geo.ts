// Geographic distance, venue locations, and coordinates utility functions
export const EARTH_RADIUS_KM = 6371;

/**
 * Calculate the great-circle distance between two points on the Earth's surface in kilometers
 * using the Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  chennai: { lat: 13.0827, lng: 80.2707 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  salem: { lat: 11.6643, lng: 78.146 },
  erode: { lat: 11.341, lng: 77.7172 },
  madurai: { lat: 9.9252, lng: 78.1198 },
  trichy: { lat: 10.7905, lng: 78.7047 },
  tiruchirappalli: { lat: 10.7905, lng: 78.7047 },
  tiruppur: { lat: 11.1085, lng: 77.3411 },
  tirunelveli: { lat: 8.7139, lng: 77.7567 },
  vellore: { lat: 12.9165, lng: 79.1325 },
  thanjavur: { lat: 10.787, lng: 79.1378 },
  dindigul: { lat: 10.3673, lng: 77.9803 },
  ooty: { lat: 11.4102, lng: 76.695 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
};

/**
 * Common event venues and landmarks mapped to exact GPS coordinates
 */
export const KNOWN_VENUES: Record<string, { lat: number; lng: number; city: string }> = {
  "codissia": { lat: 11.0425, lng: 77.0375, city: "Coimbatore" },
  "codissia hall": { lat: 11.0425, lng: 77.0375, city: "Coimbatore" },
  "codissia trade fair complex": { lat: 11.0425, lng: 77.0375, city: "Coimbatore" },
  "sri varalakshmi mahal": { lat: 11.6643, lng: 78.146, city: "Salem" },
  "varalakshmi mahal": { lat: 11.6643, lng: 78.146, city: "Salem" },
  "reliance mall": { lat: 11.341, lng: 77.7172, city: "Erode" },
  "chennai trade centre": { lat: 13.0185, lng: 80.1837, city: "Chennai" },
  "jawaharlal nehru stadium": { lat: 13.0827, lng: 80.2707, city: "Chennai" },
  "express avenue": { lat: 13.0587, lng: 80.2642, city: "Chennai" },
  "phoenix marketcity": { lat: 12.9925, lng: 80.217, city: "Chennai" },
  "brookefields mall": { lat: 11.0118, lng: 76.9582, city: "Coimbatore" },
  "prozone mall": { lat: 11.0558, lng: 77.0006, city: "Coimbatore" },
  "race course": { lat: 11.0068, lng: 76.974, city: "Coimbatore" },
  "tidel park": { lat: 12.9897, lng: 80.2486, city: "Chennai" },
  "le meridien": { lat: 13.0067, lng: 80.2033, city: "Chennai" },
  "itc grand chola": { lat: 13.0105, lng: 80.2206, city: "Chennai" },
};

/**
 * Returns estimated coordinates for a city name, or null if unknown
 */
export function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  if (!city) return null;
  const c = city.trim().toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (c.includes(key) || key.includes(c)) {
      return coords;
    }
  }
  return null;
}

/**
 * Returns the exact coordinates for a known venue, falling back to its city coordinates
 */
export function getVenueCoordinates(venue: string, city?: string): { lat: number; lng: number } | null {
  if (!venue) return city ? getCityCoordinates(city) : null;
  const v = venue.trim().toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_VENUES)) {
    if (v.includes(key) || key.includes(v)) {
      return { lat: coords.lat, lng: coords.lng };
    }
  }
  if (city) {
    return getCityCoordinates(city);
  }
  return null;
}

/**
 * Formats a distance in kilometers into a human-readable string
 */
export function formatDistance(km: number | null | undefined): string {
  if (km == null || isNaN(km)) return "Distance unknown";
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m away`;
  }
  return `${km.toFixed(1)} km away`;
}
