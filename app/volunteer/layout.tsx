import { redirect } from "next/navigation"; import { need } from "@/lib/auth"; import { TERMS_VERSION } from "@/lib/terms"
export default async function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const u = await need("VOLUNTEER"); if (u.termsVersion !== TERMS_VERSION) redirect("/terms")
  return <div className="compact">{u.approval !== "APPROVED" && <p className="card">{u.approval === "REJECTED" ? "The admin rejected your volunteer account, so you can’t apply to events." : "Your account is waiting for admin approval. You can browse events, and apply once you are approved."}</p>}{children}</div>
}
