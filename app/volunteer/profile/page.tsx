import { need } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveProfile, addAvailability, deleteAvailability } from "@/app/actions";
import BankForm from "@/components/BankForm";

export default async function Page({ searchParams }: { searchParams: { bank?: string; saved?: string } }) {
  const u = await need("WORKER");

  const availabilities = await db.workerAvailability.findMany({
    where: { workerId: u.id },
    orderBy: { date: "asc" },
  });

  const confirmedAssignments = await db.application.findMany({
    where: { userId: u.id, status: "ACCEPTED", checkOut: null },
    include: { role: { include: { event: true } } },
    orderBy: { role: { event: { startsAt: "asc" } } },
  });

  return (
    <div className="compact">
      <div className="dh">
        <div>
          <span className="mute">Worker dashboard</span>
          <h1>Worker Profile &amp; Availability</h1>
        </div>
      </div>
      <p className="mute">
        Maintain your verified worker profile, set specific availability slots, and track your platform reliability record.
      </p>

      {searchParams.saved && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "10px 16px", marginBottom: "16px", color: "#065f46" }}>
          Profile details updated successfully!
        </div>
      )}

      {/* Worker Reliability & Gig Record Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div className="card" style={{ borderLeft: "4px solid #10b981", padding: "14px 16px" }}>
          <span className="mute" style={{ fontSize: "0.78rem", textTransform: "uppercase" }}>Reliability Score</span>
          <b style={{ fontSize: "1.4rem", color: "#047857", display: "block", marginTop: "2px" }}>
            {Math.round(u.reliabilityScore ?? 100)}%
          </b>
          <span className="mute" style={{ fontSize: "0.75rem" }}>Higher score = faster auto-selection</span>
        </div>

        <div className="card" style={{ borderLeft: "4px solid #0284c7", padding: "14px 16px" }}>
          <span className="mute" style={{ fontSize: "0.78rem", textTransform: "uppercase" }}>Completed Shifts</span>
          <b style={{ fontSize: "1.4rem", color: "#0369a1", display: "block", marginTop: "2px" }}>
            {u.completedShifts ?? 0}
          </b>
          <span className="mute" style={{ fontSize: "0.75rem" }}>Verified check-outs</span>
        </div>

        <div className="card" style={{ borderLeft: "4px solid #f59e0b", padding: "14px 16px" }}>
          <span className="mute" style={{ fontSize: "0.78rem", textTransform: "uppercase" }}>Late Cancellations</span>
          <b style={{ fontSize: "1.4rem", color: "#b45309", display: "block", marginTop: "2px" }}>
            {u.lateCancellations ?? 0}
          </b>
          <span className="mute" style={{ fontSize: "0.75rem" }}>Non-emergency &lt; 24h</span>
        </div>

        <div className="card" style={{ borderLeft: "4px solid #ef4444", padding: "14px 16px" }}>
          <span className="mute" style={{ fontSize: "0.78rem", textTransform: "uppercase" }}>No-Shows / Absences</span>
          <b style={{ fontSize: "1.4rem", color: "#b91c1c", display: "block", marginTop: "2px" }}>
            {u.absences ?? 0}
          </b>
          <span className="mute" style={{ fontSize: "0.75rem" }}>Max 5 before deactivation</span>
        </div>
      </div>

      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "12px 18px", marginBottom: "18px", color: "#166534", fontSize: "0.85rem" }}>
        <b>Secured Personal Information:</b> Your phone number, age, gender, and UPI/banking credentials are encrypted and strictly accessible only to authorized CrewHub Admins for payout processing and safety verification.
      </div>

      {/* 1. PERSONAL & CONTACT DETAILS */}
      <h2 style={{ marginTop: 0 }}>Personal &amp; Experience Details</h2>
      <form action={saveProfile} className="card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div className="row">
          <div>
            <label htmlFor="name">Full Name</label>
            <input id="name" name="name" defaultValue={u.name} placeholder="Your legal name" required />
          </div>
          <div>
            <label htmlFor="phone">Phone Number (Secured)</label>
            <input id="phone" name="phone" type="tel" defaultValue={u.phone} placeholder="e.g. 9876543210" required />
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="age">Age</label>
            <input id="age" name="age" type="number" min={16} max={80} defaultValue={u.age ?? ""} placeholder="e.g. 21" required />
          </div>
          <div>
            <label htmlFor="gender">Gender</label>
            <select id="gender" name="gender" defaultValue={u.gender || "Not specified"}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label htmlFor="city">City / Location</label>
            <input id="city" name="city" defaultValue={u.city} placeholder="e.g. Chennai, Coimbatore" required />
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="skills">Skills &amp; Expertise</label>
            <input id="skills" name="skills" defaultValue={u.skills} placeholder="e.g. ushering, crowd control, registration, AV support" />
          </div>
          <div>
            <label htmlFor="experienceYears">Years of Gig / Event Experience</label>
            <input id="experienceYears" name="experienceYears" type="number" step="0.5" min="0" max="30" defaultValue={u.experienceYears ?? 0} placeholder="e.g. 1.5" />
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="interests">Interests &amp; Event Types</label>
            <input id="interests" name="interests" defaultValue={u.interests} placeholder="e.g. Concerts, expos, sports, tech meetups" />
          </div>
          <div>
            <label htmlFor="availability">Weekly Availability Notes</label>
            <input id="availability" name="availability" defaultValue={u.availability} placeholder="e.g. Weekends only, Friday to Sunday evenings" />
          </div>
        </div>

        <div>
          <label htmlFor="bio">About You / Event Experience</label>
          <textarea id="bio" name="bio" rows={3} defaultValue={u.bio} placeholder="Briefly describe any past event experience..." />
        </div>

        <p style={{ marginTop: "6px" }}>
          <button type="submit">Save Profile</button>
        </p>
      </form>

      {/* 2. SPECIFIC DATE & TIME AVAILABILITY SLOTS */}
      <div style={{ marginTop: "28px" }}>
        <h2>Available Dates &amp; Time Slots</h2>
        <p className="mute">
          Specify exact dates and time slots when you are free to take on event assignments.
        </p>

        <form action={addAvailability} className="card" style={{ marginBottom: "16px" }}>
          <b style={{ fontSize: "0.95rem" }}>Add Available Slot</b>
          <div className="row" style={{ marginTop: "8px", alignItems: "flex-end" }}>
            <div>
              <label className="sm" htmlFor="availDate">Date</label>
              <input id="availDate" name="availDate" type="date" required />
            </div>
            <div>
              <label className="sm" htmlFor="startTime">Start Time</label>
              <input id="startTime" name="startTime" type="time" defaultValue="09:00" />
            </div>
            <div>
              <label className="sm" htmlFor="endTime">End Time</label>
              <input id="endTime" name="endTime" type="time" defaultValue="18:00" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", height: "38px" }}>
              <input id="isAllDay" name="isAllDay" type="checkbox" />
              <label htmlFor="isAllDay" style={{ fontSize: "0.85rem", cursor: "pointer", margin: 0 }}>All Day</label>
            </div>
            <div>
              <button type="submit" className="btn sm">+ Add Slot</button>
            </div>
          </div>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {availabilities.length === 0 ? (
            <p className="card mute">No specific dates added yet. (By default you can apply for any event matching your weekly availability).</p>
          ) : (
            availabilities.map((av) => (
              <div key={av.id} className="card row" style={{ padding: "10px 16px", alignItems: "center" }}>
                <div>
                  <b>{av.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</b>
                  <span className="mute" style={{ marginLeft: "10px", fontSize: "0.85rem" }}>
                    {av.isAllDay ? "All Day Available" : `${av.startTime} to ${av.endTime}`}
                  </span>
                </div>
                <form action={deleteAvailability.bind(null, av.id)}>
                  <button type="submit" className="ghost sm" style={{ color: "#dc2626" }}>Remove</button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. CONFIRMED SHIFTS SCHEDULE */}
      <div style={{ marginTop: "28px" }}>
        <h2>My Confirmed Shifts Schedule</h2>
        {confirmedAssignments.length === 0 ? (
          <p className="card mute">No active confirmed assignments scheduled.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {confirmedAssignments.map((a) => (
              <div key={a.id} className="card row" style={{ borderLeft: "4px solid #16a34a", padding: "10px 16px" }}>
                <div>
                  <b>{a.role.title}</b> at {a.role.event.title}
                  <div className="mute" style={{ fontSize: "0.82rem" }}>
                    {a.role.event.startsAt.toLocaleDateString("en-IN")} · {a.role.event.venue}, {a.role.event.city}
                  </div>
                </div>
                <span className="tag ok">CONFIRMED</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. PAYMENT CREDENTIALS */}
      <h2 style={{ marginTop: "28px" }}>Payment Credentials (Direct Salary Payouts)</h2>
      <BankForm u={u} msg={searchParams.bank} purpose="Required by Admin to disburse your event salary directly to your bank account or UPI after event check-out." />
    </div>
  );
}
