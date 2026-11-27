import { z } from "zod";
import { ApiError, handle, json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

const supportSchema = z.object({
  message: z.string().trim().min(5, "Message must be at least 5 characters"),
  subject: z.string().trim().default("Worker Support Request"),
});

export const POST = handle(async (req) => {
  const user = await requireUser();
  const { message, subject } = supportSchema.parse(await readJson(req));

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject,
      message,
      status: "OPEN",
    },
  });

  return json({ success: true, ticketId: ticket.id });
});
