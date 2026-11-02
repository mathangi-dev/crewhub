import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { userAct } from "@/app/actions";
import { Tag, Back, Cards } from "./ui";
import AdminBank from "./AdminBank";
import { MAX_ABSENCES } from "@/lib/money";

const LB: Record<string, string> = {
  PENDING: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Deactivated / Suspended",
};

const st = (u: any) => (u.suspended ? "SUSPENDED" : u.approval);
const cls = (s: string) => (s === "APPROVED" ? "ok" : s === "PENDING" ? "" : "bad");

export default async function AdminPeople({
  role,
  base,
  sp,
  title,
  desc,
}: {
  role: "VOLUNTEER" | "ORGANIZER";
  base: string;
  sp: { s?: string; id?: string };
  title: string;
  desc: string;
}) {
  await need("ADMIN");
  const users: any[] = await db.user.findMany({ where: { role }, orderBy: { name: "asc" } });

  const head = (
    <div className="dh">
      <div>
        <span className="mute">Admin dashboard</span>
        <h1>{title}</h1>
      </div>
    </div>
  );

  const one = sp.id ? users.find((u) => u.id === sp.id) : null;

  if (one) {
    const s = st(one);
    const complaints =
      role === "VOLUNTEER"
        ? await db.report.findMany({ where: { targetType: "VOLUNTEER", targetId: one.id }, orderBy: { createdAt: "desc" } })
        : [];
    const pastOrgEvents =
      role === "ORGANIZER"
        ? await db.event.findMany({ where: { organizerId: one.id }, orderBy: { startsAt: "desc" } })
        : [];

    const isDeactivationAlert = role === "VOLUNTEER" && (one.absences >= 3 || complaints.length > 0);

    const fields: [string, any][] =
      role === "VOLUNTEER"
        ? [
            ["Phone Number", one.phone || "—"],
            ["Age", one.age ? `${one.age} yrs` : "—"],
            ["Gender", one.gender || "—"],
            ["City", one.city || "—"],
            ["Skills", one.skills || "—"],
            ["Interests", one.interests || "—"],
            ["Availability", one.availability || "—"],
            ["Absences", `${one.absences} / ${MAX_ABSENCES}`],
            ["Complaints Filed", complaints.length ? `${complaints.length} complaint(s)` : "None"],
            ["Terms Accepted", one.termsAcceptedAt ? one.termsAcceptedAt.toLocaleDateString("en-IN") : "Not yet"],
          ]
        : [
            ["Company / Organization", one.orgName || "—"],
            ["Contact Person", one.name || "—"],
            ["Phone Number", one.phone || "—"],
            ["City", one.city || "—"],
            ["Official Website", one.website ? <a href={one.website} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "#0284c7" }}>{one.website}</a> : "—"],
            ["Verification Info & Proofs", one.verifyInfo || "—"],
            ["Events in CrewHub", `${pastOrgEvents.length} event(s)`],
          ];

    return (
      <>
        {head}
        <Back href={`${base}?s=${sp.s || s}`} />
        <section className="evc">
          <div className="row">
            <div>
              <b>{one.name}</b> {one.orgName && <span className="mute">({one.orgName})</span>} <Tag c={cls(s)}>{LB[s]}</Tag>
              <div className="mute">{one.email}</div>
            </div>
            <div className="acts">
              {s === "PENDING" && (
                <>
                  <form action={userAct.bind(null, one.id, "APPROVED")}>
                    <button>Approve & Verify</button>
                  </form>
                  <form action={userAct.bind(null, one.id, "REJECTED")}>
                    <button className="bad">Reject</button>
                  </form>
                </>
              )}
              {s === "APPROVED" && (
                <form action={userAct.bind(null, one.id, "SUSPEND")}>
                  <button className="bad">Deactivate / Suspend Account</button>
                </form>
              )}
              {s === "SUSPENDED" && (
                <form action={userAct.bind(null, one.id, "REINSTATE")}>
                  <button style={{ background: "#16a34a", color: "#fff" }}>Reinstate Account (Clear Absences)</button>
                </form>
              )}
              {s === "REJECTED" && (
                <form action={userAct.bind(null, one.id, "APPROVED")}>
                  <button className="ghost">Re-Approve</button>
                </form>
              )}
            </div>
          </div>

          {/* Absence / Complaint Alert Banner */}
          {isDeactivationAlert && !one.suspended && (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #f87171",
                borderRadius: "12px",
                padding: "12px 18px",
                margin: "14px 0",
                color: "#991b1b",
              }}
            >
              <b style={{ fontSize: "0.95rem" }}>⚠️ Action Recommended: Volunteer Exceeded Threshold</b>
              <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                This volunteer has accumulated <b>{one.absences} absences</b> (max limit: {MAX_ABSENCES}) or has{" "}
                <b>{complaints.length} active complaint(s)</b> filed. You can deactivate their account using the button above.
              </div>
            </div>
          )}

          {one.suspended && (
            <div
              style={{
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                borderRadius: "12px",
                padding: "10px 16px",
                margin: "12px 0",
                color: "#be123c",
                fontSize: "0.88rem",
              }}
            >
              🔒 <b>Account is currently Deactivated / Suspended.</b> The volunteer cannot apply for new shifts or check in. Click "Reinstate Account" to reset absences and restore access.
            </div>
          )}

          <div className="role">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              {fields.map(([k, v]) => (
                <div key={k} className="kv">
                  <span className="mute">{k}</span>
                  <br />
                  <b>{v || "—"}</b>
                </div>
              ))}
            </div>

            {one.bio && (
              <p className="kv" style={{ marginTop: "12px" }}>
                <span className="mute">About</span>
                <br />
                <b>{one.bio}</b>
              </p>
            )}

            {/* Complaints list if any */}
            {complaints.length > 0 && (
              <div style={{ marginTop: "16px", padding: "12px", background: "#f8fafc", borderRadius: "10px" }}>
                <b style={{ color: "#dc2626" }}>Complaints on Record ({complaints.length}):</b>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  {complaints.map((c) => (
                    <div key={c.id} style={{ fontSize: "0.84rem", padding: "8px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                      <b>Reason:</b> {c.reason} <span className="mute">· {c.createdAt.toLocaleDateString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Organizer Events if Organizer */}
            {pastOrgEvents.length > 0 && (
              <div style={{ marginTop: "16px", padding: "12px", background: "#f8fafc", borderRadius: "10px" }}>
                <b>Events Organized in App ({pastOrgEvents.length}):</b>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                  {pastOrgEvents.map((ev) => (
                    <div key={ev.id} style={{ fontSize: "0.84rem", padding: "6px 10px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                      <b>{ev.title}</b> ({ev.city}) · Status: {ev.status} · Date: {ev.startsAt.toLocaleDateString("en-IN")}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: "16px" }}>
              <AdminBank u={one} />
            </div>
          </div>
        </section>
      </>
    );
  }

  if (!sp.s || !LB[sp.s]) {
    return (
      <>
        {head}
        <Cards
          base={base}
          items={Object.keys(LB).map(
            (k) => [k, LB[k], users.filter((u) => st(u) === k).length] as [string, string, number]
          )}
        />
      </>
    );
  }

  const list = users.filter((u) => st(u) === sp.s);

  return (
    <>
      {head}
      <Back href={base} label="All" />
      <h2>{LB[sp.s]}</h2>
      {list.length ? (
        list.map((u) => {
          const hasIssue = role === "VOLUNTEER" && (u.absences >= 3 || u.suspended);
          return (
            <Link key={u.id} href={`${base}?s=${sp.s}&id=${u.id}`} className="card row" style={{ alignItems: "center" }}>
              <div>
                <b>{u.name}</b> {u.orgName && <span className="mute">({u.orgName})</span>} <Tag c={cls(st(u))}>{LB[st(u)]}</Tag>
                {hasIssue && <span className="tag bad" style={{ marginLeft: "6px" }}>⚠️ {u.absences} Absences</span>}
                <div className="mute">
                  {u.email} · {u.phone ? `${u.phone} · ` : ""}{u.city || "Tamil Nadu"}
                  {role === "VOLUNTEER" && u.skills ? ` · ${u.skills}` : ""}
                </div>
              </div>
              <span className="mute" style={{ fontSize: "0.85rem" }}>View details ➔</span>
            </Link>
          );
        })
      ) : (
        <p className="mute">Nothing here.</p>
      )}
    </>
  );
}
