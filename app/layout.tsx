import "./globals.css"; import Link from "next/link"; import { me } from "@/lib/auth"; import { logout } from "./actions"; import NavTabs from "@/components/NavTabs"; import AvatarMenu from "@/components/AvatarMenu"; import NotificationBell from "@/components/NotificationBell"; import { Suspense } from "react"; import { sweepAbsences } from "@/lib/absence"
export const metadata = { title: "CrewHub", description: "Find Work. Build Experience." }
const ADMIN = [["/admin/volunteers", "Volunteers"], ["/admin/organizers", "Organizers"], ["/admin/events", "Events"], ["/admin/payments", "Payments"], ["/admin/payouts", "Payouts"]]
const ORG = [["/organizer?tab=create", "Create Event"], ["/organizer?tab=manage", "Manage Events"], ["/organizer?tab=events", "My Events"], ["/organizer?tab=history", "History"], ["/organizer?tab=payments", "Payments"]]
const VOL = [["/volunteer/events", "Events"], ["/volunteer/my-events", "My Events"], ["/volunteer/applications", "My Applications"], ["/volunteer/history", "Event History"], ["/volunteer/payments", "Payment History"]]
export default async function Layout({ children }: { children: React.ReactNode }) {
  await sweepAbsences(); const u = await me(); const home = u?.role === "ADMIN" ? "/admin" : u?.role === "ORGANIZER" ? "/organizer" : "/volunteer"
  const logo = <Link href="/" className="logo"><img src="/logo.png" alt="" /><span>Crew<b>Hub</b></span></Link>
  return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;800&display=swap" rel="stylesheet" /></head>
    <body>{u?.role === "ADMIN" ? <nav className="tabs3">{logo}<Suspense><NavTabs tabs={ADMIN} /></Suspense><div className="right" style={{ display: "flex", alignItems: "center", gap: "10px" }}><NotificationBell /><AvatarMenu name={u.name} email={u.email} profile="/admin/profile" logout={logout} /></div></nav>
      : u?.role === "VOLUNTEER" ? <nav className="tabs3">{logo}<Suspense><NavTabs tabs={VOL} /></Suspense><div className="right" style={{ display: "flex", alignItems: "center", gap: "10px" }}><NotificationBell /><AvatarMenu name={u.name} email={u.email} profile="/volunteer/profile" logout={logout} /></div></nav>
      : u?.role === "ORGANIZER" ? <nav className="tabs3">{logo}<Suspense><NavTabs tabs={ORG} /></Suspense><div className="right" style={{ display: "flex", alignItems: "center", gap: "10px" }}><NotificationBell /><AvatarMenu name={u.orgName || u.name} email={u.email} profile="/organizer/profile" logout={logout} /></div></nav>
      : <nav>{logo}
        <div className="mid"><Link href="/#about">About</Link><Link href="/#events">Events</Link><Link href="/#how">How it works</Link></div>
        <div>{u ? <><Link href={home} className="pill">Dashboard</Link><form action={logout}><button>Log out</button></form></> : <><Link href="/register">Sign up</Link><Link href="/login" className="pill">Log in</Link></>}</div></nav>}
      <main>{children}</main></body></html>
}
