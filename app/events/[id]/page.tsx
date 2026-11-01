import { notFound, redirect } from "next/navigation"; import { db } from "@/lib/db"; import { me } from "@/lib/auth"; import { apply } from "@/app/actions"
export default async function EventPage({ params }: { params: { id: string } }) {
  const [u, e] = [await me(), await db.event.findUnique({ where: { id: params.id }, include: { organizer: true, roles: { include: { applications: true } } } })]
  if (!e || e.status === "DRAFT" || (e.status !== "PUBLISHED" && e.organizerId !== u?.id && u?.role !== "ADMIN")) notFound()
  if (u?.role === "VOLUNTEER" && e.status === "PUBLISHED") redirect(`/volunteer/events/${e.id}`)
  return <><span className="tag">{e.category}</span> {e.organizer.verified && <span className="tag ok">Verified organizer</span>}<h1>{e.title}</h1>
    <p className="mute">{e.venue}, {e.city} · {e.startsAt.toLocaleString("en-IN")} to {e.endsAt.toLocaleTimeString("en-IN", { timeStyle: "short" })} · by {e.organizer.orgName || e.organizer.name}</p><p>{e.description}</p>{e.poster && <img className="poster" src={e.poster} alt={`${e.title} poster`} />}
    <h2>Roles</h2>{e.roles.map(r => { const mine = r.applications.find(a => a.userId === u?.id), left = r.slots - r.applications.filter(a => a.status === "ACCEPTED").length
      return <div key={r.id} className="card row"><div><b>{r.title}</b><div className="mute">{r.pay ? `₹${r.pay}` : "Unpaid volunteer"}{r.hours ? ` · ${r.hours} hrs` : ""} · {left} of {r.slots} spots left{r.skills && ` · ${r.skills}`}</div></div>
        {u?.role === "VOLUNTEER" && (mine && mine.status !== "CANCELLED" ? <span className="tag">{mine.status}</span> : <form action={apply.bind(null, r.id, e.id)}><button disabled={e.status !== "PUBLISHED"}>Apply for this role</button></form>)}
        {!u && <a href="/login">Log in to apply</a>}</div> })}</>
}
