import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readSession, roleHome } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

// Temporary page proving login + role protection. Real dashboards come in later steps.
export default async function DashboardStub({ role, title }: { role: Role; title: string }) {
  const s = await readSession();
  if (!s) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: s.id }, select: { name: true, role: true, status: true } });
  if (!user || user.status !== "ACTIVE") redirect("/login");
  if (user.role !== role) redirect(roleHome[user.role]);
  return (
    <main className="auth">
      <span className="logo">CrewHub</span>
      <h1>{title}</h1>
      <p className="muted">Signed in as {user.name} ({user.role}). This dashboard is built in a later step.</p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <a href="/" className="btn ghost">Go to Home</a>
        <LogoutButton />
      </div>
    </main>
  );
}
