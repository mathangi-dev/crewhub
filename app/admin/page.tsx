import { Suspense } from "react";
import { getAdminDashboardData } from "@/lib/admin/service";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getAdminDashboardData();
  return (
    <Suspense fallback={<div className="panel" style={{ padding: "40px", textAlign: "center" }}>Loading Admin Command Center...</div>}>
      <AdminDashboard initialData={data} />
    </Suspense>
  );
}
