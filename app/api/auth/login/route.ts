import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, handle, readJson } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { roleHome, setSessionCookie, signSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Compared when the email is unknown so response time does not reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export const POST = handle(async (req) => {
  const { email, password } = loginSchema.parse(await readJson(req));
  if (!rateLimit(`login:${clientIp(req)}:${email}`, 8, 15 * 60 * 1000))
    throw new ApiError(429, "Too many attempts. Try again in a few minutes.", "rate_limited");

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, "Email or password is incorrect", "bad_credentials");
  if (user.status !== "ACTIVE") throw new ApiError(403, "This account is suspended. Contact support.", "suspended");

  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    redirectTo: roleHome[user.role],
  });
  setSessionCookie(res, await signSession(user.id, user.role));
  return res;
});
