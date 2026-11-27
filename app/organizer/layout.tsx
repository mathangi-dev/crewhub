import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import OrganizerProvider from "@/components/organizer/OrganizerProvider";
import OrganizerShell from "@/components/organizer/OrganizerShell";
import { getOrganizerDashboardData } from "@/lib/organizer/service";
import "./organizer.css";

export const dynamic = "force-dynamic";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  if (!s || s.role !== "ORGANIZER") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: s.id },
    select: { id: true, name: true, email: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") redirect("/login");

  const initialData = await getOrganizerDashboardData(user.id);

  return (
    <div className="wk org-shell">
      <OrganizerProvider initialData={initialData}>
        <OrganizerShell>{children}</OrganizerShell>
      </OrganizerProvider>
    </div>
  );
}
