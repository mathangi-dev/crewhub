import Link from "next/link"; import { db } from "@/lib/db"; import { need } from "@/lib/auth"; import { userAct } from "@/app/actions"; import { Tag, Back, Cards } from "./ui"; import AdminBank from "./AdminBank"; import { MAX_ABSENCES } from "@/lib/money"
const LB: Record<string, string> = { PENDING: "Awaiting approval", APPROVED: "Approved", REJECTED: "Rejected", SUSPENDED: "Suspended" }
const st = (u: any) => (u.suspended ? "SUSPENDED" : u.approval)
const cls = (s: string) => (s === "APPROVED" ? "ok" : s === "PENDING" ? "" : "bad")
export default async function AdminPeople({ role, base, sp, title, desc }: { role: "VOLUNTEER" | "ORGANIZER"; base: string; sp: { s?: string; id?: string }; title: string; desc: string }) {
  await need("ADMIN")
  const users: any[] = await db.user.findMany({ where: { role }, orderBy: { name: "asc" } })
  const fields = (u: any): string[][] => role === "VOLUNTEER" ? [["City", u.city], ["Skills", u.skills], ["Interests", u.interests], ["Availability", u.availability], ["Absences", `${u.absences} / ${MAX_ABSENCES}`], ["Terms accepted", u.termsAcceptedAt ? u.termsAcceptedAt.toLocaleDateString("en-IN") : "Not yet"]] : [["Organization", u.orgName], ["City", u.city], ["Verification info", u.verifyInfo]]
  const btns = (u: any) => { const s = st(u); return s === "PENDING" ? <><form action={userAct.bind(null, u.id, "APPROVED")}><button>Approve</button></form><form action={userAct.bind(null, u.id, "REJECTED")}><button className="bad">Reject</button></form></>
    : s === "APPROVED" ? <form action={userAct.bind(null, u.id, "SUSPEND")}><button className="ghost">Suspend</button></form>
    : s === "SUSPENDED" ? <form action={userAct.bind(null, u.id, "REINSTATE")}><button className="ghost">Reinstate</button></form>
    : <form action={userAct.bind(null, u.id, "APPROVED")}><button className="ghost">Approve</button></form> }
  const head = <><div className="dh"><div><span className="mute">Admin dashboard</span><h1>{title}</h1></div></div></>
  const one = sp.id ? users.find(u => u.id === sp.id) : null
  if (one) return <>{head}<Back href={`${base}?s=${sp.s || st(one)}`} /><section className="evc"><div className="row"><div><b>{one.name}</b> <Tag c={cls(st(one))}>{LB[st(one)]}</Tag><div className="mute">{one.email}</div></div><div className="acts">{btns(one)}</div></div>
    <div className="role">{fields(one).map(([k, v]) => <p key={k} className="kv"><span className="mute">{k}</span><br /><b>{v || "—"}</b></p>)}{one.bio && <p className="kv"><span className="mute">About</span><br /><b>{one.bio}</b></p>}<AdminBank u={one} /></div></section></>
  if (!sp.s || !LB[sp.s]) return <>{head}<Cards base={base} items={Object.keys(LB).map(k => [k, LB[k], users.filter(u => st(u) === k).length] as [string, string, number])} /></>
  const list = users.filter(u => st(u) === sp.s)
  return <>{head}<Back href={base} label="All" /><h2>{LB[sp.s]}</h2>{list.length ? list.map(u => <Link key={u.id} href={`${base}?s=${sp.s}&id=${u.id}`} className="card row"><div><b>{u.name}</b> <Tag c={cls(st(u))}>{LB[st(u)]}</Tag><div className="mute">{u.email} · {fields(u).filter(f => f[0] !== "Absences" && f[0] !== "Terms accepted").map(f => f[1]).filter(Boolean).join(" · ")}</div></div></Link>) : <p className="mute">Nothing here.</p>}</>
}
