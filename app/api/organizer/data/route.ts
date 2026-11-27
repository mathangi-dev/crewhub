import { handle, json, requireUser } from "@/lib/api";
import { getOrganizerDashboardData } from "@/lib/organizer/service";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const user = await requireUser(["ORGANIZER"]);
  const data = await getOrganizerDashboardData(user.id);
  return json(data);
});
