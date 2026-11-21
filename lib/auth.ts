import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

const key = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function setSession(id: string) {
  const t = await new SignJWT({ id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);
  cookies().set("el", t, { httpOnly: true, path: "/", sameSite: "lax" });
}

export async function me() {
  const t = cookies().get("el")?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key);
    const u = await db.user.findUnique({ where: { id: payload.id as string } });
    return u && !u.suspended ? u : null;
  } catch {
    return null;
  }
}

export type RoleType = "ADMIN" | "ORGANIZER" | "WORKER" | "VOLUNTEER";

export function isWorkerRole(role: string): boolean {
  return role === "WORKER" || role === "VOLUNTEER";
}

export function isOrganizerRole(role: string): boolean {
  return role === "ORGANIZER";
}

export function isAdminRole(role: string): boolean {
  return role === "ADMIN";
}

export async function need(role: RoleType | string) {
  const u = await me();
  if (!u) redirect("/login");
  if (role === "WORKER" || role === "VOLUNTEER") {
    if (!isWorkerRole(u.role)) redirect("/login");
  } else if (u.role !== role) {
    redirect("/login");
  }
  return u;
}

/**
 * Resource-level authorization: Verifies the authenticated organizer owns the event.
 */
export async function needEventOwner(eventId: string) {
  const u = await need("ORGANIZER");
  const event = await db.event.findFirst({
    where: { id: eventId, organizerId: u.id },
  });
  if (!event) {
    throw new Error("Unauthorized: You do not own this event.");
  }
  return { u, event };
}

/**
 * Resource-level authorization: Verifies the authenticated worker owns the application.
 */
export async function needApplicationOwner(applicationId: string) {
  const u = await need("WORKER");
  const app = await db.application.findFirst({
    where: { id: applicationId, userId: u.id },
    include: { role: { include: { event: true } } },
  });
  if (!app) {
    throw new Error("Unauthorized: Application not found or access denied.");
  }
  return { u, app };
}
