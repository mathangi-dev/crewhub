import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  try {
    cookies().delete(COOKIE);
  } catch {}
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL("/login", url.origin));
  clearSessionCookie(res);
  try {
    cookies().delete(COOKIE);
  } catch {}
  return res;
}
