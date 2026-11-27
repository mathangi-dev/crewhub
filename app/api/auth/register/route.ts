import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, handle, readJson } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { roleHome, setSessionCookie, signSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const POST = handle(async (req) => {
  if (!rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000))
    throw new ApiError(429, "Too many attempts. Try again later.", "rate_limited");
  const data = registerSchema.parse(await readJson(req));

  if (await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } }))
    throw new ApiError(409, "An account with this email already exists", "email_taken");

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, 12),
      ...(data.role === "WORKER"
        ? { workerProfile: { create: {} } }
        : { organizerProfile: { create: { orgName: data.orgName! } } }),
    },
    select: { id: true, role: true, name: true, email: true },
  });

  const res = NextResponse.json({ user, redirectTo: roleHome[user.role] }, { status: 201 });
  setSessionCookie(res, await signSession(user.id, user.role));
  return res;
});
