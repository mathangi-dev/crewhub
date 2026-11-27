"use client";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useOrganizer } from "../OrganizerProvider";

export default function AttendanceView() {
  const { data, updateAttendance } = useOrganizer();
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get("eventId");

  const { events, applicants } = data;

  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    if (initialEventId && initialEventId !== "ALL") return initialEventId;
    return events[0]?.id || "ALL";
  });
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

  const confirmedCrew = applicants.filter(
    (a) => a.status === "CONFIRMED" && (selectedEventId === "ALL" || a.eventId === selectedEventId)
  );

  const checkedInCount = confirmedCrew.filter((c) => c.attendance?.status === "CHECKED_IN").length;
  const checkedOutCount = confirmedCrew.filter((c) => c.attendance?.status === "CHECKED_OUT").length;

  return (
    <div className="org-crew-container">
      <div className="org-crew-header">
        <div>
          <h2>Event Day Attendance</h2>
          <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
            Track real-time volunteer check-ins and check-outs. Updates sync immediately to Admin and Volunteer dashboards.
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

      {/* Quick Attendance Stats */}
      <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
        <div className="capsule-stat-pill" style={{ background: "#e6f7ef", color: "#05944f" }}>
          <span className="ms">how_to_reg</span>
          <span>Checked In: <b>{checkedInCount}</b></span>
        </div>
        <div className="capsule-stat-pill" style={{ background: "#eaf1fb", color: "#1a73e8" }}>
          <span className="ms">done_all</span>
          <span>Checked Out: <b>{checkedOutCount}</b></span>
        </div>
        <div className="capsule-stat-pill" style={{ background: "#fff", border: "1px solid var(--line)" }}>
          <span className="ms">group</span>
          <span>Total Confirmed Crew: <b>{confirmedCrew.length}</b></span>
        </div>
      </div>

      {/* Table */}
      <div className="panel" style={{ marginTop: "16px" }}>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Crew Member</th>
                <th>Role & Event</th>
                <th>Status</th>
                <th>Check In Time</th>
                <th>Check Out Time</th>
                <th>Mark Status</th>
              </tr>
            </thead>
            <tbody>
              {confirmedCrew.map((c) => {
                const attStatus = c.attendance?.status || "NOT_CHECKED_IN";
                const inTime = c.attendance?.checkInAt
                  ? new Date(c.attendance.checkInAt).toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    })
                  : "–";
                const outTime = c.attendance?.checkOutAt
                  ? new Date(c.attendance.checkOutAt).toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    })
                  : "–";

                return (
                  <tr key={c.id}>
                    <td>
                      <b>{c.workerName}</b>
                      <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span className="ms" style={{ fontSize: "13px" }}>call</span> {c.workerPhone}
                      </div>
                    </td>
                    <td>
                      <div><b>{c.jobName}</b></div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>{c.eventTitle}</div>
                    </td>
                    <td>
                      <span className={`badge-att badge-att-${attStatus.toLowerCase()}`}>
                        {attStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{inTime}</td>
                    <td>{outTime}</td>
                    <td>
                      <div className="att-btn-group">
                        <button
                          type="button"
                          className={`btn sm ${attStatus === "CHECKED_IN" ? "" : "ghost"}`}
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => updateAttendance(c.id, "CHECKED_IN")}
                        >
                          Check In
                        </button>
                        <button
                          type="button"
                          className={`btn sm ${attStatus === "CHECKED_OUT" ? "" : "ghost"}`}
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => updateAttendance(c.id, "CHECKED_OUT")}
                        >
                          Check Out
                        </button>
                        <button
                          type="button"
                          className={`btn sm ${attStatus === "ABSENT" ? "" : "ghost"}`}
                          style={{ padding: "4px 8px", fontSize: "11px", color: "var(--red)" }}
                          onClick={() => updateAttendance(c.id, "ABSENT")}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {confirmedCrew.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    No confirmed crew found for this event yet. Accept applicants from the Crew tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
