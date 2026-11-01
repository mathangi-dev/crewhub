import Link from "next/link"; import { db } from "@/lib/db"; import { need } from "@/lib/auth"; import { cancelApplication } from "@/app/actions"; import { inr, hm } from "@/lib/money"
export default async function Page() {
  const u = await need("VOLUNTEER")
  const apps: any[] = await db.application.findMany({ where: { userId: u.id, status: { not: "CANCELLED" }, checkOut: null }, orderBy: { role: { event: { startsAt: "desc" } } }, include: { role: { include: { event: true } } } })
  return <><div className="dh"><div><span className="mute">Volunteer dashboard</span><h1>My Applications</h1></div></div><p className="mute">Track your applications. Your organizer marks attendance on the event day.</p>
    {!apps.length ? <p className="card">No active applications. <Link href="/volunteer/events">Browse events</Link>.</p> : apps.map(a => <div key={a.id} className="card row"><div><b>{a.role.title}</b> at <Link href={`/volunteer/events/${a.role.eventId}`}>{a.role.event.title}</Link><div className="mute">{a.role.event.startsAt.toLocaleDateString("en-IN")} · {a.role.pay ? inr(a.role.pay) : "Unpaid"}</div></div>
      <span className={`tag ${a.absent ? "bad" : a.status === "ACCEPTED" ? "ok" : a.status === "REJECTED" ? "bad" : ""}`}>{a.absent ? "ABSENT" : a.status}</span>
      {a.status === "PENDING" && <form action={cancelApplication.bind(null, a.id)}><button className="ghost">Cancel application</button></form>}
      {a.checkIn ? <span className="mute">Checked in {hm(a.checkIn)}{a.checkOut ? ` · Out ${hm(a.checkOut)}` : ""}</span> : a.status === "ACCEPTED" && !a.absent && <span className="mute">Organizer marks attendance</span>}</div>)}</>
}
