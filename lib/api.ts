import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { readSession } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = "error") {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

type Handler = (req: Request, ctx: { params: Record<string, string> }) => Promise<Response>;

/** Wraps a route handler: consistent error shape, no stack traces leaked. */
export function handle(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return json({ error: { code: e.code, message: e.message } }, e.status);
      if (e instanceof ZodError)
        return json({ error: { code: "validation", message: "Invalid input", details: e.flatten().fieldErrors } }, 400);
      console.error(e);
      return json({ error: { code: "server", message: "Something went wrong" } }, 500);
    }
  };
}

/** Server-side auth + role check. Always reads the user from the database,
 *  so a suspended account loses access immediately. */
export async function requireUser(roles?: Role[]) {
  const s = await readSession();
  if (!s) throw new ApiError(401, "Please log in", "unauthenticated");
  const user = await prisma.user.findUnique({
    where: { id: s.id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!user) throw new ApiError(401, "Please log in", "unauthenticated");
  if (user.status !== "ACTIVE") throw new ApiError(403, "This account is suspended", "suspended");
  if (roles && !roles.includes(user.role)) throw new ApiError(403, "You do not have access", "forbidden");
  return user;
}

export async function readJson(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Send JSON", "unsupported");
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON", "bad_json");
  }
}
