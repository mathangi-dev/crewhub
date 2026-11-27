"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HIST } from "@/lib/worker/data";
import { wageOf } from "@/lib/worker/format";
import { AsgCard, Empty, HistCard } from "../ui";
import { useWorker } from "../WorkerProvider";

export default function MyEventsView() {
  const { apps, events } = useWorker();
  const router = useRouter();
  const tab = useSearchParams().get("tab") === "history" ? "history" : "upcoming";

  const getEvent = (evId?: string) => (evId ? events.find((e) => e.id === evId) : undefined);
  const upcoming = apps
    .filter((a) => a.st === "Confirmed" && a.ev)
    .sort((a, b) => {
      const ea = getEvent(a.ev);
      const eb = getEvent(b.ev);
      return (ea?.t || "") < (eb?.t || "") ? -1 : 1;
    });

  const history = [
    ...HIST.map((h) => ({ h, status: "Completed" as const })),
    ...apps
      .filter((a) => a.st === "Cancelled")
      .map((a) => {
        const ev = getEvent(a.ev);
        return {
          h: { n: ev ? ev.n : a.name ?? "Event", d: a.at, v: ev?.v || "", job: a.job, w: 0 },
          status: "Cancelled" as const,
        };
      }),
  ];

  return (
    <>
      <div className="head"><div><h1>My events</h1><p className="sub">Your assignments and past events.</p></div></div>
      <div className="tabs">
        <button className={tab === "upcoming" ? "on" : ""} data-act="mt" data-t="Upcoming" onClick={() => router.replace("/worker/my-events")}>Upcoming</button>
        <button className={tab === "history" ? "on" : ""} data-act="mt" data-t="History" onClick={() => router.replace("/worker/my-events?tab=history")}>History</button>
      </div>
      {tab === "upcoming" ? (
        upcoming.length ? (
          upcoming.map((a, idx) => {
            const e = getEvent(a.ev);
            if (!e) return null;
            return <AsgCard key={a.id} e={e} idx={idx} job={a.job} wage={wageOf(events, a)} status={a.st} attendance={a.attendance} />;
          })
        ) : (
          <div className="panel empty">No upcoming assignments. <Link href="/worker/events" style={{ color: "var(--blue)" }}>Explore events</Link></div>
        )
      ) : (
        history.length ? history.map((x, i) => <HistCard key={i} h={x.h} i={i} status={x.status} />) : <div className="panel empty">No past events yet.</div>
      )}
    </>
  );
}
