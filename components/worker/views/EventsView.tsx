"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { maxWage, money, roleLabel, spots } from "@/lib/worker/format";
import { useWorker } from "../WorkerProvider";

export default function EventsView() {
  const { events } = useWorker();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [loc, setLoc] = useState("");
  const [dist, setDist] = useState("Any distance");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState<"date" | "wage">("date");
  const [list, setList] = useState(false);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase(), city = loc.trim().toLowerCase();
    return events
      .filter((e) =>
        (!query || `${e.n} ${e.v} ${e.city}`.toLowerCase().includes(query)) &&
        (!city || e.city.toLowerCase().includes(city)) &&
        (!date || e.t >= date))
      .sort((a, b) => (sort === "wage" ? maxWage(b) - maxWage(a) : a.t < b.t ? -1 : 1));
  }, [events, q, loc, date, sort]);

  return (
    <>
      <div className="head"><div><h1>Explore events</h1><p className="sub">Open roles you can apply for right now.</p></div></div>
      <label className="search"><span className="ms" style={{ color: "var(--muted)" }}>search</span><input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by event name or location" aria-label="Search events" /></label>
      <div className="cols">
        <aside className="panel filters" aria-label="Filters">
          <h3>Location</h3><input type="text" id="loc" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City" />
          <h3>Distance</h3>
          <select value={dist} onChange={(e) => setDist(e.target.value)}>
            <option>Any distance</option><option>Within 10 km</option><option>Within 25 km</option><option>Within 50 km</option>
          </select>
          <h3>Event date</h3><input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Event date" />
        </aside>
        <div>
          <div className="tool">
            <span className="sub" id="count">{rows.length} event{rows.length === 1 ? "" : "s"}</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as "date" | "wage")} aria-label="Sort">
                <option value="date">Sort: Date</option><option value="wage">Sort: Wage, high to low</option>
              </select>
              <div className="tg" role="group" aria-label="Layout">
                <button id="g" className={list ? "" : "on"} onClick={() => setList(false)} aria-label="Grid view"><span className="ms">grid_view</span></button>
                <button id="l" className={list ? "on" : ""} onClick={() => setList(true)} aria-label="List view"><span className="ms">view_list</span></button>
              </div>
            </div>
          </div>
          <div className={"grid" + (list ? " list" : "")} id="res">
            {rows.length === 0 ? (
              <div className="panel empty" style={{ gridColumn: "1/-1" }}>No events match your filters. Try clearing a filter.</div>
            ) : rows.map((e) => {
              const n = spots(e);
              return (
                <article className="ev" key={e.id}>
                  <div className="po" style={{ background: e.b }}><span className="ms">{e.i}</span><em>{e.c}</em></div>
                  <div className="bd">
                    <b>{e.n}</b>
                    <span className="sb">{e.v}, {e.city} · {e.d}</span>
                    <div className="jb"><span className="ms">work</span>{roleLabel(e)}<strong>{e.jobs.length > 1 ? "Up to " : ""}{money(maxWage(e))}/day</strong></div>
                    <span className={"sl" + (n ? "" : " w")}>{n ? `${n} spots left` : "Waitlist open"}</span>
                    <Link className="btn sm" href={`/worker/events/${e.id}`}>View event</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
