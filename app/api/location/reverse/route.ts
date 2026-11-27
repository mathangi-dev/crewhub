import { handle, json, readJson, requireUser } from "@/lib/api";
import { reverseGeocodeWithPhoton } from "@/lib/location";

export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  await requireUser();
  const body = await readJson(req);

  const lat = Number(body.latitude);
  const lon = Number(body.longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return json({ error: { message: "Valid latitude and longitude are required" } }, 400);
  }

  const result = await reverseGeocodeWithPhoton(lat, lon);

  return json({
    success: true,
    address: result?.address || "",
    area: result?.area || "",
    city: result?.city || "Chennai",
    pincode: result?.pincode || "",
  });
});
