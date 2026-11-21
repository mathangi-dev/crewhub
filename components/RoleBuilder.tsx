"use client"
import { useState } from "react"

export default function RoleBuilder() {
  const [ids, setIds] = useState([0]), [next, setNext] = useState(1)

  return (
    <div style={{ marginTop: "16px" }}>
      <datalist id="hrs">
        {[2, 3, 4, 5, 6, 8, 10, 12].map(h => <option key={h} value={h} />)}
      </datalist>

      <div className="rb-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <label style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>Event Job Categories & Roles</label>
          <div className="mute" style={{ fontSize: "0.8rem" }}>Define specific worker positions, vacancies, wages and selection methods.</div>
        </div>
        <button
          type="button"
          className="btn sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          onClick={() => { setIds([...ids, next]); setNext(next + 1) }}
        >
          + Add Another Role
        </button>
      </div>

      {ids.map((id, i) => (
        <div
          key={id}
          className="rb-row"
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
          }}
        >
          <div className="rb-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <b style={{ fontSize: "0.95rem", color: "#0f172a" }}>Role #{i + 1} Configuration</b>
            {ids.length > 1 && (
              <button
                type="button"
                className="ghost sm"
                style={{ color: "#dc2626" }}
                onClick={() => setIds(ids.filter(x => x !== id))}
              >
                Remove Role
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <div>
              <label className="sm" htmlFor={`rt${id}`}>Role Title *</label>
              <input id={`rt${id}`} name="roleTitle" placeholder="e.g. Registration, Crowd Management" required />
            </div>

            <div>
              <label className="sm" htmlFor={`rk${id}`}>Vacancies (People Needed) *</label>
              <input id={`rk${id}`} name="roleSlots" type="number" min={1} defaultValue={1} required />
            </div>

            <div>
              <label className="sm" htmlFor={`rwt${id}`}>Wage Type</label>
              <select id={`rwt${id}`} name="roleWageType">
                <option value="HOURLY">Hourly Rate (₹/hr)</option>
                <option value="DAILY">Daily Flat Pay (₹/shift)</option>
              </select>
            </div>

            <div>
              <label className="sm" htmlFor={`rp${id}`}>Wage Amount ₹ *</label>
              <input id={`rp${id}`} name="rolePay" type="number" min={0} defaultValue={300} required />
            </div>

            <div>
              <label className="sm" htmlFor={`rh${id}`}>Shift Duration (Hours) *</label>
              <input id={`rh${id}`} name="roleHours" type="number" list="hrs" min={0.5} step={0.5} defaultValue={4} required />
            </div>

            <div>
              <label className="sm" htmlFor={`rsm${id}`}>Worker Selection Method *</label>
              <select id={`rsm${id}`} name="roleSelectionMethod" defaultValue="FIRST_COME">
                <option value="FIRST_COME">First-Come, First-Served (Auto-Confirm &amp; Waitlist)</option>
                <option value="AUTOMATIC">Automatic Selection (AI/Algorithm Match &amp; Rank)</option>
                <option value="MANUAL">Manual Review (Organizer Reviews &amp; Selects)</option>
              </select>
            </div>

            <div>
              <label className="sm" htmlFor={`rexp${id}`}>Experience Requirement</label>
              <select id={`rexp${id}`} name="roleExperienceReq" defaultValue="None">
                <option value="None">No Prior Experience Required</option>
                <option value="Beginner (1yr)">Beginner (At least 1 event / 1 year)</option>
                <option value="Intermediate (2+ yrs)">Intermediate (2+ years event experience)</option>
                <option value="Expert">Expert / Specialist</option>
              </select>
            </div>

            <div>
              <label className="sm" htmlFor={`rloc${id}`}>Specific Booth / Location</label>
              <input id={`rloc${id}`} name="roleLocation" placeholder="e.g. Codissia Hall A, Gate 3" />
            </div>
          </div>

          <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            <div>
              <label className="sm" htmlFor={`rs${id}`}>Required Skills (comma separated)</label>
              <input id={`rs${id}`} name="roleSkills" placeholder="e.g. Communication, Ticket scanning, Hindi/English" />
            </div>

            <div>
              <label className="sm" htmlFor={`rd${id}`}>Job Duties &amp; Instructions</label>
              <input id={`rd${id}`} name="roleDescription" placeholder="Brief explanation of worker responsibilities during shift" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
