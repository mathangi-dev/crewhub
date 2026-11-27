"use client";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useOrganizer } from "../OrganizerProvider";

export default function CrewView() {
  const { data, updateApplication, ask } = useOrganizer();
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get("eventId");

  const { events, applicants } = data;

  // Default to the first event if none specified, or initialEventId
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    if (initialEventId && initialEventId !== "ALL") return initialEventId;
    return events[0]?.id || "ALL";
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  const filteredEventPills = useMemo(() => {
    if (!eventSearch.trim()) return events;
    const q = eventSearch.trim().toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.city && e.city.toLowerCase().includes(q)) ||
        (e.venue && e.venue.toLowerCase().includes(q))
    );
  }, [events, eventSearch]);

  const selectedEvent = useMemo(() => {
    if (selectedEventId === "ALL") return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  const handleConfirm = (appId: string, workerName: string, roleName: string) => {
    ask({
      title: "Confirm Crew Member",
      body: `Confirm ${workerName} for role "${roleName}"? This will allocate 1 vacancy and notify the worker.`,
      yes: "Confirm Crew",
      onYes: () => updateApplication(appId, "CONFIRMED"),
    });
  };

  const handleWaitlist = (appId: string) => {
    updateApplication(appId, "WAITLISTED");
  };

  const handleReject = (appId: string, workerName: string) => {
    ask({
      title: "Decline Application",
      body: `Are you sure you want to decline ${workerName}'s application?`,
      yes: "Decline",
      onYes: () => updateApplication(appId, "REJECTED"),
    });
  };

  // Filter applicants based on current search & status
  const filterApp = (app: typeof applicants[0]) => {
    if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        app.workerName.toLowerCase().includes(q) ||
        app.jobName.toLowerCase().includes(q) ||
        app.workerCity.toLowerCase().includes(q)
      );
    }
    return true;
  };

  return (
    <div className="org-crew-container">
      {/* Header */}
      <div className="org-crew-header">
        <div>
          <h2>Crew & Applications</h2>
          <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
            Select an event to view full staffing requirements and manage applicants grouped by role.
          </p>
        </div>
      </div>

      {/* Capsule Style Event Selector */}
      <div className="capsule-filter-container" style={{ marginTop: "16px" }}>
        <div className="capsule-filter-label">
          <span className="ms">event</span> Select Event:
        </div>
        <div className="capsule-pills-scroll">
          <button
            type="button"
            className={`capsule-pill ${selectedEventId === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedEventId("ALL")}
          >
            All Events ({events.length})
          </button>
          {filteredEventPills.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`capsule-pill ${selectedEventId === e.id ? "active" : ""}`}
              onClick={() => setSelectedEventId(e.id)}
            >
              {e.title}
              <span className="capsule-mini-badge">{e.confirmedCrew}/{e.totalVacancies}</span>
            </button>
          ))}
          {filteredEventPills.length === 0 && (
            <span style={{ fontSize: "12px", color: "var(--muted)", padding: "4px 8px", whiteSpace: "nowrap" }}>
              No events matching &ldquo;{eventSearch}&rdquo;
            </span>
          )}
        </div>
        <div className="capsule-search-box">
          <span className="ms capsule-search-icon">search</span>
          <input
            type="search"
            className="capsule-search-input"
            placeholder="Search event by name or city..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
          />
          {eventSearch && (
            <button
              type="button"
              className="capsule-search-clear"
              onClick={() => setEventSearch("")}
              title="Clear event search"
            >
              <span className="ms" style={{ fontSize: "14px" }}>close</span>
            </button>
          )}
        </div>
      </div>

      {/* Capsule Style Status Filter Bar */}
      <div className="capsule-filter-container" style={{ marginTop: "12px" }}>
        <div className="capsule-filter-label">
          <span className="ms">filter_list</span> Filter by Status:
        </div>
        <div className="capsule-pills-scroll">
          {["ALL", "CONFIRMED", "WAITLISTED", "REJECTED"].map((st) => (
            <button
              key={st}
              type="button"
              className={`capsule-pill ${statusFilter === st ? "active" : ""}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <input
            type="search"
            className="inp sm"
            placeholder="Search by worker, skill, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ borderRadius: "999px", padding: "6px 14px", width: "240px" }}
          />
        </div>
      </div>

      {/* Selected Event Details Banner */}
      {selectedEvent && (
        <div className="panel org-event-detail-banner" style={{ marginTop: "20px" }}>
          <div className="org-event-detail-top">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span className="org-card-cat">{selectedEvent.category}</span>
                <span className={`badge-st badge-${selectedEvent.status.toLowerCase()}`}>
                  {selectedEvent.status}
                </span>
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: "22px", letterSpacing: "-0.4px" }}>
                {selectedEvent.title}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", color: "var(--muted)", fontSize: "13px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span className="ms">location_on</span>
                  {selectedEvent.venue}, {selectedEvent.city}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span className="ms">calendar_today</span>
                  {new Date(selectedEvent.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span className="ms">schedule</span>
                  {new Date(selectedEvent.startsAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "numeric", hour12: true })}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span className="ms">hourglass_bottom</span>
                  Deadline: {new Date(selectedEvent.applicationDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="org-event-metrics-row">
              <div className="org-metric-box">
                <span>Total Vacancies</span>
                <b>{selectedEvent.totalVacancies}</b>
              </div>
              <div className="org-metric-box" style={{ background: "var(--mint)" }}>
                <span>Confirmed Crew</span>
                <b>{selectedEvent.confirmedCrew}</b>
              </div>
              <div className="org-metric-box" style={{ background: "var(--sky)" }}>
                <span>Open Spots</span>
                <b>{Math.max(0, selectedEvent.totalVacancies - selectedEvent.confirmedCrew)}</b>
              </div>
              <div className="org-metric-box" style={{ background: "var(--lav)" }}>
                <span>Applications</span>
                <b>{selectedEvent.totalApplicants}</b>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
              <span>Crew Allocation Progress:</span>
              <b>
                {selectedEvent.confirmedCrew} / {selectedEvent.totalVacancies} filled (
                {selectedEvent.totalVacancies > 0
                  ? Math.min(100, Math.round((selectedEvent.confirmedCrew / selectedEvent.totalVacancies) * 100))
                  : 0}
                %)
              </b>
            </div>
            <div className="progress-bar-bg" style={{ height: "10px" }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${
                    selectedEvent.totalVacancies > 0
                      ? Math.min(100, Math.round((selectedEvent.confirmedCrew / selectedEvent.totalVacancies) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Roles Sections: Each Role Gets a Separate Table */}
      {selectedEvent ? (
        <div className="org-roles-tables-stack" style={{ marginTop: "24px" }}>
          {selectedEvent.jobs.map((job, jobIdx) => {
            const roleApplicants = applicants
              .filter((app) => app.eventId === selectedEvent.id && app.jobId === job.id)
              .filter(filterApp);

            const confirmedCount = applicants.filter(
              (app) => app.eventId === selectedEvent.id && app.jobId === job.id && app.status === "CONFIRMED"
            ).length;

            const remaining = Math.max(0, job.vacancies - confirmedCount);

            return (
              <div key={job.id} className="panel org-role-panel" style={{ marginTop: jobIdx === 0 ? "0" : "24px" }}>
                {/* Role Header */}
                <div className="org-role-panel-header">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span className="org-role-num">Role #{jobIdx + 1}</span>
                      <h3 style={{ margin: 0, fontSize: "18px", letterSpacing: "-0.3px" }}>{job.name}</h3>
                      <span className="org-role-wage-pill">
                        ₹{job.wage} /{job.wageType.toLowerCase()}
                      </span>
                      <span
                        className="org-role-vac-pill"
                        style={{
                          background: remaining === 0 ? "#e6f7ef" : "#faf0d7",
                          color: remaining === 0 ? "#05944f" : "#925c00",
                        }}
                      >
                        {confirmedCount} / {job.vacancies} Filled ({remaining} open spots)
                      </span>
                      {job.substituteCount > 0 && (
                        <span
                          className="org-role-vac-pill"
                          style={{
                            background: "#eef2ff",
                            color: "#4338ca",
                            border: "1px solid #c7d2fe",
                          }}
                        >
                          <span className="ms" style={{ fontSize: "14px", verticalAlign: "middle" }}>shield</span>
                          {" "}{job.substituteCount} Backup Substitute{job.substituteCount > 1 ? "s" : ""} (Standby)
                        </span>
                      )}
                    </div>

                    {/* Requirements and Skills */}
                    <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                      {job.eligibility && (
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                          Requirement: {job.eligibility}
                        </span>
                      )}
                      <div className="org-worker-skills">
                        {job.requiredSkills.map((sk) => (
                          <span key={sk} className="skill-mini-tag">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table of Applicants for this specific Role */}
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Worker Details</th>
                        <th>City & Skills</th>
                        <th>Role Type</th>
                        <th>Applied On</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roleApplicants.map((app) => (
                        <tr key={app.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{app.workerName}</div>
                            <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                <span className="ms" style={{ fontSize: "13px" }}>call</span>
                                {app.workerPhone}
                              </span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                <span className="ms" style={{ fontSize: "13px" }}>mail</span>
                                {app.workerEmail}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
                              <span className="ms" style={{ fontSize: "15px" }}>location_on</span>
                              {app.workerCity}
                            </div>
                            <div className="org-worker-skills" style={{ marginTop: "4px" }}>
                              {app.workerSkills.slice(0, 3).map((sk) => (
                                <span key={sk} className="skill-mini-tag">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            {app.isSubstitute ? (
                              <span style={{ fontSize: "11px", fontWeight: 700, background: "#eef2ff", color: "#4338ca", padding: "2px 8px", borderRadius: "999px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                <span className="ms" style={{ fontSize: "12px" }}>shield</span> Backup (Standby)
                              </span>
                            ) : (
                              <span style={{ fontSize: "11px", fontWeight: 700, background: "#f0f0f8", color: "#333", padding: "2px 8px", borderRadius: "999px" }}>
                                Primary Crew
                              </span>
                            )}
                          </td>
                          <td>
                            {new Date(app.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td>
                            <span className={`badge-st badge-${app.status.toLowerCase()}`}>
                              {app.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-btns-row">
                              {app.status !== "CONFIRMED" && (
                                <button
                                  type="button"
                                  className="btn sm"
                                  style={{ padding: "4px 12px", fontSize: "12px" }}
                                  disabled={remaining <= 0}
                                  title={remaining <= 0 ? "All vacancies filled" : "Confirm applicant"}
                                  onClick={() => handleConfirm(app.id, app.workerName, job.name)}
                                >
                                  Confirm
                                </button>
                              )}
                              {app.status !== "WAITLISTED" && app.status !== "CONFIRMED" && (
                                <button
                                  type="button"
                                  className="btn sm ghost"
                                  style={{ padding: "4px 10px", fontSize: "12px" }}
                                  onClick={() => handleWaitlist(app.id)}
                                >
                                  Waitlist
                                </button>
                              )}
                              {app.status !== "REJECTED" && (
                                <button
                                  type="button"
                                  className="btn-text-del"
                                  onClick={() => handleReject(app.id, app.workerName)}
                                >
                                  Decline
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {roleApplicants.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                            No applicants for this role yet. ({remaining} vacancies open)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* If "All Events" is selected, render all events or ask to pick an event */
        <div style={{ marginTop: "20px" }}>
          {events.map((ev) => {
            const evApplicants = applicants.filter((a) => a.eventId === ev.id).filter(filterApp);
            return (
              <div key={ev.id} className="panel" style={{ marginTop: "20px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{ev.title}</h3>
                    <div style={{ fontSize: "13px", color: "var(--muted)", display: "flex", gap: "10px", marginTop: "2px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <span className="ms" style={{ fontSize: "14px" }}>location_on</span>
                        {ev.venue}, {ev.city}
                      </span>
                      <span>·</span>
                      <span>{ev.confirmedCrew}/{ev.totalVacancies} Confirmed</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => setSelectedEventId(ev.id)}
                  >
                    View Roles Breakdown
                  </button>
                </div>

                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Worker</th>
                        <th>Role</th>
                        <th>Location</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evApplicants.slice(0, 5).map((a) => (
                        <tr key={a.id}>
                          <td><b>{a.workerName}</b></td>
                          <td>{a.jobName} (₹{a.wage})</td>
                          <td>{a.workerCity}</td>
                          <td>
                            <span className={`badge-st badge-${a.status.toLowerCase()}`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {evApplicants.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
                            No applicants yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
