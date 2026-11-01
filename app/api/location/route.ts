import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { me } from "@/lib/auth";

export async function POST(req: Request) {
  const u = await me();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { lat, lng } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    await db.user.update({
      where: { id: u.id },
      data: {
        latitude: lat,
        longitude: lng,
        lastLocationAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, lat, lng });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
