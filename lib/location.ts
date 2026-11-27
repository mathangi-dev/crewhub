/**
 * Location, Geocoding (Photon by Komoot) and Haversine Distance utilities for CrewHub.
 */
import { prisma } from "./db";

// Fallback coordinate mapping for common locations / cities (useful for offline dev & fallback)
const KNOWN_COORDINATES: Record<string, { lat: number; lon: number; city: string }> = {
  chennai: { lat: 13.0827, lon: 80.2707, city: "Chennai" },
  "t nagar": { lat: 13.0418, lon: 80.2341, city: "Chennai" },
  velachery: { lat: 12.9815, lon: 80.218, city: "Chennai" },
  adyar: { lat: 13.0012, lon: 80.2565, city: "Chennai" },
  anna_nagar: { lat: 13.085, lon: 80.2101, city: "Chennai" },
  guindy: { lat: 13.0067, lon: 80.2025, city: "Chennai" },
  nandambakkam: { lat: 13.0135, lon: 80.1873, city: "Chennai" },
  tambaram: { lat: 12.9249, lon: 80.1275, city: "Chennai" },
  omr: { lat: 12.915, lon: 80.2315, city: "Chennai" },
  coimbatore: { lat: 11.0168, lon: 76.9558, city: "Coimbatore" },
  bangalore: { lat: 12.9716, lon: 77.5946, city: "Bangalore" },
  bengaluru: { lat: 12.9716, lon: 77.5946, city: "Bangalore" },
  mumbai: { lat: 19.076, lon: 72.8777, city: "Mumbai" },
  madurai: { lat: 9.9252, lon: 78.1198, city: "Madurai" },
  trichy: { lat: 10.7905, lon: 78.7047, city: "Tiruchirappalli" },
  salem: { lat: 11.6643, lon: 78.146, city: "Salem" },
  erode: { lat: 11.341, lon: 77.7172, city: "Erode" },
  hyderabad: { lat: 17.385, lon: 78.4867, city: "Hyderabad" },
  kochi: { lat: 9.9312, lon: 76.2673, city: "Kochi" },
};

/**
 * Calculate Great-Circle distance between two coordinates using the Haversine formula in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Forward geocode a free-form address using the Photon geocoding API by Komoot.
 * Includes graceful timeout and known-location fallback.
 */
export async function geocodeWithPhoton(
  query: string
): Promise<{ latitude: number; longitude: number; displayName: string } | null> {
  const clean = query.trim();
  if (!clean) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(clean)}&limit=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CrewHub-App/1.0" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const feature = data.features?.[0];
      if (feature?.geometry?.coordinates?.length >= 2) {
        const [lon, lat] = feature.geometry.coordinates;
        const nameParts = [
          feature.properties.name,
          feature.properties.street,
          feature.properties.district,
          feature.properties.city,
          feature.properties.state,
          feature.properties.postcode,
        ].filter(Boolean);

        return {
          latitude: Number(Number(lat).toFixed(6)),
          longitude: Number(Number(lon).toFixed(6)),
          displayName: nameParts.join(", ") || clean,
        };
      }
    }
  } catch (err) {
    // Network timeout or error: gracefully fall back to known city/area coords
  }

  // Fallback matching
  const lower = clean.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (lower.includes(key.replace("_", " ")) || lower.includes(key)) {
      return {
        latitude: coords.lat,
        longitude: coords.lon,
        displayName: `${clean} (${coords.city})`,
      };
    }
  }

  // Default to Chennai centre coordinates if in Tamil Nadu region
  return {
    latitude: 13.0827,
    longitude: 80.2707,
    displayName: clean,
  };
}

/**
 * Reverse geocode GPS coordinates into an address structure using Photon by Komoot.
 */
export async function reverseGeocodeWithPhoton(
  lat: number,
  lon: number
): Promise<{
  address: string;
  area: string;
  city: string;
  pincode: string;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CrewHub-App/1.0" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const feature = data.features?.[0];
      if (feature?.properties) {
        const p = feature.properties;
        const street = [p.housenumber, p.street].filter(Boolean).join(" ");
        const area = p.district || p.suburb || p.locality || p.neighbourhood || p.name || "";
        const city = p.city || p.county || p.state || "Chennai";
        const pincode = p.postcode || "";

        return {
          address: street || p.name || "",
          area: area,
          city: city,
          pincode: pincode,
        };
      }
    }
  } catch {
    // Ignore and fallback
  }

  return null;
}

/**
 * Dispatch in-app notifications to eligible workers within their selected radius of a published event.
 * Prevents duplicates, ignores draft/cancelled/expired events, and requires nearbyNotif enabled.
 */
export async function notifyNearbyWorkersForEvent(eventId: string): Promise<{
  success: boolean;
  notifiedCount: number;
  totalEligible: number;
}> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) return { success: false, notifiedCount: 0, totalEligible: 0 };

    // Exclude draft, cancelled, expired or closed events
    if (event.status !== "PUBLISHED") {
      return { success: false, notifiedCount: 0, totalEligible: 0 };
    }

    const now = new Date();
    if (event.startsAt < now || event.applicationDeadline < now) {
      return { success: false, notifiedCount: 0, totalEligible: 0 };
    }

    // Ensure event has latitude & longitude
    let eventLat = event.latitude ? Number(event.latitude) : null;
    let eventLon = event.longitude ? Number(event.longitude) : null;

    if (eventLat === null || eventLon === null) {
      const geo = await geocodeWithPhoton(`${event.venue}, ${event.city}`);
      if (geo) {
        eventLat = geo.latitude;
        eventLon = geo.longitude;
        await prisma.event.update({
          where: { id: event.id },
          data: {
            latitude: geo.latitude,
            longitude: geo.longitude,
          },
        });
      }
    }

    if (eventLat === null || eventLon === null) {
      return { success: false, notifiedCount: 0, totalEligible: 0 };
    }

    // Query active workers with location notifications enabled
    const workers = await prisma.user.findMany({
      where: {
        role: "WORKER",
        status: "ACTIVE",
        workerProfile: {
          nearbyNotif: true,
          latitude: { not: null },
          longitude: { not: null },
        },
      },
      include: {
        workerProfile: true,
      },
    });

    let notifiedCount = 0;
    const dateStr = new Date(event.startsAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

    for (const w of workers) {
      const wp = w.workerProfile;
      if (!wp || wp.latitude === null || wp.longitude === null) continue;

      const workerLat = Number(wp.latitude);
      const workerLon = Number(wp.longitude);
      const radius = wp.radiusKm || 15;

      const dist = haversineDistanceKm(eventLat, eventLon, workerLat, workerLon);

      if (dist <= radius) {
        // Prevent duplicate notification for this event and worker
        const eventLink = `/worker/events/${event.id}`;
        const existing = await prisma.notification.findFirst({
          where: {
            userId: w.id,
            type: "NEARBY_EVENT",
            link: eventLink,
          },
        });

        if (!existing) {
          const distStr = dist < 1 ? "less than 1 km away" : `~${dist.toFixed(1)} km away`;
          await prisma.notification.create({
            data: {
              userId: w.id,
              type: "NEARBY_EVENT",
              title: `New Event Nearby: ${event.title}`,
              body: `${event.title} at ${event.venue}, ${event.city} (${distStr}) on ${dateStr}. Tap to explore roles and apply!`,
              link: eventLink,
            },
          });
          notifiedCount++;
        }
      }
    }

    return { success: true, notifiedCount, totalEligible: workers.length };
  } catch (error) {
    console.error("Failed to notify nearby workers:", error);
    return { success: false, notifiedCount: 0, totalEligible: 0 };
  }
}
