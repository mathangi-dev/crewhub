import { need } from "@/lib/auth";
import { saveProfile } from "@/app/actions";
import BankForm from "@/components/BankForm";

export default async function Page({ searchParams }: { searchParams: { bank?: string; saved?: string } }) {
  const u = await need("VOLUNTEER");

  return (
    <div className="compact">
      <div className="dh">
        <div>
          <span className="mute">Volunteer dashboard</span>
          <h1>Volunteer Profile</h1>
        </div>
      </div>
      <p className="mute">
        Keep your details accurate and complete. Organizers match crew requirements by your location, skills, and availability.
      </p>

      {searchParams.saved && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "10px 16px", marginBottom: "16px", color: "#065f46" }}>
          ✓ Profile details updated successfully!
        </div>
      )}

      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "12px 18px", marginBottom: "18px", color: "#166534", fontSize: "0.85rem" }}>
        🔒 <b>Secured Personal Information:</b> Your phone number, age, gender, and UPI/banking credentials are fully protected and strictly viewable only by authorized CrewHub Admins for payout processing and safety verification.
      </div>

      <h2 style={{ marginTop: 0 }}>Personal & Contact Details</h2>
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
            <label htmlFor="skills">Skills & Expertise</label>
            <input id="skills" name="skills" defaultValue={u.skills} placeholder="e.g. ushering, crowd control, registration, AV support" />
          </div>
          <div>
            <label htmlFor="interests">Interests & Event Types</label>
            <input id="interests" name="interests" defaultValue={u.interests} placeholder="e.g. Concerts, expos, sports, tech meetups" />
          </div>
        </div>

        <div>
          <label htmlFor="availability">Weekly Availability</label>
          <input id="availability" name="availability" defaultValue={u.availability} placeholder="e.g. Weekends only, Friday to Sunday evenings" />
        </div>

        <div>
          <label htmlFor="bio">About You / Event Experience</label>
          <textarea id="bio" name="bio" rows={3} defaultValue={u.bio} placeholder="Briefly describe any past volunteering experience or why you love event management..." />
        </div>

        <p style={{ marginTop: "6px" }}>
          <button type="submit">Save Profile</button>
        </p>
      </form>

      <h2>Payment Credentials (Direct Salary Payouts)</h2>
      <BankForm u={u} msg={searchParams.bank} purpose="Required by Admin to disburse your event salary directly to your bank account or UPI after event check-out." />
    </div>
  );
}
