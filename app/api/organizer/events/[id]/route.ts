import { handle, json, requireUser } from "@/lib/api";
import { updateEventStatus } from "@/lib/organizer/service";

export const dynamic = "force-dynamic";

export const PATCH = handle(async (req, { params }) => {
  const user = await requireUser(["ORGANIZER"]);
  const { id } = await (params as any);
  const body = await req.json();
  const updated = await updateEventStatus(user.id, id, body.status, body.receiptRef);
  return json({ success: true, event: updated });
});
