import Link from "next/link"; import RoleBuilder from "@/components/RoleBuilder"; import ImageInput from "@/components/ImageInput"
import LocationPicker from "@/components/LocationPicker"
import { db } from "@/lib/db"; import { need } from "@/lib/auth"; import { createEvent, cancelEvent, rate, clock, markAbsent, discardDraft, submitQuery } from "../actions"; import { inr, attended, absentNow } from "@/lib/money"; import { sweepAbsences } from "@/lib/absence"; import { LOOK } from "@/lib/look"; import EventCard from "@/components/EventCard"; import { Stats } from "@/components/ui"; import SubmitBtn from "@/components/SubmitBtn"
const CATS = Object.keys(LOOK)
const TABS = [["create", "Create Event"], ["manage", "Manage Events"], ["events", "My Events"], ["payments", "Payments"], ["contact", "Contact Admin"]]
const hm = (d: Date | null) => (d ? d.toLocaleTimeString("en-IN", { timeStyle: "short" }) : "—")
export default async function Organizer({ searchParams }: { searchParams: { tab?: string; event?: string; s?: string; sent?: string } }) {
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

    {tab === "events" && (!events.length ? <p className="card">No events created yet. Use the Create Event tab to fund and launch your first event.</p> : events.map(e => {
      const rows = e.roles.flatMap(r => r.applications.filter(a => a.status === "ACCEPTED").map(a => ({ a, r })))
      const isEnded = e.endsAt < now
      return <section key={e.id} className="evc"><div className="row"><div><b>{e.title}</b> {tag(e)}<div className="mute">{e.venue}, {e.city} · {when(e)}</div></div>
      <div className="acts" style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <Link href={`/events/${e.id}`} className="btn ghost" style={{ padding: "6px 14px", fontSize: "0.85rem" }}>View Public Card</Link>
        {rows.length > 0 && <a href={`/api/export/crew?eventId=${e.id}`} className="btn" style={{ padding: "6px 14px", fontSize: "0.85rem", background: "#0284c7" }} download>📥 Attendance CSV</a>}
        {e.status === "PENDING" && <form action={cancelEvent.bind(null, e.id)}><button className="bad" style={{ padding: "6px 14px", fontSize: "0.85rem" }}>Cancel</button></form>}
      </div></div>
      {e.roles.map(r => <p key={r.id} className="mute" style={{ margin: "4px 0 0" }}>{r.title} · {hrs(r)} · {acc(r)}/{r.slots} filled</p>)}
      <div className="role" style={{ marginTop: "12px" }}>
        <div className="row">
          <span>Crew pay <b>{inr(e.crewTotal)}</b></span>
          <span>Platform fee (15%) <b>{inr(e.commission)}</b></span>
          <span>Total paid <b>{inr(e.crewTotal + e.commission)}</b></span>
          {e.refunded > 0 && <span style={{ color: "#16a34a" }}>Refunded: <b>{inr(e.refunded)}</b></span>}
        </div>
        {e.status === "PENDING" && e.payStatus === "UNPAID" && <Link href={`/organizer/checkout/${e.id}`} className="btn" style={{ marginTop: "10px" }}>Pay {inr(e.crewTotal + e.commission)} to continue</Link>}
        {e.status === "PENDING" && e.payStatus === "PAID" && <p className="mute" style={{ margin: "8px 0 0" }}>Payment completed (15% platform fee included). Awaiting Admin review & publishing.</p>}
        {e.status === "PUBLISHED" && !isEnded && <p className="mute" style={{ margin: "8px 0 0" }}>Live & Published. You can manage attendance in the Manage Events tab.</p>}
        {isEnded && <p className="mute" style={{ margin: "8px 0 0" }}>Event completed. Checked-out crew members are paid by Admin.</p>}
      </div></section>}))}

    {tab === "payments" && await Payments(u.id, searchParams.s)}

    {tab === "contact" && await ContactAdmin(u.id, searchParams.sent)}
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
  const items: [string, string, number, number][] = [["paid", "Payment done", sum("paid", total), cnt("paid")], ["pending", "Payment pending", sum("pending", total), cnt("pending")], ["refund", "Refunded for absentees", sum("refund", refund), cnt("refund")]]
  const sel = f && kinds[f] ? f : "", list = sel ? all.filter(kinds[sel]) : all
  return <><div className="stats">{items.map(([k, l, amt, n]) => <Link key={k} href={sel === k ? "/organizer?tab=payments" : `/organizer?tab=payments&s=${k}`} className={`card${sel === k ? " on" : ""}`}><b>{inr(amt)}</b>{l}<div className="mute">{n} {n === 1 ? "event" : "events"}</div></Link>)}</div>
    {!list.length ? <p className="card">No payments yet.</p> : list.map(e => <div key={e.id} className="card row"><div><b>{e.title}</b> {e.payStatus === "PAID" && <span className="tag ok">PAYMENT DONE</span>}{e.payStatus === "UNPAID" && <span className="tag bad">PAYMENT PENDING</span>}{e.payStatus === "REFUNDED" && <span className="tag">REFUNDED</span>}{e.payStatus === "PAID" && e.refunded > 0 && <> <span className="tag">REFUND {inr(e.refunded)}</span></>}
      <div className="mute">{e.startsAt.toLocaleDateString("en-IN")} · Crew {inr(e.crewTotal)} + fee {inr(e.commission)}{e.paidAt ? ` · Paid ${e.paidAt.toLocaleDateString("en-IN")}` : ""}{e.refundedAt && e.refunded > 0 ? ` · Refunded ${e.refundedAt.toLocaleDateString("en-IN")}` : ""}</div></div>
      <div className="acts"><b>{inr(total(e))}</b>{e.payStatus === "UNPAID" && <><Link href={`/organizer/checkout/${e.id}`} className="btn">Pay now</Link>{e.status === "DRAFT" && <form action={discardDraft.bind(null, e.id, "/organizer?tab=payments")}><button className="ghost bad">Discard</button></form>}</>}</div></div>)}</>
}

