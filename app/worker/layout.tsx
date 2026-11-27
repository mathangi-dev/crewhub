import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import WorkerProvider from "@/components/worker/WorkerProvider";
import WorkerShell from "@/components/worker/WorkerShell";
import { getWorkerDashboardData } from "@/lib/worker/service";
import "./worker.css";

export const dynamic = "force-dynamic";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  if (!s || s.role !== "WORKER") redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: s.id },
    select: { id: true, name: true, email: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") redirect("/login");

  const initialData = await getWorkerDashboardData(user.id);

  return (
    <div className="wk">
      <WorkerProvider initialData={initialData} user={{ id: user.id, name: user.name, email: user.email }}>
        <WorkerShell>{children}</WorkerShell>
      </WorkerProvider>
    </div>
  );
}
