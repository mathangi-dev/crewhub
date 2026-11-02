import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { saveProfile, submitVerification } from "@/app/actions";
import BankForm from "@/components/BankForm";
import Link from "next/link";
import { inr, when } from "@/lib/money";

const ST: Record<string, string> = { PENDING: "Awaiting approval", APPROVED: "Verified", REJECTED: "Rejected" };

export default async function Page({ searchParams }: { searchParams: { bank?: string; saved?: string } }) {
  const u = await need("ORGANIZER");

  // Fetch past events organized in the app as living proof
  const pastEvents = await db.event.findMany({
    where: { organizerId: u.id },
    orderBy: { startsAt: "desc" },
    include: {
      roles: {
        include: {
          applications: {
            where: { status: "ACCEPTED" }
          }
        }
      }
    }
  });

  return (
    <div className="compact">
      <div className="dh">
        <div>
          <span className="mute">Organizer dashboard</span>
          <h1>Organization Profile</h1>
        </div>
      </div>
      <p className="mute">
        Manage your company information, phone number, verification proofs, and UPI details.
      </p>

      {searchParams.saved && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "10px 16px", marginBottom: "16px", color: "#065f46" }}>
          ✓ Profile details updated successfully!
        </div>
      )}

      <h2 style={{ marginTop: 0 }}>Company & Organizer Details</h2>
      <form action={saveProfile} className="card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input type="hidden" name="verifyInfo" value={u.verifyInfo} />
        
        <div className="row">
          <div>
            <label htmlFor="name">Organizer Contact Name</label>
            <input id="name" name="name" defaultValue={u.name} placeholder="Your full name" required />
          </div>
          <div>
            <label htmlFor="orgName">Company / Organization Name</label>
            <input id="orgName" name="orgName" defaultValue={u.orgName} placeholder="e.g. Stagecraft Events Pvt Ltd" required />
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="phone">Phone Number</label>
            <input id="phone" name="phone" type="tel" defaultValue={u.phone} placeholder="e.g. +91 9876543210" required />
          </div>
          <div>
            <label htmlFor="city">City / Base Location</label>
            <input id="city" name="city" defaultValue={u.city} placeholder="e.g. Chennai, Tamil Nadu" required />
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="website">Official Website / Portfolio</label>
            <input id="website" name="website" type="url" defaultValue={u.website} placeholder="https://yourcompany.com" />
          </div>
          <div>
            <label htmlFor="upiNumber">Organizer UPI Number (for refunds)</label>
            <input id="upiNumber" name="upiNumber" defaultValue={u.upiNumber} placeholder="e.g. 9876543210" />
          </div>
        </div>

        <div>
          <label htmlFor="bio">About Company / Organization</label>
          <textarea id="bio" name="bio" defaultValue={u.bio} rows={3} placeholder="Tell us about the events your company hosts, crew experience, etc." />
        </div>

        <p style={{ marginTop: "6px" }}>
          <button type="submit">Save Profile Details</button>
        </p>
      </form>

      <h2>Admin Verification & Proofs</h2>
      <form action={submitVerification} className="card">
        <p style={{ margin: "0 0 12px" }}>
          Current Status:{" "}
          <span className={`tag ${u.approval === "APPROVED" ? "ok" : u.approval === "REJECTED" ? "bad" : ""}`}>
            {ST[u.approval] || u.approval}
          </span>
        </p>
        <label htmlFor="verifyInfo">Verification Info & Proofs (Website links, Registration No., past event proof links)</label>
        <textarea
          id="verifyInfo"
          name="verifyInfo"
          defaultValue={u.verifyInfo}
          rows={3}
          placeholder="e.g. Reg TN-2022-1180, 40+ events hosted, website: stagecraft.example, Google Drive proof folder: ..."
        />
        <p style={{ marginTop: "10px" }}>
          <button type="submit">Submit Proofs for Verification</button>
        </p>
      </form>

      {/* Events organized in CrewHub proofs */}
      <h2>Events Organized in CrewHub ({pastEvents.length})</h2>
      <p className="mute">Historical proof of events organized through this platform.</p>
      {!pastEvents.length ? (
        <p className="card mute">No events published yet. Once you create events, their verified history appears here.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {pastEvents.map(e => {
            const acceptedVolunteers = e.roles.flatMap(r => r.applications);
            return (
              <div key={e.id} className="card row" style={{ alignItems: "center" }}>
                <div>
                  <b>{e.title}</b> <span className={`tag ${e.status === "PUBLISHED" ? "ok" : ""}`}>{e.status}</span>
                  <div className="mute">
                    {e.venue}, {e.city} · {when(e)} · {acceptedVolunteers.length} crew deployed
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <b>{inr(e.crewTotal + e.commission)}</b>
                  <div className="mute" style={{ fontSize: "0.78rem" }}>
                    Crew: {inr(e.crewTotal)} + fee {inr(e.commission)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2>Bank & UPI Refund Details</h2>
      <BankForm u={u} msg={searchParams.bank} purpose="Used for immediate refunds for absentees and rejected events." />
    </div>
  );
}
