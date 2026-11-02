import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { submitQuery } from "@/app/actions";
import SubmitBtn from "@/components/SubmitBtn";

export default async function Page({ searchParams }: { searchParams: { sent?: string } }) {
  const u = await need("VOLUNTEER");

  const queries = await db.supportQuery.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <div className="dh">
        <div>
          <span className="mute">Volunteer dashboard</span>
          <h1>Contact Admin & Support</h1>
        </div>
      </div>
      <p className="mute">
        Need help with event shifts, check-in issues, payment status, or want to report a concern? Send a query directly to the CrewHub Admin.
      </p>

      {searchParams.sent && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "12px 18px", marginBottom: "18px", color: "#065f46", fontSize: "0.9rem" }}>
          ✓ <b>Query / Complaint Sent Successfully!</b> The Admin has received your message. You will receive an in-app notification when they reply.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", alignItems: "start" }}>
        {/* Submission Form */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Send Query / Complaint</h2>
          <form action={submitQuery} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label htmlFor="subject" style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Subject</label>
              <input id="subject" name="subject" placeholder="e.g. Payment inquiry for Kreya Art Expo" required style={{ width: "100%" }} />
            </div>

            <div>
              <label htmlFor="category" style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Category</label>
              <select id="category" name="category" defaultValue="QUERY" style={{ width: "100%" }}>
                <option value="QUERY">General Query</option>
                <option value="PAYMENT">Payment & Payout Status</option>
                <option value="COMPLAINT">Organizer or Shift Issue</option>
                <option value="URGENT">Urgent Assistance</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Message Details</label>
              <textarea id="message" name="message" rows={4} placeholder="Describe your query, shift problem, or feedback..." required style={{ width: "100%" }} />
            </div>

            <div style={{ marginTop: "6px" }}>
              <SubmitBtn pendingText="Sending to Admin...">Send Query to Admin ✉</SubmitBtn>
            </div>
          </form>
        </div>

        {/* Previous Inquiries & Replies */}
        <div>
          <h2>Your Support Inquiries ({queries.length})</h2>
          <p className="mute">Track responses from Admin in real time.</p>

          {!queries.length ? (
            <p className="card mute">No inquiries sent yet. Use the form to reach the Admin team anytime.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {queries.map(q => (
                <div key={q.id} className="card" style={{ padding: "14px 18px", borderLeft: q.status === "ANSWERED" ? "4px solid #16a34a" : "4px solid #eab308" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <b>{q.subject}</b>
                    <span className={`tag ${q.status === "ANSWERED" ? "ok" : ""}`}>{q.status}</span>
                  </div>
                  <div className="mute" style={{ fontSize: "0.8rem", marginBottom: "8px" }}>
                    Category: <b>{q.category}</b> · Sent on {q.createdAt.toLocaleDateString("en-IN")} at {q.createdAt.toLocaleTimeString("en-IN", { timeStyle: "short" })}
                  </div>
                  <p style={{ margin: "4px 0 10px", fontSize: "0.9rem" }}>{q.message}</p>

                  {q.answer ? (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "10px 14px", marginTop: "8px" }}>
                      <b style={{ color: "#166534", fontSize: "0.85rem" }}>💬 Admin Response:</b>
                      <p style={{ margin: "4px 0 0", color: "#14532d", fontSize: "0.9rem" }}>{q.answer}</p>
                      {q.answeredAt && (
                        <div className="mute" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                          Answered on {q.answeredAt.toLocaleDateString("en-IN")} at {q.answeredAt.toLocaleTimeString("en-IN", { timeStyle: "short" })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mute" style={{ fontSize: "0.82rem", fontStyle: "italic" }}>
                      ⏳ Awaiting response from Admin...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
