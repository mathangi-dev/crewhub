import { handle, json, requireUser } from "@/lib/api";
import { updateApplicationStatus } from "@/lib/organizer/service";

export const dynamic = "force-dynamic";

export const PATCH = handle(async (req, { params }) => {
  const user = await requireUser(["ORGANIZER"]);
  const { id } = await (params as any);
  const body = await req.json();
  const updated = await updateApplicationStatus(user.id, id, body.status);
  return json({ success: true, application: updated });
});
