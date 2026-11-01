import { db } from "@/lib/db";
import { haversineDistance, getCityCoordinates, getVenueCoordinates } from "@/lib/geo";

/**
 * Dispatches in-app notifications to all volunteers residing or located within
 * the event's notification radius (set by organizer, e.g. 10–20 km).
 * Note: Distance is strictly computed from the EVENT VENUE location, NOT the organizer's personal device location.
 */
export async function dispatchNearbyEventNotifications(eventId: string): Promise<number> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { organizer: true },
  });

  if (!event) return 0;

  // Determine event coordinates strictly from Venue and City
  let eventLat = event.latitude;
  let eventLng = event.longitude;

  if (eventLat == null || eventLng == null) {
    const venueCoords = getVenueCoordinates(event.venue, event.city);
    if (venueCoords) {
      eventLat = venueCoords.lat;
      eventLng = venueCoords.lng;
      // Persist venue coordinates to event if missing
      await db.event.update({
        where: { id: eventId },
        data: { latitude: eventLat, longitude: eventLng },
      });
    }
  }

  if (eventLat == null || eventLng == null) {
    console.warn(`[LiveTracking] Cannot notify: No coordinates for event ${eventId} (${event.city})`);
    return 0;
  }

  const radiusKm = event.radiusKm || 20;

  // Get all active volunteers
  const volunteers = await db.user.findMany({
    where: {
      role: "VOLUNTEER",
      suspended: false,
    },
    select: {
      id: true,
      name: true,
      city: true,
      latitude: true,
      longitude: true,
    },
  });

  let notifiedCount = 0;

  for (const vol of volunteers) {
    // Get volunteer position from live GPS or city fallback
    let volLat = vol.latitude;
    let volLng = vol.longitude;

    if (volLat == null || volLng == null) {
      const cityCoords = getCityCoordinates(vol.city);
      if (cityCoords) {
        volLat = cityCoords.lat;
        volLng = cityCoords.lng;
      }
    }

    if (volLat == null || volLng == null) continue;

    const distance = haversineDistance(eventLat, eventLng, volLat, volLng);

    if (distance <= radiusKm) {
      // Check if already notified for this event
      const existing = await db.notification.findFirst({
        where: {
          userId: vol.id,
          eventId: event.id,
        },
      });

      if (!existing) {
        await db.notification.create({
          data: {
            userId: vol.id,
            eventId: event.id,
            title: `📍 New Nearby Event: ${event.title}`,
            message: `Event at ${event.venue}, ${event.city} (~${distance.toFixed(1)} km away). Tap to view and apply!`,
            link: `/volunteer/events/${event.id}`,
            distance: Math.round(distance * 10) / 10,
          },
        });
        notifiedCount++;
      }
    }
  }

  return notifiedCount;
}

/**
 * Dispatches an in-app notification to all active ADMIN users.
 */
export async function notifyAdmins(data: {
  title: string;
  message: string;
  link?: string;
  eventId?: string;
}): Promise<number> {
  const admins = await db.user.findMany({
    where: {
      role: "ADMIN",
      suspended: false,
    },
    select: { id: true },
  });

  if (!admins.length) return 0;

  for (const admin of admins) {
    await db.notification.create({
      data: {
        userId: admin.id,
        title: data.title,
        message: data.message,
        link: data.link ?? null,
        eventId: data.eventId ?? null,
      },
    });
  }

  return admins.length;
}

/**
 * Dispatches an in-app notification to a specific user.
 */
export async function notifyUser(data: {
  userId: string;
  title: string;
  message: string;
  link?: string;
  eventId?: string;
}): Promise<void> {
  await db.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      message: data.message,
      link: data.link ?? null,
      eventId: data.eventId ?? null,
    },
  });
}
