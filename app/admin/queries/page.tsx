import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { answerQuery, resolveQuery } from "@/app/actions";
import { Tag, Back, Stats } from "@/components/ui";
import SubmitBtn from "@/components/SubmitBtn";
import Link from "next/link";

export default async function Page({ searchParams: sp }: { searchParams: { s?: string; id?: string } }) {
  await need("ADMIN");

  const queries = await db.supportQuery.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          orgName: true,
          city: true,
        },
      },
    },
  });

  const openCount = queries.filter((q) => q.status === "OPEN").length;
  const answeredCount = queries.filter((q) => q.status === "ANSWERED").length;
  const complaintCount = queries.filter((q) => q.category === "COMPLAINT").length;

  const filterStatus = sp.s || "ALL";
  const filtered = filterStatus === "ALL" ? queries : queries.filter((q) => q.status === filterStatus);

  const selectedQuery = sp.id ? queries.find((q) => q.id === sp.id) : null;

  return (
    <div className="compact">
      <div className="dh">
        <div>
          <span className="mute">Admin dashboard</span>
          <h1>Queries & Complaints Support Desk</h1>
        </div>
      </div>
      <p className="mute">
        Review inquiries, dispute reports, and support queries submitted by organizers and volunteers. Replies trigger instant in-app notifications.
      </p>

      <Stats
        items={[
          [queries.length, "Total Inquiries"],
          [openCount, "Awaiting Response"],
          [answeredCount, "Answered"],
          [complaintCount, "Complaints Filed"],
        ]}
      />

      {/* Detail View of a Selected Query */}
      {selectedQuery ? (
        <>
          <div style={{ margin: "14px 0" }}>
            <Link href="/admin/queries" className="btn ghost" style={{ fontSize: "0.85rem" }}>
              ← All Queries
            </Link>
          </div>

          <section className="evc">
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div>
                <b>{selectedQuery.subject}</b>{" "}
                <Tag c={selectedQuery.status === "OPEN" ? "" : "ok"}>{selectedQuery.status}</Tag>{" "}
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: selectedQuery.category === "COMPLAINT" ? "#fee2e2" : "#e0f2fe",
                    color: selectedQuery.category === "COMPLAINT" ? "#991b1b" : "#0369a1",
                  }}
                >
                  {selectedQuery.category}
                </span>
                <div className="mute" style={{ marginTop: "4px" }}>
                  From: <b>{selectedQuery.user.name}</b>{" "}
                  {selectedQuery.user.orgName ? `(${selectedQuery.user.orgName})` : ""} · Role:{" "}
                  <b>{selectedQuery.user.role}</b> · Phone: {selectedQuery.user.phone || "—"} ·{" "}
                  {selectedQuery.createdAt.toLocaleString("en-IN")}
                </div>
              </div>

              {selectedQuery.status !== "RESOLVED" && (
                <form action={resolveQuery.bind(null, selectedQuery.id)}>
                  <button className="ghost" style={{ fontSize: "0.82rem" }}>
                    Mark Resolved ✓
                  </button>
                </form>
              )}
            </div>

            <div className="role" style={{ marginTop: "14px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b" }}>USER MESSAGE:</div>
              <p style={{ margin: "6px 0 16px", fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>
                {selectedQuery.message}
              </p>

              {/* Existing Answer if present */}
              {selectedQuery.answer && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    margin: "12px 0 16px",
                  }}
                >
                  <b style={{ color: "#166534" }}>💬 Previous Admin Reply:</b>
                  <p style={{ margin: "4px 0 0", color: "#14532d" }}>{selectedQuery.answer}</p>
                  {selectedQuery.answeredAt && (
                    <div className="mute" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      Answered on {selectedQuery.answeredAt.toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              )}

              {/* Reply Form */}
              <form action={answerQuery.bind(null, selectedQuery.id)} style={{ marginTop: "14px" }}>
                <label htmlFor="answer" style={{ fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  {selectedQuery.answer ? "Update Reply / Send New Message" : "Reply to User"}
                </label>
                <textarea
                  id="answer"
                  name="answer"
                  rows={4}
                  defaultValue={selectedQuery.answer || ""}
                  placeholder="Type your official answer or instructions here..."
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
                <div style={{ marginTop: "10px" }}>
                  <SubmitBtn pendingText="Sending response...">Send Reply to {selectedQuery.user.name} ✉</SubmitBtn>
                </div>
              </form>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Status Filter Tabs */}
          <div style={{ display: "flex", gap: "8px", margin: "18px 0 14px", flexWrap: "wrap" }}>
            {["ALL", "OPEN", "ANSWERED", "RESOLVED"].map((st) => (
              <Link
                key={st}
                href={st === "ALL" ? "/admin/queries" : `/admin/queries?s=${st}`}
                className={`btn ${filterStatus === st ? "" : "ghost"}`}
                style={{ fontSize: "0.82rem", padding: "6px 14px" }}
              >
                {st} ({st === "ALL" ? queries.length : queries.filter((q) => q.status === st).length})
              </Link>
            ))}
          </div>

          {!filtered.length ? (
            <p className="card mute">No inquiries found in this category.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filtered.map((q) => {
                const isComplaint = q.category === "COMPLAINT";
                const isUrgent = q.category === "URGENT";
                return (
                  <Link
                    key={q.id}
                    href={`/admin/queries?id=${q.id}`}
                    className="card row"
                    style={{
                      alignItems: "center",
                      borderLeft:
                        q.status === "OPEN"
                          ? isComplaint
                            ? "4px solid #ef4444"
                            : "4px solid #f59e0b"
                          : "4px solid #10b981",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <b>{q.subject}</b>
                        <Tag c={q.status === "OPEN" ? "" : "ok"}>{q.status}</Tag>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: isComplaint ? "#fee2e2" : isUrgent ? "#fef3c7" : "#e0f2fe",
                            color: isComplaint ? "#991b1b" : isUrgent ? "#92400e" : "#0369a1",
                          }}
                        >
                          {q.category}
                        </span>
                      </div>
                      <div className="mute" style={{ fontSize: "0.82rem", marginTop: "3px" }}>
                        From: <b>{q.user.name}</b> ({q.user.role}) · {q.createdAt.toLocaleDateString("en-IN")} at{" "}
                        {q.createdAt.toLocaleTimeString("en-IN", { timeStyle: "short" })}
                        {q.answer ? " · ✓ Answered" : " · ⏳ Needs reply"}
                      </div>
                    </div>
                    <span className="mute" style={{ fontSize: "0.84rem" }}>
                      Open ➔
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
