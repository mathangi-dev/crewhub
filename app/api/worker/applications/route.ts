import { z } from "zod";
import { ApiError, handle, json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

const applySchema = z.object({
  eventId: z.string().min(1),
  eventJobId: z.string().min(1),
});

export const POST = handle(async (req) => {
  const user = await requireUser(["WORKER"]);
  const body = applySchema.parse(await readJson(req));

  const event = await prisma.event.findUnique({
    where: { id: body.eventId },
    include: { jobs: true },
  });
  if (!event) throw new ApiError(404, "Event not found", "not_found");
  if (event.status !== "PUBLISHED") throw new ApiError(400, "Event is not open for applications", "event_closed");
  if (new Date() > new Date(event.applicationDeadline)) {
    throw new ApiError(400, "Application deadline has passed", "deadline_passed");
  }

  const job = event.jobs.find((j) => j.id === body.eventJobId);
  if (!job) throw new ApiError(404, "Job role not found in this event", "job_not_found");

  const existing = await prisma.application.findUnique({
    where: { workerId_eventId: { workerId: user.id, eventId: event.id } },
  });
  if (existing) {
    throw new ApiError(400, "You already applied to this event", "already_applied");
  }

  // Count confirmed applications for this job
  const confirmedCount = await prisma.application.count({
    where: { eventJobId: job.id, status: "CONFIRMED" },
  });

  const isConfirmed = confirmedCount < job.vacancies;
  let status: "CONFIRMED" | "WAITLISTED" = "CONFIRMED";
  let waitlistPosition: number | null = null;

  if (isConfirmed) {
    status = "CONFIRMED";
  } else {
    status = "WAITLISTED";
    const waitlistedCount = await prisma.application.count({
      where: { eventJobId: job.id, status: "WAITLISTED" },
    });
    waitlistPosition = waitlistedCount + 1;
  }

  const application = await prisma.application.create({
    data: {
      eventId: event.id,
      eventJobId: job.id,
      workerId: user.id,
      status,
      waitlistPosition,
    },
    include: {
      event: true,
      eventJob: true,
    },
  });

  // Create notification
  const title = status === "CONFIRMED" ? "Application confirmed" : "Added to waitlist";
  const message =
    status === "CONFIRMED"
      ? `${event.title}: you are confirmed as ${job.name}.`
      : `${event.title}: you are #${waitlistPosition} on the waitlist for ${job.name}.`;

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: status === "CONFIRMED" ? "APPLICATION_CONFIRMED" : "WAITLIST_JOINED",
      title,
      body: message,
      link: "/worker/applications",
    },
  });

  return json({
    success: true,
    application: {
      id: application.id,
      ev: application.eventId,
      name: application.event.title,
      job: application.eventJob.name,
      at: "Today",
      st: status === "CONFIRMED" ? "Confirmed" : "Waitlisted",
      pos: waitlistPosition,
    },
  });
});
