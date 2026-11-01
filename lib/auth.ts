import { SignJWT, jwtVerify } from "jose"; import { cookies } from "next/headers"; import { redirect } from "next/navigation"; import { db } from "./db"
const key = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret")
export async function setSession(id: string) {
  const t = await new SignJWT({ id }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key)
  cookies().set("el", t, { httpOnly: true, path: "/", sameSite: "lax" })
}
export async function me() {
  const t = cookies().get("el")?.value; if (!t) return null
  try { const { payload } = await jwtVerify(t, key); const u = await db.user.findUnique({ where: { id: payload.id as string } }); return u && !u.suspended ? u : null } catch { return null }
}
export async function need(role: string) { const u = await me(); if (!u || u.role !== role) redirect("/login"); return u }
