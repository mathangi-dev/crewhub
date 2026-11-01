import Link from "next/link"; import RoleBuilder from "@/components/RoleBuilder"; import ImageInput from "@/components/ImageInput"
import LocationPicker from "@/components/LocationPicker"
import { db } from "@/lib/db"; import { need } from "@/lib/auth"; import { createEvent, cancelEvent, rate, clock, markAbsent, discardDraft } from "../actions"; import { inr, attended, absentNow } from "@/lib/money"; import { sweepAbsences } from "@/lib/absence"; import { LOOK } from "@/lib/look"; import EventCard from "@/components/EventCard"; import { Stats } from "@/components/ui"; import SubmitBtn from "@/components/SubmitBtn"
const CATS = Object.keys(LOOK)
const TABS = [["create", "Create Event"], ["manage", "Manage Events"], ["events", "My Events"], ["history", "History"], ["payments", "Payments"]]
const hm = (d: Date | null) => (d ? d.toLocaleTimeString("en-IN", { timeStyle: "short" }) : "—")
export default async function Organizer({ searchParams }: { searchParams: { tab?: string; event?: string; s?: string } }) {
  await sweepAbsences(true); const u = await need("ORGANIZER"), tab = TABS.some(t => t[0] === searchParams.tab) ? searchParams.tab! : "create", now = new Date()
  const events = await db.event.findMany({ where: { organizerId: u.id, status: { not: "DRAFT" } }, orderBy: { startsAt: "desc" }, include: { roles: { include: { applications: { include: { user: true } } } } } })
  const past = (e: any) => e.status === "CANCELLED" || e.status === "REJECTED" || e.endsAt < now
  const active = events.filter(e => !past(e)), done = events.filter(past)
  const acc = (r: any) => r.applications.filter((a: any) => a.status === "ACCEPTED").length
  const when = (e: any) => `${e.startsAt.toLocaleString("en-IN")} to ${hm(e.endsAt)}`
  const label = (e: any) => e.status === "CANCELLED" ? "CANCELLED" : e.status === "REJECTED" ? "REJECTED" : e.status === "PENDING" ? (e.payStatus === "PAID" ? "AWAITING APPROVAL" : "PAYMENT DUE") : e.endsAt < now ? "COMPLETED" : e.startsAt <= now ? "ONGOING" : "UPCOMING"
  const tag = (e: any) => <span className={`tag ${label(e) === "CANCELLED" || label(e) === "REJECTED" ? "bad" : e.status === "PUBLISHED" ? "ok" : ""}`}>{label(e)}</span>
  const hrs = (r: any) => `${r.pay ? `₹${r.pay}` : "Unpaid"}${r.hours ? ` · ${r.hours} hrs` : ""}`
  return <>
    <div className="dh"><div><span className="mute">Organizer dashboard</span><h1>{u.orgName || u.name} {u.approval === "APPROVED" && <span className="tag ok">Verified</span>}</h1></div></div>
    {u.approval !== "APPROVED" && <p className="card">{u.approval === "REJECTED" ? "Your organizer account was rejected by the admin." : "Your account is waiting for admin approval."} You can create events once you are approved. Add your details and submit them for verification on your Profile page.</p>}

    {tab === "create" && <><form action={createEvent} className="newf"><div className="row"><input name="title" placeholder="Event title" required aria-label="Title" /><select name="category" aria-label="Category">{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
      <LocationPicker defaultCity={u.city || "Chennai"} />
      <div className="row"><div><label htmlFor="dt">Event date</label><input id="dt" name="date" type="date" required /></div><div><label htmlFor="st">Start time</label><input id="st" name="startTime" type="time" required /></div><div><label htmlFor="et">End time</label><input id="et" name="endTime" type="time" required /></div></div>
      <div className="row" style={{ alignItems: "flex-start", marginTop: 6 }}><ImageInput name="card" label="Event card image" hint="1200 × 800 px (3:2), JPG, PNG or WebP, max 5 MB. Shown on the home page card." ratio="3 / 2" /><ImageInput name="poster" label="Event poster (A4)" hint="A4 portrait, 2480 × 3508 px (210 × 297 mm at 300 dpi), max 5 MB." ratio="210 / 297" w={220} /></div>
      <label htmlFor="d">Description</label><textarea id="d" name="description" required /><RoleBuilder /><p><SubmitBtn pendingText="Creating draft..." disabled={u.approval !== "APPROVED"}>Continue to payment</SubmitBtn></p></form></>}

    {tab === "manage" && (() => {
      const ev = searchParams.event ? events.find(e => e.id === searchParams.event) : null
      const crew = (r: any) => r.applications.filter((a: any) => a.status === "ACCEPTED") // only volunteers the admin accepted
      if (!ev) return !events.length ? <p className="card">No events yet. Create one first.</p> : <div className="grid">{events.map(e => {
        const total = e.roles.reduce((n, r) => n + r.slots, 0), filled = e.roles.reduce((n, r) => n + acc(r), 0)
        return <EventCard key={e.id} href={`/organizer?tab=manage&event=${e.id}`} e={e} badge={label(e)} sub={`${filled}/${total} volunteers · ${filled >= total && total > 0 ? "✓ Full" : `${total - filled} needed`} · ${e.roles.reduce((n, r) => n + crew(r).filter((a: any) => a.checkIn).length, 0)} checked in`} />
      })}</div>
      const all = ev.roles.flatMap(crew)
      const totalReq = ev.roles.reduce((n, r) => n + r.slots, 0)
      const isReqMet = totalReq > 0 && all.length >= totalReq
      return <><p><Link href="/organizer?tab=manage">← All events</Link></p><section className="evc">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
          <div>
            <b>{ev.title}</b> {tag(ev)}
            {isReqMet && <span className="tag ok" style={{ fontWeight: 700, marginLeft: 6 }}>✓ Requirements Completed</span>}
            <div className="mute">{ev.venue}, {ev.city} · {when(ev)}</div>
          </div>
          {all.length > 0 && (
            <a href={`/api/export/crew?eventId=${ev.id}`} className="btn" style={{ padding: "8px 18px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }} download>
              <span>📥</span> Download Volunteer Roster (Spreadsheet)
            </a>
          )}
        </div>
        {isReqMet && (
          <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "10px 16px", margin: "10px 0 14px", color: "#065f46", fontSize: "0.85rem" }}>
            🎉 <b>All volunteer requirements completed!</b> All {totalReq} crew positions have been filled. You can download the roster containing volunteer names, locations, assigned roles, shift hours, and attendance.
          </div>
        )}
        <Stats items={[[all.length, "Volunteers"], [all.filter((a: any) => a.checkIn).length, "Checked in"], [all.filter((a: any) => a.checkOut).length, "Checked out"], [all.filter((a: any) => absentNow(a, ev)).length, "Absent"]]} />
        {ev.roles.map(r => <div key={r.id} className="role"><div className="row"><h3>{r.title} <span className="mute">{hrs(r)}</span></h3><span className="mute" style={{ textAlign: "right" }}>{acc(r)}/{r.slots} people</span></div>
          <div className="bar" role="img" aria-label={`${acc(r)} of ${r.slots} people`}><i style={{ width: `${(acc(r) / r.slots) * 100}%` }} /></div>
          {!crew(r).length && <p className="mute" style={{ margin: 0 }}>No volunteers assigned yet. The admin assigns approved volunteers to your event.</p>}
          {crew(r).map((a: any) => <div key={a.id} className="app"><span className="av">{a.user.name[0]}</span>
            <div className="who"><b>{a.user.name}</b><div className="mute">{a.user.city} · {a.user.skills || "no skills listed"} · {a.checkIn ? `In ${hm(a.checkIn)}` : "Not checked in"}{a.checkOut ? ` · Out ${hm(a.checkOut)}` : ""}</div></div>
            {(() => { const ab = absentNow(a, ev); return <span className={`tag ${a.checkOut ? "ok" : ab ? "bad" : ""}`}>{attended(a) ? "COMPLETED" : ab ? "ABSENT" : a.checkIn ? "CHECKED IN" : "NOT CHECKED IN"}</span> })()}
            {!a.checkIn && !absentNow(a, ev) && <form action={clock.bind(null, a.id, "checkIn")}><button>Check in</button></form>}
            {!a.checkIn && ev.startsAt <= now && !a.absent && !absentNow(a, ev) && <form action={markAbsent.bind(null, a.id, true)}><button className="bad">Absent</button></form>}
            {a.absent && !a.absentCounted && <form action={markAbsent.bind(null, a.id, false)}><button className="ghost">Undo absent</button></form>}
            {a.checkIn && !a.checkOut && !absentNow(a, ev) && <form action={clock.bind(null, a.id, "checkOut")}><button>Check out</button></form>}
            {a.paid && <span className="tag ok">Paid ₹{a.payout}</span>}
            {a.checkOut && <form action={rate.bind(null, a.id)} className="row"><select name="rating" defaultValue={a.rating ?? 5} aria-label="Rating">{[5, 4, 3, 2, 1].map(n => <option key={n}>{n}</option>)}</select><button className="ghost">Rate</button></form>}</div>)}</div>)}</section></>
    })()}

    {tab === "events" && (!active.length ? <p className="card">No upcoming or ongoing events yet.</p> : active.map(e => <section key={e.id} className="evc"><div className="row"><div><b>{e.title}</b> {tag(e)}<div className="mute">{e.venue}, {e.city} · {when(e)}</div></div>
      <div className="acts"><Link href={`/events/${e.id}`} className="btn">View details</Link><form action={cancelEvent.bind(null, e.id)}><button className="bad">Cancel event</button></form></div></div>
      {e.roles.map(r => <p key={r.id} className="mute" style={{ margin: "6px 0 0" }}>{r.title} · {hrs(r)} · {acc(r)}/{r.slots} filled</p>)}
      <div className="role"><div className="row"><span>Crew pay <b>{inr(e.crewTotal)}</b></span><span>Commission <b>{inr(e.commission)}</b></span><span>Total <b>{inr(e.crewTotal + e.commission)}</b></span></div>
        {e.status === "PENDING" && e.payStatus === "UNPAID" && <Link href={`/organizer/checkout/${e.id}`} className="btn">Pay {inr(e.crewTotal + e.commission)} to continue</Link>}
        {e.status === "PENDING" && e.payStatus === "PAID" && <p className="mute" style={{ margin: "8px 0 0" }}>Payment received. Waiting for admin approval.</p>}
        {e.status === "PUBLISHED" && <p className="mute" style={{ margin: "8px 0 0" }}>Paid. The admin pays your crew after the event.</p>}</div></section>))}

    {tab === "history" && (!done.length ? <p className="card">Completed and cancelled events will appear here.</p> : done.map(e => { const rows = e.roles.flatMap(r => r.applications.filter(a => a.status === "ACCEPTED").map(a => ({ a, r }))), comp = label(e) === "COMPLETED"
      return <section key={e.id} className="evc"><div className="row"><div><b>{e.title}</b> {tag(e)}<div className="mute">{e.venue}, {e.city} · {when(e)}</div></div>
        <div style={{ textAlign: "right" }}>
          {comp && <div className="mute" style={{ marginBottom: "6px" }}>Paid out ₹{rows.filter(x => x.a.paid).reduce((n, x) => n + x.a.payout, 0)}{e.refunded > 0 && ` · Refunded to you ₹${e.refunded}`}</div>}
          {rows.length > 0 && <a href={`/api/export/crew?eventId=${e.id}`} className="btn ghost" style={{ padding: "4px 12px", fontSize: "0.8rem" }} download>📥 Export Roster (CSV)</a>}
        </div>
      </div>
        {!rows.length && <p className="mute">No participants.</p>}
        {rows.map(({ a, r }) => <div key={a.id} className="app"><span className="av">{a.user.name[0]}</span><div className="who"><b>{a.user.name}</b><div className="mute">{r.title}{comp && ` · ${hrs(r)}`}</div></div>
          <span className="mute">{attended(a) ? `In ${hm(a.checkIn)} · Out ${hm(a.checkOut)}` : "Absent"}</span>{a.rating && <span className="tag">★ {a.rating}</span>}
          {comp && (a.paid ? <span className="tag ok">Paid ₹{a.payout}</span> : e.crewTotal === 0 ? <span className="tag">Volunteer</span> : !attended(a) ? <span className="tag bad">No payout</span> : <span className="tag">Payout pending</span>)}</div>)}</section> }))}

    {tab === "payments" && await Payments(u.id, searchParams.s)}
  </>
}

// organizer payments: what you paid, what is still pending, and what the admin refunded
async function Payments(organizerId: string, f?: string) {
  // Automatically clean up abandoned unpaid drafts if a paid event with the same title already exists
  const paidTitles = (await db.event.findMany({ where: { organizerId, payStatus: "PAID" }, select: { title: true } })).map(t => t.title)
  if (paidTitles.length > 0) {
    await db.event.deleteMany({ where: { organizerId, status: "DRAFT", payStatus: "UNPAID", title: { in: paidTitles } } })
  }
  const all = await db.event.findMany({ where: { organizerId, OR: [{ payStatus: { in: ["PAID", "REFUNDED"] } }, { payStatus: "UNPAID", status: { in: ["DRAFT", "PENDING"] } }] }, orderBy: { startsAt: "desc" } })
  const total = (e: any) => e.crewTotal + e.commission
  const refund = (e: any) => (e.payStatus === "REFUNDED" ? total(e) : e.refunded || 0)
  const kinds: Record<string, (e: any) => boolean> = { paid: e => e.payStatus === "PAID", pending: e => e.payStatus === "UNPAID", refund: e => refund(e) > 0 }
  const sum = (k: string, g: (e: any) => number) => all.filter(kinds[k]).reduce((n, e) => n + g(e), 0), cnt = (k: string) => all.filter(kinds[k]).length
  const items: [string, string, number, number][] = [["paid", "Payment done", sum("paid", total), cnt("paid")], ["pending", "Payment pending", sum("pending", total), cnt("pending")], ["refund", "Refunded by admin", sum("refund", refund), cnt("refund")]]
  const sel = f && kinds[f] ? f : "", list = sel ? all.filter(kinds[sel]) : all
  return <><div className="stats">{items.map(([k, l, amt, n]) => <Link key={k} href={sel === k ? "/organizer?tab=payments" : `/organizer?tab=payments&s=${k}`} className={`card${sel === k ? " on" : ""}`}><b>{inr(amt)}</b>{l}<div className="mute">{n} {n === 1 ? "event" : "events"}</div></Link>)}</div>
    {!list.length ? <p className="card">No payments yet.</p> : list.map(e => <div key={e.id} className="card row"><div><b>{e.title}</b> {e.payStatus === "PAID" && <span className="tag ok">PAYMENT DONE</span>}{e.payStatus === "UNPAID" && <span className="tag bad">PAYMENT PENDING</span>}{e.payStatus === "REFUNDED" && <span className="tag">REFUNDED</span>}{e.payStatus === "PAID" && e.refunded > 0 && <> <span className="tag">REFUND {inr(e.refunded)}</span></>}
      <div className="mute">{e.startsAt.toLocaleDateString("en-IN")} · Crew {inr(e.crewTotal)} + fee {inr(e.commission)}{e.paidAt ? ` · Paid ${e.paidAt.toLocaleDateString("en-IN")}` : ""}{e.refundedAt && e.refunded > 0 ? ` · Refunded ${e.refundedAt.toLocaleDateString("en-IN")}` : ""}</div></div>
      <div className="acts"><b>{inr(total(e))}</b>{e.payStatus === "UNPAID" && <><Link href={`/organizer/checkout/${e.id}`} className="btn">Pay now</Link>{e.status === "DRAFT" && <form action={discardDraft.bind(null, e.id, "/organizer?tab=payments")}><button className="ghost bad">Discard</button></form>}</>}</div></div>)}</>
}
