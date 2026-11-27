"use client";
import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/worker/format";
import { Badge, Empty } from "../ui";
import { useWorker } from "../WorkerProvider";

export default function EventDetailView({ id }: { id: string }) {
  const { events, apps, apply } = useWorker();
  const [pick, setPick] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const e = events.find((x) => x.id === id);
  const back = <Link className="bk" href="/worker/events"><span className="ms">arrow_back</span>Events</Link>;
  if (!e) return <>{back}<Empty>This event was not found.</Empty></>;
  const mine = apps.find((a) => a.ev === e.id);

  async function submit() {
    if (pick === null) { setError("Choose a role to apply for."); return; }
    const selectedJob = e?.jobs[pick];
    if (!selectedJob) return;
    setSubmitting(true);
    setError("");
    const err = await apply(e.id, selectedJob.id);
    setSubmitting(false);
    if (err) setError(err);
  }

  return (
    <>
      {back}
      <div className="dpo" style={{ background: e.b }}><span className="ms">{e.i}</span></div>
      <div className="head">
        <div>
          <h1>{e.n}</h1>
          <p className="sub">{e.c} · Organized by {e.org}</p>
        </div>
        {mine ? (
          <div><Badge st={mine.st} /></div>
        ) : (
          <div className="mobile-only">
            <a className="btn sm" href="#apply">Apply</a>
          </div>
        )}
      </div>
      <div className="dt">
        <div>
          <div className="panel"><div className="ph"><h2>About this event</h2></div><div className="pad">{e.desc}</div></div>
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="ph"><h2>Details</h2></div>
            <dl className="kv">
              <dt>Date</dt><dd>{e.d}</dd><dt>Timings</dt><dd>{e.time}</dd><dt>Reporting time</dt><dd>{e.rep}</dd>
              <dt>Venue</dt><dd>{e.v}, {e.city}</dd><dt>Application deadline</dt><dd>{e.dl}</dd>
            </dl>
            <div className="map"><div><span className="ms" style={{ fontSize: 32 }}>location_on</span><br />Map of {e.v} loads here from OpenStreetMap in the live app.</div></div>
          </div>
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="ph"><h2>Roles and requirements</h2></div>
            <div className="scroll"><table>
              <thead><tr><th>Role</th><th>Wage</th><th>Primary Crew</th><th>Backup Substitutes</th><th>Availability</th></tr></thead>
              <tbody>{e.jobs.map((j) => (
                <tr key={j.id || j.n}>
                  <td><b>{j.n}</b><br /><span className="sub">{j.req}</span></td>
                  <td>{money(j.w)}/day</td>
                  <td>{j.v} spots</td>
                  <td>
                    {j.sub ? (
                      <span style={{ color: "#4f46e5", fontWeight: 600 }}>
                        {j.sub} standby (paid only if working)
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>0</span>
                    )}
                  </td>
                  <td>{j.s ? `${j.s} left` : "Full, waitlist"}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </div>
        </div>
        <aside className="panel pad" id="apply">
          <h2 style={{ marginBottom: 12 }}>Apply</h2>
          {mine ? (
            <>
              <p style={{ marginTop: 0 }}>You applied for <b>{mine.job}</b>.</p>
              <p><Badge st={mine.st} />{mine.pos ? ` Waitlist position #${mine.pos}` : ""}</p>
              <Link className="btn sec" href="/worker/applications">View my applications</Link>
            </>
          ) : (
            <>
              <p className="sub" style={{ marginTop: 0 }}>Choose one role. Selection is first come, first served.</p>
              {e.jobs.map((j, i) => (
                <label className="opt" key={j.id || j.n}>
                  <input type="radio" name="job" value={i} checked={pick === i} onChange={() => { setPick(i); setError(""); }} />
                  <span><b>{j.n}</b> · {money(j.w)}/day<small>{j.s ? `${j.s} spots left` : "Full. You will join the waitlist."}</small></span>
                </label>
              ))}
              <p className="er" id="aer">{error}</p>
              <button className="btn" style={{ width: "100%" }} onClick={submit} disabled={submitting}>
                {submitting ? "Applying..." : "Apply"}
              </button>
              <p className="sub" style={{ fontSize: 13 }}>Apply by {e.dl}</p>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
