import { handle, json, requireUser } from "@/lib/api";
import { createOrganizerEvent } from "@/lib/organizer/service";

export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  const user = await requireUser(["ORGANIZER"]);
  const body = await req.json();
  const event = await createOrganizerEvent(user.id, body);
  return json({ success: true, event }, 201);
});
