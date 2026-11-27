import { handle, json } from "@/lib/api";
import { listPublicEvents } from "@/lib/services/events";

export const dynamic = "force-dynamic";

// Public. Also used by the landing page and, later, the mobile app.
export const GET = handle(async (req) => {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  return json(await listPublicEvents(params));
});
