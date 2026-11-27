import { handle, json, requireUser } from "@/lib/api";
import { getAdminDashboardData } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireUser(["ADMIN"]);
  const data = await getAdminDashboardData();
  return json(data);
});
