import { handle, json, requireUser } from "@/lib/api";
import { updateAdminEventStatus } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export const POST = handle(async (req, { params }) => {
  await requireUser(["ADMIN"]);
  const { id } = await (params as any);
  const body = await req.json();
  const event = await updateAdminEventStatus(id, body.status, body.suspendedReason);
  return json({ success: true, event });
});
