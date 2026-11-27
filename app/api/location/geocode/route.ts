import { handle, json, readJson, requireUser } from "@/lib/api";
import { geocodeWithPhoton } from "@/lib/location";

export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  await requireUser();
  const body = await readJson(req);

  const query =
    body.query ||
    [body.address, body.area, body.city, body.pincode].filter(Boolean).join(", ");

  if (!query || !query.trim()) {
    return json({ error: { message: "Address or query is required" } }, 400);
  }

  const result = await geocodeWithPhoton(query.trim());
  if (!result) {
    return json({ error: { message: "Could not find coordinates for this address" } }, 404);
  }

  return json({
    success: true,
    latitude: result.latitude,
    longitude: result.longitude,
    displayName: result.displayName,
  });
});
