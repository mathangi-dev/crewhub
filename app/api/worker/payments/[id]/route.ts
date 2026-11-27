import { z } from "zod";
import { ApiError, handle, json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

const paymentActionSchema = z.object({
  action: z.enum(["confirm", "dispute"]),
  disputeNote: z.string().trim().max(500).optional(),
});

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(["WORKER"]);
  const paymentId = params.id;
  const { action, disputeNote } = paymentActionSchema.parse(await readJson(req));

  const payment = await prisma.workerPayment.findUnique({
    where: { id: paymentId },
    include: {
      application: { include: { event: true } },
    },
  });

  if (!payment) throw new ApiError(404, "Payment record not found", "not_found");
  if (payment.application.workerId !== user.id) throw new ApiError(403, "Forbidden", "forbidden");

  if (action === "confirm") {
    await prisma.workerPayment.update({
      where: { id: paymentId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });
    return json({ success: true, message: "Payment marked as confirmed" });
  } else {
    if (!disputeNote || disputeNote.length < 5) {
      throw new ApiError(400, "Please provide a reason for the dispute (at least 5 characters).", "invalid_note");
    }
    await prisma.workerPayment.update({
      where: { id: paymentId },
      data: {
        status: "DISPUTED",
        disputeNote,
      },
    });

    // Create support ticket or admin notification for the dispute
    await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: `Payment dispute: ${payment.application.event.title}`,
        message: `Worker disputed payment of ₹${payment.amount}. Reason: ${disputeNote}`,
        status: "OPEN",
      },
    });

    return json({ success: true, message: "Dispute reported to admin" });
  }
});
