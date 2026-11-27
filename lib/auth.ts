import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

export const COOKIE = "crewhub_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be set to 32+ characters");
  return new TextEncoder().encode(s);
}

export const roleHome: Record<Role, string> = {
  WORKER: "/worker",
  ORGANIZER: "/organizer",
  ADMIN: "/admin",
};

export async function signSession(userId: string, role: Role) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function readSession(): Promise<{ id: string; role: Role } | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: payload.sub as string, role: payload.role as Role };
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  res.cookies.delete(COOKIE);
}
