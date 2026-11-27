"use client";
import Link from "next/link";
import type { Ev, Hist } from "@/lib/worker/types";
import { PAST, maxWage, money, roleLabel } from "@/lib/worker/format";
import { useWorker } from "./WorkerProvider";

export function Ms({ n, s }: { n: string; s?: number }) {
  return <span className="ms" style={s ? { fontSize: s } : undefined}>{n}</span>;
}

const BADGE: Record<string, string> = {
  Confirmed: "ok", Completed: "ok", Waitlisted: "wait", Pending: "pend", Recorded: "pend",
  Rejected: "bad", Cancelled: "bad", Disputed: "bad",
};
export function Badge({ st }: { st: string }) {
  return <span className={"badge " + (BADGE[st] ?? "wait")}>{st}</span>;
}

const TAG: Record<string, string> = { Popular: "tg-pop", New: "tg-new", Trending: "tg-trend" };
export function Tags({ e }: { e: Ev }) {
  return <>{e.tags.map((t) => <span key={t} className={"tag " + (TAG[t] ?? "tg-grey")}>{t}</span>)}</>;
}

/** White list card used for "Events for you". */
export function JobCard({ e }: { e: Ev }) {
  return (
    <Link className="jc" href={`/worker/events/${e.id}`}>
      <span className="lg"><span className="ms">{e.i}</span></span>
      <div className="jm">
        <b>{e.n}</b>
        <span>{e.v}, {e.city} · {e.d}</span>
        <div><Tags e={e} /><span className="tag tg-grey">{money(maxWage(e))}/day</span><span className="tag tg-grey">{roleLabel(e)}</span></div>
      </div>
      <span className="ms" style={{ color: "var(--muted)" }}>arrow_forward</span>
    </Link>
  );
}

/** Upcoming assignment card (date tile + details + status). */
export function AsgCard({
  e,
  job,
  wage,
  status,
  idx = 0,
  attendance,
}: {
  e: Ev;
  job: string;
  wage: number;
  status: string;
  idx?: number;
  attendance?: any;
}) {
  const parts = (e.d || "").split(" ");
  const day = parts[0] || "–";
  const mon = parts[1] || "";
  const timeStart = (e.time || "").split(" to ")[0];

  const attTime = (iso?: string | null) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "numeric", hour12: true });
    } catch {
      return "";
    }
  };

  return (
    <article className="asg">
      <div className="dtile" style={{ background: PAST[idx % 4] }}><b>{day}</b><span>{mon}</span></div>
      <div className="ai">
        <b>{e.n}</b>
        <span className="ln"><Ms n="location_on" />{e.v}, {e.city}</span>
        <span className="ln"><Ms n="schedule" />{timeStart} · Report by {e.rep}</span>
        <div className="tags">
          <span className="tag tg-grey">{job}</span>
          <span className="tag tg-grey">{money(wage)}/day</span>
          {attendance?.status === "CHECKED_IN" && (
            <span className="tag" style={{ background: "#e6f7ef", color: "#05944f", fontWeight: 600 }}>
              <Ms n="how_to_reg" s={16} /> Checked In {attTime(attendance.checkInAt) ? `(${attTime(attendance.checkInAt)})` : ""}
            </span>
          )}
          {attendance?.status === "CHECKED_OUT" && (
            <span className="tag" style={{ background: "#eaf1fb", color: "#1a73e8", fontWeight: 600 }}>
              <Ms n="done_all" s={16} /> Checked Out {attTime(attendance.checkOutAt) ? `(${attTime(attendance.checkOutAt)})` : ""}
            </span>
          )}
          {attendance?.status === "ABSENT" && (
            <span className="tag" style={{ background: "#fde8e8", color: "#e11900", fontWeight: 600 }}>
              <Ms n="person_off" s={16} /> Marked Absent
            </span>
          )}
          {attendance?.status === "LATE" && (
            <span className="tag" style={{ background: "#fff4d9", color: "#925c00", fontWeight: 600 }}>
              <Ms n="schedule" s={16} /> Checked In (Late)
            </span>
          )}
        </div>
      </div>
      <div className="aa"><Badge st={status} /><Link className="btn sm" href={`/worker/events/${e.id}`}>View details</Link></div>
    </article>
  );
}

/** Past event card: same layout as AsgCard, no detail link. */
export function HistCard({ h, i, status }: { h: Hist; i: number; status: "Completed" | "Cancelled" }) {
  const parts = (h.d || "").split(" ");
  const day = parts[0] || "–";
  const mon = parts[1] || "";
  return (
    <article className="asg">
      <div className="dtile" style={{ background: status === "Cancelled" ? "#F4C5DC" : PAST[i % 4] }}><b>{day}</b><span>{mon}</span></div>
      <div className="ai">
        <b>{h.n}</b>
        {h.v && <span className="ln"><Ms n="location_on" />{h.v}</span>}
        <span className="ln"><Ms n="event" />{h.d}</span>
        <div className="tags"><span className="tag tg-grey">{h.job}</span>{h.w > 0 && <span className="tag tg-grey">{money(h.w)}/day</span>}</div>
      </div>
      <div className="aa"><Badge st={status} /></div>
    </article>
  );
}

export function OfferBanner() {
  const { offer, apps, events, acceptOffer, declineOffer } = useWorker();
  if (!offer) return null;
  const a = apps.find((x) => x.id === offer.app);
  if (!a) return null;
  const ev = a.ev ? events.find((x) => x.id === a.ev) : null;
  const name = ev ? ev.n : a.name || "Event";

  return (
    <div className="offer" id="offer" role="status">
      <span className="ms" style={{ color: "var(--blue)" }}>notification_important</span>
      <div className="t">
        <b id="ob">Replacement offer: {name}, {a.job}</b>
        <span id="os">A spot opened up. Respond before {offer.until} or it goes to the next person.</span>
      </div>
      <button className="btn green sm" data-act="accept" onClick={acceptOffer}>Accept</button>
      <button className="btn sec sm" data-act="decline" onClick={declineOffer}>Decline</button>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="panel empty">{children}</div>;
}
