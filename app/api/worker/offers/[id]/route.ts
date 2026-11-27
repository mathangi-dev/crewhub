import { z } from "zod";
import { ApiError, handle, json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

const offerActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(["WORKER"]);
  const offerId = params.id;
  const { action } = offerActionSchema.parse(await readJson(req));

  const offer = await prisma.replacementOffer.findUnique({
    where: { id: offerId },
    include: {
      application: {
        include: { event: true, eventJob: true },
      },
    },
  });

  if (!offer) throw new ApiError(404, "Offer not found", "not_found");
  if (offer.application.workerId !== user.id) throw new ApiError(403, "Forbidden", "forbidden");
  if (offer.status !== "PENDING") throw new ApiError(400, "Offer is no longer active", "offer_inactive");
  if (new Date() > new Date(offer.expiresAt)) throw new ApiError(400, "Offer has expired", "offer_expired");

  const app = offer.application;

  if (action === "accept") {
    await prisma.$transaction([
      prisma.replacementOffer.update({
        where: { id: offerId },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      }),
      prisma.application.update({
        where: { id: app.id },
        data: { status: "CONFIRMED", waitlistPosition: null },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          type: "OFFER_ACCEPTED",
          title: "Application confirmed",
          body: `${app.event.title}: you accepted the replacement spot for ${app.eventJob.name}.`,
          link: "/worker/applications",
        },
      }),
    ]);
    return json({ success: true, message: "Offer accepted. You are confirmed!" });
  } else {
    // Decline
    await prisma.$transaction([
      prisma.replacementOffer.update({
        where: { id: offerId },
        data: { status: "DECLINED", respondedAt: new Date() },
      }),
      prisma.application.update({
        where: { id: app.id },
        data: { status: "CANCELLED", waitlistPosition: null, cancelledAt: new Date() },
      }),
    ]);

    // Offer to next waitlisted
    const nextInLine = await prisma.application.findFirst({
      where: {
        eventJobId: app.eventJobId,
        status: "WAITLISTED",
      },
      orderBy: { waitlistPosition: "asc" },
    });

    if (nextInLine) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.replacementOffer.create({
        data: { applicationId: nextInLine.id, status: "PENDING", expiresAt },
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

    return json({ success: true, message: "Offer declined" });
  }
});
