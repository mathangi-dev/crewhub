"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, OfferBanner } from "../ui";
import { useWorker } from "../WorkerProvider";

const FILTERS = ["All", "Pending", "Confirmed", "Waitlisted", "Rejected", "Cancelled"];

export default function ApplicationsView() {
  const { apps, events, cancelApp } = useWorker();
  const router = useRouter();
  const sp = useSearchParams();
  const f = FILTERS.includes(sp.get("f") ?? "") ? sp.get("f")! : "All";
  const rows = apps.filter((a) => f === "All" || a.st === f);
  const count = (s: string) => (s === "All" ? apps.length : apps.filter((a) => a.st === s).length);

  return (
    <>
      <div className="head"><div><h1>My applications</h1><p className="sub">Track every application and your place in line.</p></div></div>
      <OfferBanner />
      <div className="tabs">
        {FILTERS.map((t) => (
          <button key={t} className={t === f ? "on" : ""} data-act="af" data-f={t} onClick={() => router.replace("/worker/applications?f=" + t)}>{t}<small>{count(t)}</small></button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="panel empty">No {f === "All" ? "" : f.toLowerCase() + " "}applications. <Link href="/worker/events" style={{ color: "var(--blue)" }}>Explore events</Link></div>
      ) : (
        <div className="panel"><div className="scroll"><table>
          <thead><tr><th>Event</th><th>Job category</th><th>Applied</th><th>Status</th><th>Attendance</th><th>Waitlist</th><th>Action</th></tr></thead>
          <tbody>{rows.map((a) => {
            const ev = a.ev ? events.find((e) => e.id === a.ev) : null;
            const eventName = ev ? ev.n : a.name;
            const can = a.st === "Confirmed" || a.st === "Waitlisted";
            const att = a.attendance;
            return (
              <tr key={a.id}>
                <td><b>{eventName}</b></td><td>{a.job}</td><td>{a.at}</td>
                <td><Badge st={a.st} /></td>
                <td>
                  {att ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "999px",
                        background:
                          att.status === "CHECKED_IN"
                            ? "#e6f7ef"
                            : att.status === "CHECKED_OUT"
                              ? "#eaf1fb"
                              : att.status === "ABSENT"
                                ? "#fde8e8"
                                : "#fff4d9",
                        color:
                          att.status === "CHECKED_IN"
                            ? "#05944f"
                            : att.status === "CHECKED_OUT"
                              ? "#1a73e8"
                              : att.status === "ABSENT"
                                ? "#e11900"
                                : "#925c00",
                      }}
                    >
                      {att.status.replace(/_/g, " ")}
                    </span>
                  ) : a.st === "Confirmed" ? (
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>Not checked in</span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>–</span>
                  )}
                </td>
                <td>{a.pos ? "#" + a.pos : "–"}</td>
                <td>
                  {a.ev && <Link className="btn sec sm" href={`/worker/events/${a.ev}`}>View</Link>}{" "}
                  {can && <button className="btn sec sm" data-act="cancel" data-id={a.id} onClick={() => cancelApp(a.id)}>Cancel</button>}
                </td>
              </tr>
            );
          })}</tbody>
        </table></div></div>
      )}
    </>
  );
}
