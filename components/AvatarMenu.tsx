"use client"
import { useEffect, useRef, useState } from "react"; import Link from "next/link"
export default function AvatarMenu({ name, email, profile, logout }: { name: string; email: string; profile: string; logout: () => Promise<void> }) {
  const [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }, key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("click", click); document.addEventListener("keydown", key)
    return () => { document.removeEventListener("click", click); document.removeEventListener("keydown", key) }
  }, [])
  return <div className="acct" ref={ref}><button type="button" className="avbtn" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen(!open)}>{(name[0] || "?").toUpperCase()}</button>
    {open && <div className="menu" role="menu"><div className="who2"><b>{name}</b><span className="mute">{email}</span></div>
      <Link href={profile} role="menuitem" onClick={() => setOpen(false)}>Profile</Link><form action={logout}><button role="menuitem">Log out</button></form></div>}</div>
}
