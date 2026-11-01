import Link from "next/link"; import { db } from "@/lib/db"
import { LOOK } from "@/lib/look"
export default async function Home({ searchParams: p }: { searchParams: { q?: string; city?: string; cat?: string } }) {
  const rows = await db.event.findMany({ where: { status: "PUBLISHED", endsAt: { gte: new Date() }, title: { contains: p.q || "" }, city: { contains: p.city || "" }, category: { contains: p.cat || "" } }, include: { roles: true }, orderBy: { startsAt: "asc" } })
  const list: any[] = rows.map(e => ({ id: e.id, img: e.cardImage, title: e.title, category: e.category, venue: e.venue, city: e.city, date: e.startsAt.toLocaleDateString("en-IN", { dateStyle: "medium" }), roles: e.roles.length, pay: Math.max(0, ...e.roles.map(r => r.pay)) }))
  return <>
    <section className="hero" id="about">
      <p style={{ margin: 0 }}>Event staffing, sorted</p><h1>Crew your event.<br />Join the show.</h1>
      <p>Organizers post roles for concerts, fests and shows. Volunteers apply, check in, get paid and build a verified record.</p>
      <div className="cta"><Link href="/register?role=VOLUNTEER" className="btn">Join as Volunteer</Link><Link href="/register?role=ORGANIZER" className="btn dark">Join as Organizer</Link></div>
      <p style={{ marginTop: 14 }} className="mute">Already a member? <Link href="/login">Log in</Link></p>
      </section>
    <h2 id="events">Popular events</h2><p className="sub">Open roles you can apply for right now.</p>
    <form className="filters"><input name="q" placeholder="Search events" defaultValue={p.q} aria-label="Search" /><input name="city" placeholder="City" defaultValue={p.city} aria-label="City" />
      <select name="cat" defaultValue={p.cat || ""} aria-label="Category"><option value="">All categories</option>{Object.keys(LOOK).map(c => <option key={c}>{c}</option>)}</select><button>Search</button></form>
    {!list.length && <p className="card">No events yet. Check back soon, or clear your filters.</p>}
    <div className="grid">{list.map((e, i) => { const [icon, g] = LOOK[e.category] || ["✨", "#0D334D,#B62E47"]
      return <Link key={e.id || i} href={e.id ? `/events/${e.id}` : "/register?role=VOLUNTEER"} className="ev"><div className="pic" style={{ background: e.img ? `url(${e.img}) center/cover` : `linear-gradient(150deg,${g})` }}>{!e.img && icon}</div>
        <div className="meta"><div><b>{e.title}</b><span className="mute">{e.venue}, {e.city} · {e.date}</span></div><span className="score">{e.pay ? `Up to ₹${e.pay}` : "Volunteer"}</span></div></Link> })}</div>
    <h2 id="how" style={{ textAlign: "center", marginTop: 80 }}>Event crews made simple</h2><p className="sub" style={{ textAlign: "center" }}>From first post to final payout, in one place.</p>
    <div className="steps"><div><h3>Find your event</h3><p className="mute">Filter by city, category and date.</p></div>
      <div className="mid"><h3>Apply for a role</h3><p>Pick the role that fits your skills. Organizers review your profile and accept.</p></div><div><h3>Work and get paid</h3><p className="mute">Check in on the day. Get paid and rated after.</p></div></div>
    <section className="big"><div className="pic" role="img" aria-label="Event hall set up for a gala dinner" style={{ background: "url(/crew-event.jpg) center/cover no-repeat" }} /><div><h2>Your next event, fully crewed</h2><p className="mute">Stop chasing WhatsApp groups. Post roles once and let verified volunteers come to you.</p><Link href="/register?role=ORGANIZER" className="btn dark">Post your first event</Link></div></section>
    <div className="strip">Want to work at events? <Link href="/register?role=VOLUNTEER">Join as a volunteer</Link></div></>
}
