import { handle, json, requireUser } from "@/lib/api";
import { recordWorkerPayment } from "@/lib/organizer/service";

export const dynamic = "force-dynamic";

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(["ORGANIZER"]);
  const { id } = await (params as any);
  const body = await req.json();
  const updated = await recordWorkerPayment(user.id, id, body.upiReference);
  return json({ success: true, payment: updated });
});
