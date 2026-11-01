import { notFound } from "next/navigation"; import { db } from "@/lib/db"; import { need } from "@/lib/auth"; import { apply } from "@/app/actions"; import EventDetail from "@/components/EventDetail"; import { inr } from "@/lib/money"
export default async function Page({ params }: { params: { id: string } }) {
  const u = await need("VOLUNTEER")
  const e: any = await db.event.findUnique({ where: { id: params.id }, include: { organizer: true, roles: { include: { applications: true } } } })
  if (!e || e.status !== "PUBLISHED") notFound()
  return <EventDetail e={e} back={["/volunteer/events", "All events"]}><h2>Roles</h2>{e.roles.map((r: any) => {
    const live = r.applications.filter((a: any) => a.status === "PENDING" || a.status === "ACCEPTED").length, left = r.slots - live, mine = r.applications.find((a: any) => a.userId === u.id)
    return <div key={r.id} className="role"><div className="row"><h3>{r.title} <span className="mute">{r.pay ? `${inr(r.pay)} per person` : "Unpaid"}{r.hours ? ` · ${r.hours} hrs` : ""}</span></h3><span className="mute" style={{ textAlign: "right" }}>{live}/{r.slots} applied · {left > 0 ? `${left} spots left` : "Full"}</span></div>
      <div className="bar" role="img" aria-label={`${live} of ${r.slots} applied`}><i style={{ width: `${(live / r.slots) * 100}%` }} /></div>{r.skills && <p className="mute" style={{ margin: "6px 0 0" }}>Skills: {r.skills}</p>}
      {mine && mine.status !== "CANCELLED" ? <p style={{ margin: "8px 0 0" }}><span className={`tag ${mine.status === "ACCEPTED" ? "ok" : mine.status === "REJECTED" ? "bad" : ""}`}>{mine.status}</span></p>
        : left > 0 && <form action={apply.bind(null, r.id, e.id)}><button disabled={u.approval !== "APPROVED"}>Apply</button></form>}</div> })}</EventDetail>
}
