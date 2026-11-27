import { z } from "zod";
import { handle, json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

const noticeSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

export const POST = handle(async (req) => {
  const user = await requireUser();
  const { id, all } = noticeSchema.parse(await readJson(req));

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (id) {
    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
  }

  return json({ success: true });
});
