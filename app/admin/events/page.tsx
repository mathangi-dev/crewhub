import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { eventAct, decide } from "../../actions";
import { Tag, Back, Cards } from "@/components/ui";
import { accepted, inr, when, RATE } from "@/lib/money";

const LB: Record<string, string> = {
  PENDING: "Awaiting approval",
  PUBLISHED: "Approved",
  completed: "Requirements Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const cls = (s: string) => (s === "PUBLISHED" ? "ok" : s === "PENDING" ? "" : "bad");

export default async function Page({ searchParams: sp }: { searchParams: { s?: string; id?: string } }) {
  await need("ADMIN");
  const base = "/admin/events";
  const all: any[] = await db.event.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { startsAt: "desc" },
    include: {
      organizer: true,
      roles: {
        include: {
          applications: {
            include: { user: true },
          },
        },
      },
    },
  });

  const crewSlots = (e: any) => e.roles.reduce((n: number, r: any) => n + r.slots, 0);
  const isReqFilled = (e: any) => {
    const s = crewSlots(e);
    return s > 0 && accepted(e).length >= s;
  };

  const head = (
    <div className="dh">
      <div>
        <span className="mute">Admin dashboard</span>
        <h1>Events</h1>
      </div>
    </div>
  );

  const one = sp.id ? all.find((e) => e.id === sp.id) : null;

  const body = one ? (
    <>
      <Back href={`${base}?s=${sp.s || one.status}`} />
      <section className="evc">
        <div className="row">
          <div>
            <b>{one.title}</b> <Tag c={cls(one.status)}>{LB[one.status] || one.status}</Tag>{" "}
            <Tag c={one.payStatus === "PAID" ? "ok" : "bad"}>{one.payStatus}</Tag>
            {one.status === "PUBLISHED" && isReqFilled(one) && (
              <span className="tag ok" style={{ fontWeight: 700, marginLeft: 6 }}>
                ✓ Requirements Completed
              </span>
            )}
            <div className="mute">
              {one.organizer.orgName || one.organizer.name} · {one.venue}, {one.city} · {when(one)}
            </div>
          </div>
          {one.status === "PENDING" && (
            <div className="acts">
              <form action={eventAct.bind(null, one.id, "APPROVE")}>
                <button disabled={one.payStatus !== "PAID"}>Approve and publish</button>
              </form>
              <form action={eventAct.bind(null, one.id, "REJECT")}>
                <button className="bad">Reject{one.payStatus === "PAID" ? " and refund" : ""}</button>
              </form>
            </div>
          )}
        </div>

        {/* Volunteer Requirements Completion Indication Banner & CSV Download */}
        {one.status === "PUBLISHED" &&
          (isReqFilled(one) ? (
            <div
              style={{
                background: "#dcfce7",
                border: "1px solid #86efac",
                borderRadius: "14px",
                padding: "14px 18px",
                margin: "14px 0",
                color: "#15803d",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <b style={{ fontSize: "1rem" }}>✓ Volunteer Requirements 100% Completed!</b>
                <div style={{ fontSize: "0.85rem", marginTop: "2px" }}>
                  All {crewSlots(one)} required volunteer positions are filled and accepted.
                </div>
              </div>
              <a
                href={`/api/export/crew?eventId=${one.id}`}
                className="btn"
                style={{ background: "#15803d", color: "#fff", padding: "8px 18px", fontSize: "0.85rem" }}
                download
              >
                📊 Download Roster with Bank & Payout (CSV)
              </a>
            </div>
          ) : (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "12px 18px",
                margin: "14px 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <b>Crew Status:</b>{" "}
                <span className="tag" style={{ background: "#fef3c7", color: "#b45309" }}>
                  {accepted(one).length}/{crewSlots(one)} volunteers accepted
                </span>
                <span className="mute" style={{ marginLeft: "8px" }}>
                  Needs {Math.max(0, crewSlots(one) - accepted(one).length)} more
                </span>
              </div>
              <a
                href={`/api/export/crew?eventId=${one.id}`}
                className="btn ghost"
                style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                download
              >
                📊 Export Current Roster (CSV)
              </a>
            </div>
          ))}

        <p>{one.description}</p>
        {one.roles.map((r: any) => (
          <p key={r.id} className="mute" style={{ margin: "4px 0 0" }}>
            {r.title} · {r.slots} people × {r.pay ? inr(r.pay) : "Unpaid"}
            {r.hours ? ` · ${r.hours} hrs` : ""}
          </p>
        ))}

        <div className="role">
          <div className="row">
            <span>
              Crew pay <b>{inr(one.crewTotal)}</b>
            </span>
            <span>
              Commission ({RATE}%) <b>{inr(one.commission)}</b>
            </span>
            <span>
              Organizer {one.payStatus === "PAID" ? "paid" : "owes"}{" "}
              <b>{inr(one.crewTotal + one.commission)}</b>
            </span>
          </div>
          {one.status === "PENDING" && one.payStatus !== "PAID" && (
            <p className="mute" style={{ margin: "8px 0 0" }}>
              Waiting for the organizer’s payment. Approval unlocks once it arrives.
            </p>
          )}
        </div>

        {one.status === "PUBLISHED" && (
          <div className="role">
            <div className="row">
              <h3>Volunteer applications</h3>
              <span className="mute">{accepted(one).length} accepted</span>
            </div>
            {one.roles.map((r: any) => {
              const apps = r.applications.filter((x: any) => x.status !== "CANCELLED");
              const n = apps.filter((x: any) => x.status === "ACCEPTED").length;
              return (
                <div key={r.id}>
                  <p style={{ margin: "10px 0 4px" }}>
                    <b>{r.title}</b>{" "}
                    <span className="mute">
                      {n}/{r.slots} accepted
                    </span>
                  </p>
                  {!apps.length && <p className="mute" style={{ margin: 0 }}>No applications yet.</p>}
                  {apps.map((x: any) => (
                    <div key={x.id} className="app">
                      <span className="av">{x.user.name[0]}</span>
                      <div className="who">
                        <b>{x.user.name}</b>
                        <div className="mute">
                          {x.user.city} · {x.user.skills || "no skills listed"}
                        </div>
                      </div>
                      <Tag c={x.status === "ACCEPTED" ? "ok" : x.status === "REJECTED" ? "bad" : ""}>
                        {x.status}
                      </Tag>
                      {x.status === "PENDING" && (
                        <>
                          <form action={decide.bind(null, x.id, "ACCEPTED")}>
                            <button disabled={n >= r.slots}>Accept</button>
                          </form>
                          <form action={decide.bind(null, x.id, "REJECTED")}>
                            <button className="ghost">Reject</button>
                          </form>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
            <p className="mute" style={{ margin: "8px 0 0" }}>
              Accepted volunteers appear on the organizer’s dashboard for attendance. Only volunteers who check in
              and check out get paid.
            </p>
          </div>
        )}
      </section>
    </>
  ) : !sp.s || !LB[sp.s] ? (
    <Cards
      base={base}
      items={[
        ["PENDING", "Awaiting approval", all.filter((e) => e.status === "PENDING").length],
        ["PUBLISHED", "Approved", all.filter((e) => e.status === "PUBLISHED").length],
        [
          "completed",
          "Requirements Completed",
          all.filter((e) => e.status === "PUBLISHED" && isReqFilled(e)).length,
        ],
        ["REJECTED", "Rejected", all.filter((e) => e.status === "REJECTED").length],
        ["CANCELLED", "Cancelled", all.filter((e) => e.status === "CANCELLED").length],
      ]}
    />
  ) : (
    <>
      <Back href={base} label="All events" />
      <h2>{LB[sp.s]}</h2>
      {all
        .filter((e) => (sp.s === "completed" ? e.status === "PUBLISHED" && isReqFilled(e) : e.status === sp.s))
        .map((e) => {
          const s = crewSlots(e);
          const a = accepted(e).length;
          const full = isReqFilled(e);
          return (
            <Link key={e.id} href={`${base}?s=${sp.s}&id=${e.id}`} className="card row">
              <div>
                <b>{e.title}</b> <Tag c={cls(e.status)}>{LB[e.status] || e.status}</Tag>{" "}
                <Tag c={e.payStatus === "PAID" ? "ok" : "bad"}>{e.payStatus}</Tag>
                {e.status === "PUBLISHED" &&
                  (full ? (
                    <span
                      className="tag ok"
                      style={{ fontWeight: 700, marginLeft: 6, background: "#dcfce7", color: "#15803d" }}
                    >
                      ✓ Requirements Completed ({a}/{s})
                    </span>
                  ) : (
                    <span
                      className="tag"
                      style={{ marginLeft: 6, background: "#fef3c7", color: "#b45309" }}
                    >
                      Needs {s - a} crew ({a}/{s})
                    </span>
                  ))}
                <div className="mute">
                  {e.organizer.orgName || e.organizer.name} · {when(e)}
                </div>
              </div>
              <span className="mute">
                Crew {inr(e.crewTotal)} + fee {inr(e.commission)}
              </span>
              <b>{inr(e.crewTotal + e.commission)}</b>
            </Link>
          );
        })}
      {!all.some((e) =>
        sp.s === "completed" ? e.status === "PUBLISHED" && isReqFilled(e) : e.status === sp.s
      ) && <p className="mute">Nothing here.</p>}
    </>
  );

  return <div className="compact">{head}{body}</div>;
}
