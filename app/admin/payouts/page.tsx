import Link from "next/link"; import { db } from "@/lib/db"; import { need } from "@/lib/auth"; import { payoutAll } from "../../actions"; import { Tag, Stats } from "@/components/ui"; import EventPayout from "@/components/EventPayout"; import { accepted, inr, when } from "@/lib/money"; import { payState } from "@/lib/payroll"
export default async function Page({ searchParams: sp }: { searchParams: { id?: string } }) {
  await need("ADMIN"); const base = "/admin/payouts"
  const head = <><div className="dh"><div><span className="mute">Admin dashboard</span><h1>Payouts</h1></div></div></>
  if (sp.id) return <div className="compact">{head}<EventPayout id={sp.id} backHref={base} /></div>
  const now = new Date()
  const evs: any[] = (await db.event.findMany({ where: { status: "PUBLISHED", payStatus: "PAID" }, orderBy: { endsAt: "desc" }, include: { organizer: true, roles: { include: { applications: { include: { user: true } } } } } })).filter((e: any) => accepted(e).length)
  const rows = (e: any) => accepted(e).map(({ a, r }) => ({ a, r, s: payState(a, r, e.endsAt <= now) }))
  const due = (e: any) => rows(e).filter(x => x.s === "DUE").reduce((n, x) => n + x.r.pay, 0), paidSum = (e: any) => rows(e).filter(x => x.s === "PAID").reduce((n, x) => n + x.a.payout, 0)
  return <div className="compact">{head}<Stats items={[[inr(evs.reduce((n, e) => n + due(e), 0)), "Ready to pay"], [inr(evs.reduce((n, e) => n + paidSum(e), 0)), "Paid to volunteers"], [evs.filter(e => due(e) > 0).length, "Events to pay"]]} />
    <p><a href={`${base}/csv`} className="btn" download>Download CSV of all payouts</a></p>
    <h2>Approved events</h2>{evs.map(e => { const r = rows(e); return <div key={e.id} className="card row"><div><b>{e.title}</b> <Tag c="ok">APPROVED</Tag><div className="mute">{e.organizer.orgName || e.organizer.name} · {when(e)} · {r.length} accepted · {r.filter(x => x.a.checkIn && x.a.checkOut).length} attended · {r.filter(x => x.s === "ABSENT").length} absent · paid {r.filter(x => x.s === "PAID").length}</div></div>
      <div className="acts"><Link href={`${base}?id=${e.id}`} className="btn">View attendance</Link>{due(e) > 0 && <a href={`${base}/csv?id=${e.id}`} className="btn" download>CSV</a>}{due(e) > 0 ? <form action={payoutAll.bind(null, e.id)}><button disabled={e.endsAt > now}>Pay all {inr(due(e))}</button></form> : <Tag c="ok">Nothing due</Tag>}</div></div> })}
    {!evs.length && <p className="mute">No approved events with volunteers yet.</p>}</div>
}
