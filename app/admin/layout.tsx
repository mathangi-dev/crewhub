import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import "@/app/organizer/organizer.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  if (!s || s.role !== "ADMIN") redirect("/login");

  return <>{children}</>;
}
