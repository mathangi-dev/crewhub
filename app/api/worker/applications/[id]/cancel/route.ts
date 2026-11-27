import { ApiError, handle, json, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { evaluateVolunteerCancellationDiscipline } from "@/lib/discipline";

export const POST = handle(async (_req, { params }) => {
  const user = await requireUser(["WORKER"]);
  const applicationId = params.id;

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { event: true, eventJob: true },
  });

  if (!app) throw new ApiError(404, "Application not found", "not_found");
  if (app.workerId !== user.id) throw new ApiError(403, "Forbidden", "forbidden");
  if (app.status === "CANCELLED") throw new ApiError(400, "Already cancelled", "already_cancelled");

  const wasConfirmed = app.status === "CONFIRMED";

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: "CANCELLED",
      waitlistPosition: null,
      cancelledAt: new Date(),
    },
  });

  // Track worker's total cancellations and enforce reliability policy:
  // 3 cancellations -> warning notification
  // 5 cancellations -> automatic account suspension
  const cancelCount = await prisma.application.count({
    where: {
      workerId: user.id,
      status: "CANCELLED",
    },
  });

  const discipline = evaluateVolunteerCancellationDiscipline(cancelCount);

  if (discipline.shouldSuspend) {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "SUSPENDED" },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "ACCOUNT_SUSPENDED",
        title: discipline.warningTitle || "Account Suspended",
        body: discipline.warningBody || "Account suspended due to excessive cancellations.",
        link: "/worker/profile",
      },
    });
  } else if (discipline.shouldWarn) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "POLICY_WARNING",
        title: discipline.warningTitle || "Cancellation Warning",
        body: discipline.warningBody || "Cancellation warning issued.",
        link: "/worker/applications",
      },
    });
  }

  // If a confirmed spot opened up, offer it to the #1 waitlisted worker
  if (wasConfirmed) {
    const nextInLine = await prisma.application.findFirst({
      where: {
        eventJobId: app.eventJobId,
        status: "WAITLISTED",
      },
      orderBy: { waitlistPosition: "asc" },
    });

    if (nextInLine) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await prisma.replacementOffer.create({
        data: {
          applicationId: nextInLine.id,
          status: "PENDING",
          expiresAt,
        },
      });

      await prisma.notification.create({
        data: {
          userId: nextInLine.workerId,
          type: "REPLACEMENT_OFFER",
          title: "Replacement offer",
          body: `${app.event.title}: a spot opened up for ${app.eventJob.name}. Respond within 24 hours.`,
          link: "/worker/applications",
        },
      });
    }
  } else if (app.status === "WAITLISTED" && app.waitlistPosition) {
    // Re-adjust waitlist positions for those behind
    await prisma.application.updateMany({
      where: {
        eventJobId: app.eventJobId,
        status: "WAITLISTED",
        waitlistPosition: { gt: app.waitlistPosition },
      },
      data: {
        waitlistPosition: { decrement: 1 },
      },
    });
  }

  return json({ success: true, message: "Application cancelled" });
});
