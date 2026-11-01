import Link from "next/link"; import { look } from "@/lib/look"; import { when, mapUrl, dirUrl, inr } from "@/lib/money"; import { Tag } from "./ui"
export default function EventDetail({ e, back, children }: { e: any; back: [string, string]; children?: React.ReactNode }) {
  const [icon, g] = look(e.category), max = Math.max(0, ...e.roles.map((r: any) => r.pay))
  const rows = [["Event", e.title], ["Date and time", when(e)], ["Pay", max ? `Up to ${inr(max)} per person` : "Unpaid volunteering"], ["Shift length", e.roles.map((r: any) => `${r.title}: ${r.hours ? r.hours + " hrs" : "–"}`).join(" · ")], ["Location", `${e.venue}, ${e.city}`], ["Organizer", e.organizer.orgName || e.organizer.name]]
  return <><p><Link href={back[0]}>← {back[1]}</Link></p><div className="dgrid"><div className="pos">
    {e.poster ? <><img className="pimg" src={e.poster} alt={`${e.title} poster`} /><p><a className="btn" href={e.poster} download style={{ display: "block", textAlign: "center" }}>Download poster</a></p></> : <div className="pimg ph" style={{ background: `linear-gradient(150deg,${g})` }}>{icon}</div>}</div>
    <div className="inf"><h2 style={{ marginTop: 0 }}>{e.title} <Tag>{e.category}</Tag></h2><p>{e.description}</p><div className="card">{rows.map(([k, v]) => <p key={k} className="kv"><span className="mute">{k}</span><br /><b>{v}</b></p>)}
      <p className="acts"><a className="btn" href={mapUrl(e)} target="_blank" rel="noopener noreferrer">Open in Google Maps</a><a className="btn dark" href={dirUrl(e)} target="_blank" rel="noopener noreferrer">Get directions</a></p></div></div></div>{children}</>
}
