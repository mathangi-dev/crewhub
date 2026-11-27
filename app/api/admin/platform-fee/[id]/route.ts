import { handle, json, requireUser } from "@/lib/api";
import { updatePlatformFeeStatus } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export const POST = handle(async (req, { params }) => {
  await requireUser(["ADMIN"]);
  const { id } = await (params as any);
  const body = await req.json();
  const fee = await updatePlatformFeeStatus(id, body.status, body.receiptRef);
  return json({ success: true, fee });
});
