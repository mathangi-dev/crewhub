import { prisma } from "@/lib/db";
import type { Ev, Job, App, Offer, Pay, Notice, Profile, AppStatus, PayStatus } from "./types";

const CATEGORY_ICONS: Record<string, string> = {
  Concert: "music_note",
  Exhibition: "storefront",
  "Stand-up": "mic",
  Party: "celebration",
  Conference: "business",
  Sports: "sports_soccer",
  Festival: "festival",
};

const CATEGORY_BG: Record<string, string> = {
  Concert: "#27303f",
  Exhibition: "#2e2a22",
  "Stand-up": "#2a2630",
  Party: "#1f2f28",
  Conference: "#202a36",
  Sports: "#1b2e25",
  Festival: "#312028",
};

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);

const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "numeric", hour12: true, timeZone: "Asia/Kolkata" }).format(d);

export function formatEvent(e: any): Ev {
  const icon = CATEGORY_ICONS[e.category] || "event";
  const bg = CATEGORY_BG[e.category] || "#252b36";
  const starts = new Date(e.startsAt);
  const ends = new Date(e.endsAt);
  const repTime = new Date(starts.getTime() - 60 * 60 * 1000);

  const jobs: Job[] = (e.jobs || []).map((j: any) => {
    const confirmedCount = (j.applications || []).filter((a: any) => a.status === "CONFIRMED").length;
    const remainingSpots = Math.max(0, j.vacancies - confirmedCount);
    return {
      id: j.id,
      n: j.name,
      w: Number(j.wage),
      v: j.vacancies,
      s: remainingSpots,
      sub: j.substituteCount || 0,
      req: j.eligibility || "Good communication skills and punctual.",
    };
  });

  const now = Date.now();
  const isNew = now - new Date(e.createdAt).getTime() < 7 * 86400000;
  const tags: string[] = [];
  if (isNew) tags.push("New");
  if (e.applications && e.applications.length > 5) tags.push("Popular");

  return {
    id: e.id,
    n: e.title,
    c: e.category,
    v: e.venue,
    city: e.city,
    d: fmtDate(starts),
    t: starts.toISOString().slice(0, 10),
    i: icon,
    tags,
    b: bg,
    org: e.organizer?.organizerProfile?.orgName || e.organizer?.name || "Event Organizer",
    time: `${fmtTime(starts)} to ${fmtTime(ends)}`,
    rep: fmtTime(repTime),
    dl: fmtDate(new Date(e.applicationDeadline)),
    desc: e.description,
    jobs,
  };
}

export async function getWorkerDashboardData(userId: string) {
  // 1. Fetch user & profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { workerProfile: true },
  });
  if (!user) throw new Error("User not found");

  const wp = user.workerProfile;
  const profile: Profile = {
    name: user.name,
    email: user.email,
    phone: wp?.phone || "",
    upi: wp?.upi || "",
    address: wp?.address || "",
    area: wp?.area || "",
    city: wp?.city || "",
    pincode: wp?.pincode || "",
    latitude: wp?.latitude ? Number(wp.latitude) : null,
    longitude: wp?.longitude ? Number(wp.longitude) : null,
    radiusKm: wp?.radiusKm ?? 15,
    nearbyNotif: wp?.nearbyNotif ?? true,
    skills: Array.isArray(wp?.skills) ? (wp.skills as string[]) : [],
    exp: wp?.experience || "",
    cats: Array.isArray(wp?.preferredCategories) ? (wp.preferredCategories as string[]) : [],
    notif: {
      email: wp?.emailNotif ?? true,
      push: wp?.pushNotif ?? true,
      remind: wp?.remindNotif ?? true,
      nearby: wp?.nearbyNotif ?? true,
    },
  };

  // 2. Fetch published events with open deadlines or recent
  const rawEvents = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    include: {
      organizer: { include: { organizerProfile: true } },
      jobs: {
        include: {
          applications: { select: { id: true, status: true } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const events: Ev[] = rawEvents.map(formatEvent);

  // 3. Fetch applications of this worker
  const rawApps = await prisma.application.findMany({
    where: { workerId: userId },
    include: {
      event: true,
      eventJob: true,
      attendance: true,
      offers: {
        where: { status: "PENDING", expiresAt: { gt: new Date() } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const apps: App[] = rawApps.map((a) => {
    let st: AppStatus = "Pending";
    if (a.status === "CONFIRMED") st = "Confirmed";
    else if (a.status === "WAITLISTED") st = "Waitlisted";
    else if (a.status === "REJECTED") st = "Rejected";
    else if (a.status === "CANCELLED") st = "Cancelled";

    const att = a.attendance
      ? {
          status: a.attendance.status as any,
          checkInAt: a.attendance.checkInAt?.toISOString() || null,
          checkOutAt: a.attendance.checkOutAt?.toISOString() || null,
          note: a.attendance.note || null,
        }
      : null;

    return {
      id: a.id,
      ev: a.eventId,
      name: a.event.title,
      job: a.eventJob.name,
      at: fmtDate(a.createdAt),
      st,
      pos: a.waitlistPosition,
      attendance: att,
    };
  });

  // 4. Pending Replacement Offer if any
  let offer: Offer | null = null;
  const pendingOffer = await prisma.replacementOffer.findFirst({
    where: {
      application: { workerId: userId },
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: { application: true },
  });

  if (pendingOffer) {
    offer = {
      id: pendingOffer.id,
      app: pendingOffer.applicationId,
      until: `${fmtDate(pendingOffer.expiresAt)}, ${fmtTime(pendingOffer.expiresAt)}`,
    };
  }

  // 5. Worker Payments
  const rawPayments = await prisma.workerPayment.findMany({
    where: {
      application: { workerId: userId },
    },
    include: {
      application: { include: { event: true, eventJob: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pay: Pay[] = rawPayments.map((p) => {
    let st: PayStatus = "Pending";
    if (p.status === "RECORDED") st = "Recorded";
    else if (p.status === "CONFIRMED") st = "Confirmed";
    else if (p.status === "DISPUTED") st = "Disputed";

    return {
      id: p.id,
      ev: p.application.event.title,
      w: Number(p.amount),
      st,
      date: p.paidAt ? fmtDate(p.paidAt) : "",
      ref: p.upiReference || "",
      deadlineAt: p.deadlineAt?.toISOString() || null,
      disputeNote: p.disputeNote || null,
    };
  });

  // 6. Notifications
  const rawNotices = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const notices: Notice[] = rawNotices.map((n) => ({
    id: n.id,
    t: n.title,
    b: n.body,
    h: n.link || "/worker/applications",
    r: n.readAt ? 1 : 0,
  }));

  return { events, apps, offer, pay, notices, profile };
}
