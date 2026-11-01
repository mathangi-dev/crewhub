"use client"
import Link from "next/link"; import { usePathname, useSearchParams } from "next/navigation"
export default function NavTabs({ tabs }: { tabs: string[][] }) {
  const p = usePathname(), q = useSearchParams()
  const cur = p === "/organizer" ? `/organizer?tab=${q.get("tab") || "create"}` : p // organizer sections are ?tab= links
  return <div className="caps" role="navigation" aria-label="Sections">{tabs.map(([h, l]) => <Link key={h} href={h} aria-current={cur === h || cur.startsWith(h + "/") ? "page" : undefined}>{l}</Link>)}</div>
}
