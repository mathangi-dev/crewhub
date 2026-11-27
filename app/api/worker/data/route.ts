import { handle, json, requireUser } from "@/lib/api";
import { getWorkerDashboardData } from "@/lib/worker/service";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const user = await requireUser(["WORKER"]);
  const data = await getWorkerDashboardData(user.id);
  return json(data);
});
