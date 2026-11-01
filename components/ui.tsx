import Link from "next/link"
export const Tag = ({ c = "", children }: { c?: string; children: React.ReactNode }) => <span className={`tag ${c}`}>{children}</span>
export const Back = ({ href, label = "Back" }: { href: string; label?: string }) => <p><Link href={href}>← {label}</Link></p>
export const Cards = ({ base, items }: { base: string; items: [string, string, number][] }) =>
  <div className="stats">{items.map(([k, l, n]) => <Link key={k} href={`${base}?s=${k}`} className="card"><b>{n}</b>{l}<div className="mute">Tap to open</div></Link>)}</div>
export const Stats = ({ items }: { items: [string | number, string][] }) => <div className="stats">{items.map(([n, l]) => <div key={l} className="card"><b>{n}</b>{l}</div>)}</div>
