import Link from "next/link"; import { look } from "@/lib/look"; import { inr } from "@/lib/money"
export default function EventCard({ href, e, sub, badge, distance }: { href: string; e: any; sub: React.ReactNode; badge?: string; distance?: number | null }) {
  const [icon, g] = look(e.category), max = Math.max(0, ...e.roles.map((r: any) => r.pay))
  const dist = distance ?? e.distance
  const isNearby = dist != null && dist <= (e.radiusKm || 20)
  return <Link href={href} className="ev"><div className="pic" style={e.cardImage ? { backgroundImage: `url(${e.cardImage})`, backgroundSize: "cover", backgroundPosition: "center", position: "relative" } : { background: `linear-gradient(150deg,${g})`, position: "relative" }}>
    {!e.cardImage && icon}
    {dist != null && (
      <span style={{
        position: "absolute",
        top: 10,
        left: 10,
        background: isNearby ? "#067647" : "#0f172a",
        color: "#fff",
        padding: "4px 10px",
        borderRadius: "99px",
        fontSize: "0.74rem",
        fontWeight: 700,
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: "4px"
      }}>
        📍 {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)} km`}
        {isNearby && <span style={{ opacity: 0.9 }}>· Nearby</span>}
      </span>
    )}
  </div>
    <div className="meta"><div><b>{e.title}</b><span className="mute">{e.venue}, {e.city} · {e.startsAt.toLocaleDateString("en-IN")}</span></div><span className="score">{badge ?? (max ? `Up to ${inr(max)}` : "Volunteer")}</span></div><div className="mute" style={{ padding: "6px 4px 0" }}>{sub}</div></Link>
}
