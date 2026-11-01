import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { me } from "@/lib/auth";

export async function GET() {
  const u = await me();
  if (!u) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const notifications = await db.notification.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      event: {
        select: {
          id: true,
          title: true,
          venue: true,
          city: true,
          startsAt: true,
        },
      },
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: Request) {
  const u = await me();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (body.action === "mark_all_read") {
      await db.notification.updateMany({
        where: { userId: u.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "mark_read" && body.id) {
      await db.notification.updateMany({
        where: { id: body.id, userId: u.id },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
