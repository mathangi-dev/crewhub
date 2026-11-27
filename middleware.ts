import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// First line of defence for pages. Every API route and page still re-checks on the server.
const areas: Record<string, string> = { "/worker": "WORKER", "/organizer": "ORGANIZER", "/admin": "ADMIN" };
const home: Record<string, string> = { WORKER: "/worker", ORGANIZER: "/organizer", ADMIN: "/admin" };

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const area = Object.keys(areas).find((a) => path === a || path.startsWith(a + "/"));
  if (!area) return NextResponse.next();

  const token = req.cookies.get("crewhub_session")?.value;
  try {
    const { payload } = await jwtVerify(token ?? "", new TextEncoder().encode(process.env.JWT_SECRET));
    if (payload.role !== areas[area]) return NextResponse.redirect(new URL(home[payload.role as string] ?? "/login", req.url));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = { matcher: ["/worker/:path*", "/organizer/:path*", "/admin/:path*"] };
