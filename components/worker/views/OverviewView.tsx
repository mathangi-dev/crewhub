"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATS } from "@/lib/worker/data";
import { PASTEL, completion, money, spots, wageOf } from "@/lib/worker/format";
import { AsgCard, Badge, JobCard, OfferBanner } from "../ui";
import { useWorker } from "../WorkerProvider";

export default function OverviewView() {
  const { events, apps, profile } = useWorker();
  const router = useRouter();
  const [q, setQ] = useState("");
  const open = events.filter((e) => spots(e) > 0).length;
  const count = (s: string) => apps.filter((a) => a.st === s).length;
  const stats = [
    { href: "/worker/events", icon: "event_available", n: open, label: "Available events" },
    { href: "/worker/applications?f=All", icon: "assignment", n: apps.length, label: "Total applications" },
    { href: "/worker/applications?f=Confirmed", icon: "task_alt", n: count("Confirmed"), label: "Confirmed" },
    { href: "/worker/applications?f=Waitlisted", icon: "hourglass_top", n: count("Waitlisted"), label: "Waitlisted" },
  ];

  const getEvent = (evId?: string) => (evId ? events.find((e) => e.id === evId) : undefined);
  const upcoming = apps
    .filter((a) => a.st === "Confirmed" && a.ev)
    .sort((a, b) => {
      const ea = getEvent(a.ev);
      const eb = getEvent(b.ev);
      return (ea?.t || "") < (eb?.t || "") ? -1 : 1;
    });

  const applied = new Set(apps.map((a) => a.ev));
  const openList = events.filter((e) => spots(e) > 0 && !applied.has(e.id)).slice(0, 4);
  const recent = [...apps].slice(0, 3);
  const nameOf = (ev?: string, name?: string) => (ev ? (getEvent(ev)?.n || name) : name);

  return (
    <>
      <div className="hero2">
        <div className="top">
          <span className="hi" id="hi">Hi, {profile.name.split(" ")[0] || "there"}</span>
          <Link className="pp" href="/worker/profile">Complete your profile <b id="pt">{completion(profile)}%</b></Link>
        </div>
        <h1>Explore <span className="lav" id="hn">{open} open event{open === 1 ? "" : "s"}</span></h1>
        <div className="cats2" id="cats">
          {CATS.map((c, i) => (
            <Link key={c} className="cpill" href={`/worker/events?cat=${encodeURIComponent(c)}`}>
              {c}<b style={{ background: PASTEL[i % 5] }}>{events.filter((e) => e.jobs.some((j) => j.n === c && j.s > 0)).length}</b>
            </Link>
          ))}
        </div>
      </div>
      <form className="sbar" id="hs" role="search" onSubmit={(e) => { e.preventDefault(); router.push("/worker/events?q=" + encodeURIComponent(q.trim())); }}>
        <span className="ms" style={{ color: "var(--muted)" }}>search</span>
        <input id="hq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for events" aria-label="Search events" />
        <button className="btn sm" type="submit">Search</button>
      </form>

      <OfferBanner />

      <div className="stats" id="stats">
        {stats.map((s, i) => (
          <Link key={s.label} className={"stat s" + i} href={s.href}>
            <span className="ic"><span className="ms">{s.icon}</span></span>
            <div><strong>{s.n}</strong><small>{s.label}</small></div>
          </Link>
        ))}
      </div>

      <section className="blk">
        <div className="ph0"><h2>Upcoming assignments</h2><Link href="/worker/my-events">View all</Link></div>
        <div id="ua">
          {upcoming.length ? upcoming.map((a, idx) => {
            const e = getEvent(a.ev);
            if (!e) return null;
            return <AsgCard key={a.id} e={e} idx={idx} job={a.job} wage={wageOf(events, a)} status={a.st} attendance={a.attendance} />;
          }) : <div className="panel empty">No upcoming assignments yet. <Link href="/worker/events" style={{ color: "var(--blue)" }}>Find events</Link></div>}
        </div>
      </section>

      <section className="blk">
        <div className="ph0"><h2>Events for you</h2><Link href="/worker/events">See all</Link></div>
        <div id="oe">
          {openList.length === 0 ? <div className="panel empty">No open events right now.</div> : (
            <>
              <Link className="feat" href={`/worker/events/${openList[0].id}`}>
                <span className="lg"><span className="ms">{openList[0].i}</span></span>
                <div><small>Featured</small><b>{openList[0].n}</b><span>{openList[0].v}, {openList[0].city} · {money(Math.max(...openList[0].jobs.map((j) => j.w)))}/day</span></div>
              </Link>
              {openList.slice(1).map((e) => <JobCard key={e.id} e={e} />)}
            </>
          )}
        </div>
      </section>

      <section className="blk">
        <div className="panel">
          <div className="ph"><h2>Recent applications</h2><Link href="/worker/applications">View all</Link></div>
          <div className="scroll"><table>
            <thead><tr><th>Event</th><th>Job category</th><th>Applied</th><th>Status</th><th>Waitlist</th></tr></thead>
            <tbody id="ra">{recent.map((a) => (
              <tr key={a.id}><td><b>{nameOf(a.ev, a.name)}</b></td><td>{a.job}</td><td>{a.at}</td><td><Badge st={a.st} /></td><td>{a.pos ? "#" + a.pos : "–"}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      </section>
    </>
  );
}
