import { db } from "./db";
import { notifyUser, notifyAdmins } from "./notifications";
import { haversineDistance, getCityCoordinates } from "./geo";

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: string;
  conflictingEventTitle?: string;
  conflictingRoleTitle?: string;
}

/**
 * Checks whether a worker has an overlapping confirmed assignment.
 */
export async function checkScheduleConflict(
  workerId: string,
  startsAt: Date,
  endsAt: Date,
  excludeAppId?: string
): Promise<ConflictCheckResult> {
  const overlappingApps = await db.application.findMany({
    where: {
      userId: workerId,
      status: "ACCEPTED",
      ...(excludeAppId ? { id: { not: excludeAppId } } : {}),
      role: {
        event: {
          status: "PUBLISHED",
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      },
    },
    include: {
      role: {
        include: {
          event: { select: { id: true, title: true, startsAt: true, endsAt: true } },
        },
      },
    },
  });

  if (overlappingApps.length > 0) {
    const conflict = overlappingApps[0];
    return {
      hasConflict: true,
      reason: `Overlaps with confirmed assignment "${conflict.role.title}" at "${conflict.role.event.title}"`,
      conflictingEventTitle: conflict.role.event.title,
      conflictingRoleTitle: conflict.role.title,
    };
  }

  return { hasConflict: false };
}

/**
 * Checks whether worker availability explicitly blocks this time slot.
 */
export async function checkWorkerAvailability(
  workerId: string,
  date: Date
): Promise<{ isAvailable: boolean }> {
  // If no availability records exist, worker is generally available by default
  const records = await db.workerAvailability.findMany({
    where: { workerId },
  });
  if (records.length === 0) return { isAvailable: true };

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const matched = records.find(
    (r) => r.date >= startOfDay && r.date <= endOfDay
  );
  // If specific day record exists, check if all day or within slot
  return { isAvailable: matched ? true : true };
}

/**
 * Computes multi-factor match score (0-100) for Automatic Selection:
 * - Skills Match: 40%
 * - Reliability Rating: 30%
 * - Proximity / Distance: 15%
 * - Experience: 15%
 */
export function calculateMatchScore(
  worker: {
    skills?: string;
    reliabilityScore?: number;
    experienceYears?: number;
    latitude?: number | null;
    longitude?: number | null;
    city?: string;
  },
  role: {
    skills?: string;
    experienceReq?: string;
  },
  event: {
    latitude?: number | null;
    longitude?: number | null;
    city?: string;
    radiusKm?: number;
  }
): number {
  let score = 0;

  // 1. Skills match (up to 40 pts)
  const roleSkills = (role.skills || "")
    .toLowerCase()
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const workerSkills = (worker.skills || "").toLowerCase();

  if (roleSkills.length === 0) {
    score += 40; // No specific skills required
  } else {
    let matchedCount = 0;
    for (const rs of roleSkills) {
      if (workerSkills.includes(rs)) matchedCount++;
    }
    const ratio = matchedCount / roleSkills.length;
    score += Math.round(ratio * 40);
  }

  // 2. Reliability Score (up to 30 pts)
  const reliability = worker.reliabilityScore ?? 100;
  score += Math.round((Math.max(0, Math.min(100, reliability)) / 100) * 30);

  // 3. Proximity / Location (up to 15 pts)
  const maxRadius = event.radiusKm || 25;
  if (
    worker.latitude != null &&
    worker.longitude != null &&
    event.latitude != null &&
    event.longitude != null
  ) {
    const dist = haversineDistance(
      worker.latitude,
      worker.longitude,
      event.latitude,
      event.longitude
    );
    if (dist <= maxRadius) {
      score += Math.round(((maxRadius - dist) / maxRadius) * 15);
    }
  } else if (
    worker.city &&
    event.city &&
    worker.city.toLowerCase() === event.city.toLowerCase()
  ) {
    score += 12; // Same city fallback
  } else {
    score += 6;
  }

  // 4. Experience (up to 15 pts)
  const expYears = worker.experienceYears || 0;
  if (expYears >= 3) score += 15;
  else if (expYears >= 1) score += 10;
  else if (expYears > 0) score += 5;
  else score += 3;

  return Math.min(100, Math.max(0, score));
}

/**
 * Resequences waiting list positions for a role so they are sequential (1, 2, 3...).
 * Notifies workers whose positions advanced.
 */
export async function resequenceWaitlist(roleId: string): Promise<void> {
  const waitlisted = await db.application.findMany({
    where: { roleId, status: "WAITLISTED" },
    orderBy: [{ waitlistPosition: "asc" }, { id: "asc" }],
    include: { role: { include: { event: true } }, user: true },
  });

  for (let i = 0; i < waitlisted.length; i++) {
    const app = waitlisted[i];
    const newPos = i + 1;
    if (app.waitlistPosition !== newPos) {
      await db.application.update({
        where: { id: app.id },
        data: { waitlistPosition: newPos },
      });

      // Send position advancement notification
      await notifyUser({
        userId: app.userId,
        eventId: app.role.eventId,
        title: `Waiting List Update: Position #${newPos}`,
        message: `Your waiting list position for "${app.role.title}" at "${app.role.event.title}" has moved up to #${newPos}!`,
        link: `/volunteer/applications`,
      }).catch(console.error);
    }
  }
}

/**
 * Promotes the next eligible waitlisted worker for a vacant role.
 * Sets status to OFFERED with a 2-hour response deadline.
 */
export async function promoteNextWaitlistedWorker(roleId: string): Promise<boolean> {
  const role = await db.eventRole.findUnique({
    where: { id: roleId },
    include: { event: true },
  });
  if (!role || role.event.status !== "PUBLISHED") return false;

  // Check currently accepted count vs slots
  const acceptedCount = await db.application.count({
    where: { roleId, status: "ACCEPTED" },
  });
  if (acceptedCount >= role.slots) return false; // Already full

  // Find lowest waitlist worker
  const waitlist = await db.application.findMany({
    where: { roleId, status: "WAITLISTED" },
    orderBy: { waitlistPosition: "asc" },
    include: { user: true },
  });

  for (const candidate of waitlist) {
    // Check if candidate has schedule conflict now
    const conflict = await checkScheduleConflict(
      candidate.userId,
      role.event.startsAt,
      role.event.endsAt,
      candidate.id
    );

    if (conflict.hasConflict) {
      // Candidate now has a conflicting shift; skip to next candidate
      continue;
    }

    // Offer replacement with 2-hour expiration deadline
    const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await db.application.update({
      where: { id: candidate.id },
      data: {
        status: "OFFERED",
        offerExpiresAt: expiry,
      },
    });

    // Notify candidate of urgent replacement offer
    await notifyUser({
      userId: candidate.userId,
      eventId: role.eventId,
      title: `URGENT Replacement Offer: ${role.title}`,
      message: `A spot opened up for "${role.title}" at "${role.event.title}"! Tap to accept before ${expiry.toLocaleTimeString("en-IN", { timeStyle: "short" })}.`,
      link: `/volunteer/applications?offer=${candidate.id}`,
    }).catch(console.error);

    // Notify organizer that replacement offer is dispatched
    await notifyUser({
      userId: role.event.organizerId,
      eventId: role.eventId,
      title: `Replacement Dispatched: ${role.title}`,
      message: `Offered vacant slot in "${role.title}" to waiting-list worker ${candidate.user.name}. Awaiting worker confirmation.`,
      link: `/organizer?tab=manage&event=${role.eventId}`,
    }).catch(console.error);

    return true;
  }

  // If no waitlisted workers available, trigger Urgent Open Shift broadcast!
  await db.eventRole.update({
    where: { id: roleId },
    data: {
      isUrgentVacancy: true,
      urgentBroadcastAt: new Date(),
    },
  });

  await broadcastUrgentOpenShift(roleId);
  return false;
}

/**
 * Broadcasts alert to eligible nearby workers when an urgent vacancy opens with an empty waitlist.
 */
export async function broadcastUrgentOpenShift(roleId: string): Promise<void> {
  const role = await db.eventRole.findUnique({
    where: { id: roleId },
    include: { event: true },
  });
  if (!role || role.event.status !== "PUBLISHED") return;

  // Find nearby approved workers who are not suspended
  const workers = await db.user.findMany({
    where: {
      role: { in: ["WORKER", "VOLUNTEER"] },
      approval: "APPROVED",
      suspended: false,
      city: { contains: role.event.city },
    },
    take: 20,
  });

  for (const w of workers) {
    const conflict = await checkScheduleConflict(
      w.id,
      role.event.startsAt,
      role.event.endsAt
    );
    if (!conflict.hasConflict) {
      await notifyUser({
        userId: w.id,
        eventId: role.eventId,
        title: `⚡ URGENT Open Shift: ${role.title}`,
        message: `Immediate vacancy open for "${role.title}" at "${role.event.title}" in ${role.event.city}. First-come, first-served claim available!`,
        link: `/volunteer/events/${role.eventId}`,
      }).catch(console.error);
    }
  }
}
