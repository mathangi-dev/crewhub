import { z } from "zod";
import bcrypt from "bcryptjs";
import { ApiError, handle, json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

const passwordSchema = z.object({
  cur: z.string().min(1, "Current password is required"),
  n1: z.string().min(8, "New password must be at least 8 characters"),
});

export const POST = handle(async (req) => {
  const sessionUser = await requireUser();
  const { cur, n1 } = passwordSchema.parse(await readJson(req));

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });
  if (!user) throw new ApiError(404, "User not found", "not_found");

  const match = await bcrypt.compare(cur, user.passwordHash);
  if (!match) throw new ApiError(400, "Current password does not match", "invalid_password");

  if (cur === n1) throw new ApiError(400, "New password must be different from current password", "same_password");

  const newHash = await bcrypt.hash(n1, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return json({ success: true, message: "Password updated successfully" });
});
