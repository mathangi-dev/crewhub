import { db } from "@/lib/db"; import { need } from "@/lib/auth"; import EventCard from "@/components/EventCard"; import EventDetail from "@/components/EventDetail"; import { inr, hm } from "@/lib/money"
export default async function Page({ searchParams: sp }: { searchParams: { id?: string } }) {
  const u = await need("VOLUNTEER")
  const apps: any[] = await db.application.findMany({ where: { userId: u.id, status: "ACCEPTED", checkOut: null, role: { event: { status: "PUBLISHED" } } }, orderBy: { role: { event: { startsAt: "asc" } } }, include: { role: { include: { event: { include: { organizer: true, roles: true } } } } } })
  const head = <><div className="dh"><div><span className="mute">Volunteer dashboard</span><h1>My Events</h1></div></div><p className="mute">Events you have been approved for. Tap one for details, your organizer marks attendance on the day.</p></>
  const a = sp.id ? apps.find(x => x.role.eventId === sp.id) : null
  if (a) return <>{head}<EventDetail e={a.role.event} back={["/volunteer/my-events", "My events"]}><h2>Your role</h2><div className="card">
    <p className="kv"><span className="mute">Role</span><br /><b>{a.role.title}</b></p><p className="kv"><span className="mute">Shift length</span><br /><b>{a.role.hours ? `${a.role.hours} hrs` : "–"}</b></p><p className="kv"><span className="mute">Status</span><br /><span className="tag ok">{a.checkIn ? `Checked in at ${hm(a.checkIn)}` : "Approved, not checked in yet"}</span></p>
    <p className="mute">The admin pays your share of the crew pool after the event ends. See Payment History.</p>
    <p className="mute" style={{ margin: 0 }}>Your organizer marks your check in and check out. You can’t change it.</p></div></EventDetail></>
  return <>{head}{apps.length ? <div className="grid">{apps.map(x => <EventCard key={x.id} href={`/volunteer/my-events?id=${x.role.eventId}`} e={x.role.event} badge={x.checkIn ? "Checked in" : "Approved"} sub={`${x.role.title} · ${x.role.hours ? x.role.hours + " hrs" : "Volunteer"}${x.role.pay ? " · " + inr(x.role.pay) : ""}`} />)}</div> : <p className="card">No approved events yet. Apply from the Events tab and wait for the organizer to accept.</p>}</>
}
