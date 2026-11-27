import { handle, json, requireUser } from "@/lib/api";
import { resolvePaymentDispute } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export const POST = handle(async (req, { params }) => {
  await requireUser(["ADMIN"]);
  const { id } = await (params as any);
  const body = await req.json();
  const payment = await resolvePaymentDispute(id, body.status, body.disputeNote);
  return json({ success: true, payment });
});