// Contact Admin Form & History
async function ContactAdmin(userId: string, sent?: string) {
  const queries = await db.supportQuery.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  })

  return (
    <>
      {sent && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "12px 18px", marginBottom: "18px", color: "#065f46", fontSize: "0.9rem" }}>
          ✓ <b>Query / Complaint Sent Successfully!</b> The Admin has received your message and will review it promptly. You will get an in-app notification when answered.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", alignItems: "start" }}>
        {/* Submission Form */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Contact Admin</h2>
          <p className="mute">Submit any query, complaint, payment dispute, or crowd requirement assistance directly to the Admin team.</p>

          <form action={submitQuery} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label htmlFor="subject" style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Subject</label>
              <input id="subject" name="subject" placeholder="Brief summary of your query or issue" required style={{ width: "100%" }} />
            </div>

            <div>
              <label htmlFor="category" style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Category</label>
              <select id="category" name="category" defaultValue="QUERY" style={{ width: "100%" }}>
                <option value="QUERY">General Query</option>
                <option value="COMPLAINT">Complaint regarding volunteer</option>
                <option value="PAYMENT">Payment & Refund inquiry</option>
                <option value="URGENT">Urgent Crowd Management Request</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Message / Details</label>
              <textarea id="message" name="message" rows={4} placeholder="Describe your query or complaint in detail..." required style={{ width: "100%" }} />
            </div>

            <div style={{ marginTop: "6px" }}>
              <SubmitBtn pendingText="Sending to Admin...">Send to Admin ✉</SubmitBtn>
            </div>
          </form>
        </div>

        {/* Previous Messages & Responses */}
        <div>
          <h2>Your Queries & Complaints History</h2>
          <p className="mute">Track responses from the Admin.</p>

          {!queries.length ? (
            <p className="card mute">You have not submitted any queries or complaints yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {queries.map(q => (
                <div key={q.id} className="card" style={{ padding: "14px 18px", borderLeft: q.status === "ANSWERED" ? "4px solid #16a34a" : "4px solid #eab308" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <b>{q.subject}</b>
                    <span className={`tag ${q.status === "ANSWERED" ? "ok" : ""}`}>{q.status}</span>
                  </div>
                  <div className="mute" style={{ fontSize: "0.8rem", marginBottom: "8px" }}>
                    Category: <b>{q.category}</b> · Sent on {q.createdAt.toLocaleDateString("en-IN")} at {q.createdAt.toLocaleTimeString("en-IN", { timeStyle: "short" })}
                  </div>
                  <p style={{ margin: "4px 0 10px", fontSize: "0.9rem" }}>{q.message}</p>

                  {q.answer ? (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "10px 14px", marginTop: "8px" }}>
                      <b style={{ color: "#166534", fontSize: "0.85rem" }}>💬 Admin Response:</b>
                      <p style={{ margin: "4px 0 0", color: "#14532d", fontSize: "0.9rem" }}>{q.answer}</p>
                      {q.answeredAt && (
                        <div className="mute" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                          Answered on {q.answeredAt.toLocaleDateString("en-IN")} at {q.answeredAt.toLocaleTimeString("en-IN", { timeStyle: "short" })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mute" style={{ fontSize: "0.82rem", fontStyle: "italic" }}>
                      ⏳ Awaiting response from Admin...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

