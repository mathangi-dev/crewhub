import { handle, json, requireUser } from "@/lib/api";
import { toggleOrganizerVerification } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export const POST = handle(async (req, { params }) => {
  await requireUser(["ADMIN"]);
  const { id } = await (params as any);
  const body = await req.json();
  const profile = await toggleOrganizerVerification(id, Boolean(body.verified));
  return json({ success: true, profile });
});
