import { z } from "zod";
import { handle, json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { geocodeWithPhoton } from "@/lib/location";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/).optional().or(z.literal("")),
  upi: z.string().trim().max(100).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  area: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  pincode: z.string().trim().max(10).optional().or(z.literal("")),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  radiusKm: z.number().int().min(1).max(100).optional(),
  nearbyNotif: z.boolean().optional(),
  exp: z.string().trim().max(1000).optional().or(z.literal("")),
  skills: z.array(z.string().trim().max(50)).max(30).default([]),
  cats: z.array(z.string().trim().max(50)).max(20).default([]),
  notif: z
    .object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      remind: z.boolean().default(true),
      nearby: z.boolean().optional(),
    })
    .default({ email: true, push: true, remind: true }),
});

export const GET = handle(async (_req: Request) => {
  const user = await requireUser(["WORKER"]);
  const wp = await prisma.workerProfile.findUnique({
    where: { userId: user.id },
  });
  const p = wp as any;
  return json({
    name: user.name,
    email: user.email,
    phone: p?.phone || "",
    upi: p?.upi || "",
    address: p?.address || "",
    area: p?.area || "",
    city: p?.city || "",
    pincode: p?.pincode || "",
    latitude: p?.latitude ? Number(p.latitude) : null,
    longitude: p?.longitude ? Number(p.longitude) : null,
    radiusKm: p?.radiusKm ?? 15,
    nearbyNotif: p?.nearbyNotif ?? true,
    skills: (p?.skills as string[]) || [],
    exp: p?.experience || "",
    cats: (p?.preferredCategories as string[]) || [],
    notif: {
      email: p?.emailNotif ?? true,
      push: p?.pushNotif ?? true,
      remind: p?.remindNotif ?? true,
      nearby: p?.nearbyNotif ?? true,
    },
  });
});

export const PATCH = handle(async (req: Request) => {
  const user = await requireUser(["WORKER"]);
  const data = profileSchema.parse(await readJson(req));

  // Determine latitude & longitude: if user passed explicit coords, use them.
  // Otherwise, geocode the entered residential address via Photon geocoding.
  let lat: number | null | undefined = data.latitude;
  let lon: number | null | undefined = data.longitude;

  if (lat === undefined || lon === undefined || lat === null || lon === null) {
    const addressQuery = [data.address, data.area, data.city, data.pincode]
      .filter(Boolean)
      .join(", ");
    if (addressQuery.trim()) {
      const geo = await geocodeWithPhoton(addressQuery);
      if (geo) {
        lat = geo.latitude;
        lon = geo.longitude;
      }
    }
  }

  const nearbyNotificationSetting =
    data.nearbyNotif !== undefined
      ? data.nearbyNotif
      : data.notif.nearby !== undefined
        ? data.notif.nearby
        : true;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { name: data.name },
    }),
    prisma.workerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        phone: data.phone || null,
        upi: data.upi || null,
        address: data.address || null,
        area: data.area || null,
        city: data.city || null,
        pincode: data.pincode || null,
        latitude: lat !== undefined && lat !== null ? lat : null,
        longitude: lon !== undefined && lon !== null ? lon : null,
        radiusKm: data.radiusKm ?? 15,
        nearbyNotif: nearbyNotificationSetting,
        experience: data.exp || null,
        skills: data.skills,
        preferredCategories: data.cats,
        emailNotif: data.notif.email,
        pushNotif: data.notif.push,
        remindNotif: data.notif.remind,
      } as any,
      update: {
        phone: data.phone || null,
        upi: data.upi || null,
        address: data.address || null,
        area: data.area || null,
        city: data.city || null,
        pincode: data.pincode || null,
        ...(lat !== undefined ? { latitude: lat } : {}),
        ...(lon !== undefined ? { longitude: lon } : {}),
        radiusKm: data.radiusKm ?? 15,
        nearbyNotif: nearbyNotificationSetting,
        experience: data.exp || null,
        skills: data.skills,
        preferredCategories: data.cats,
        emailNotif: data.notif.email,
        pushNotif: data.notif.push,
        remindNotif: data.notif.remind,
      } as any,
    }),
  ]);

  return json({
    success: true,
    message: "Profile updated successfully",
    coordinates: lat && lon ? { latitude: lat, longitude: lon } : null,
  });
});
