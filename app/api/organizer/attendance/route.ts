import { handle, json, requireUser } from "@/lib/api";
import { updateAttendance } from "@/lib/organizer/service";

export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  const user = await requireUser(["ORGANIZER"]);
  const body = await req.json();
  const updated = await updateAttendance(user.id, body.applicationId, body.status, body.note);
  return json({ success: true, attendance: updated });
});
