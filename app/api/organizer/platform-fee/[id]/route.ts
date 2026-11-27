import { handle, json, requireUser } from "@/lib/api";
import { payPlatformFee } from "@/lib/organizer/service";

export const dynamic = "force-dynamic";

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(["ORGANIZER"]);
  const { id } = await (params as any);
  const body = await req.json();
  const updated = await payPlatformFee(user.id, id, body.receiptRef);
  return json({ success: true, fee: updated });
});
