import { db } from "@/lib/db"; import { need } from "@/lib/auth"; import EventCard from "@/components/EventCard"; import EventDetail from "@/components/EventDetail"; import { Stats, Tag } from "@/components/ui"; import { inr, hm, dt } from "@/lib/money"
export default async function Page({ searchParams: sp }: { searchParams: { id?: string } }) {
  const u = await need("VOLUNTEER")
  const apps: any[] = await db.application.findMany({ where: { userId: u.id, checkOut: { not: null } }, orderBy: { checkOut: "desc" }, include: { role: { include: { event: { include: { organizer: true, roles: true } } } } } })
  const head = <><div className="dh"><div><span className="mute">Volunteer dashboard</span><h1>Event History</h1></div></div><p className="mute">Events you have worked. Tap one to see your details.</p></>
  const a = sp.id ? apps.find(x => x.role.eventId === sp.id) : null
  if (a) return <>{head}<EventDetail e={a.role.event} back={["/volunteer/history", "Event history"]}><h2>Your work</h2><div className="card">
    <p className="kv"><span className="mute">Role</span><br /><b>{a.role.title}{a.role.hours ? ` · ${a.role.hours} hrs` : ""}</b></p><p className="kv"><span className="mute">Check in / out</span><br /><b>{hm(a.checkIn)} to {hm(a.checkOut)}</b></p>
    <p className="kv"><span className="mute">Organizer rating</span><br /><b>{a.rating ? `★ ${a.rating} / 5` : "Not rated yet"}</b></p>
    <p style={{ margin: 0 }}>{a.paid ? <Tag c="ok">Paid {inr(a.payout)} on {dt(a.paidAt).split(",")[0]}</Tag> : a.role.event.crewTotal > 0 ? <Tag>Payout pending</Tag> : <Tag>Unpaid volunteering</Tag>}</p></div></EventDetail></>
  const rated = apps.filter(x => x.rating), avg = rated.length ? (rated.reduce((n, x) => n + x.rating, 0) / rated.length).toFixed(1) : "–"
  return <>{head}<Stats items={[[apps.length, "Events worked"], [avg, "Avg rating"]]} />{apps.length ? <div className="grid">{apps.map(x => <EventCard key={x.id} href={`/volunteer/history?id=${x.role.eventId}`} e={x.role.event} badge={x.rating ? `★ ${x.rating}` : "Completed"} sub={`${x.role.title} · In ${hm(x.checkIn)} · Out ${hm(x.checkOut)}`} />)}</div> : <p className="card">Completed events will appear here.</p>}</>
}
