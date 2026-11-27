"use client";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useOrganizer } from "../OrganizerProvider";
import {
  generateUpiPayload,
  getUpiQrCodeUrl,
  getUpiDeepLinks,
  getPaymentDeadlineStatus,
} from "@/lib/payments/upi";

interface PayModalData {
  paymentId: string;
  workerName: string;
  workerPhone: string;
  workerUpi: string;
  eventTitle: string;
  jobName: string;
  amount: number;
}

interface FeeModalData {
  feeId: string;
  eventTitle: string;
  feeAmount: number;
}

export default function PaymentsView() {
  const { data, recordPayment, payPlatformFee } = useOrganizer();
  const searchParams = useSearchParams();
  const initialEventId = searchParams?.get("eventId");

  const [subTab, setSubTab] = useState<"WORKERS" | "PLATFORM">("WORKERS");
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    if (initialEventId && initialEventId !== "ALL") return initialEventId;
    return "ALL";
  });
  const [eventSearch, setEventSearch] = useState("");
  const [volunteerSearch, setVolunteerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    if (initialEventId) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId]);

  // State for UPI Modal
  const [payModal, setPayModal] = useState<PayModalData | null>(null);
  const [utrInput, setUtrInput] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State for Platform Fee Modal
  const [feeModal, setFeeModal] = useState<FeeModalData | null>(null);
  const [feeUtrInput, setFeeUtrInput] = useState("");
  const [feeCopySuccess, setFeeCopySuccess] = useState(false);
  const [feeSubmitting, setFeeSubmitting] = useState(false);
  const [feeErrorMsg, setFeeErrorMsg] = useState<string | null>(null);

  const { applicants, events, isRestricted, overdueCount } = data;

  // Filter confirmed crew members
  const workerPayments = applicants.filter((a) => a.status === "CONFIRMED");

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

  const filteredWorkerPayments = useMemo(() => {
    return workerPayments.filter((w) => {
      // 1. Event filter
      if (selectedEventId !== "ALL" && w.eventId !== selectedEventId) return false;

      // 2. Status filter
      const pay = w.payment;
      const payStatus = pay?.status || "PENDING";
      if (statusFilter !== "ALL" && payStatus !== statusFilter) return false;

      // 3. Search query
      if (volunteerSearch.trim()) {
        const q = volunteerSearch.trim().toLowerCase();
        const matchName = w.workerName.toLowerCase().includes(q);
        const matchPhone = w.workerPhone.toLowerCase().includes(q);
        const matchRole = w.jobName.toLowerCase().includes(q);
        const matchUpi = (w.workerUpi || "").toLowerCase().includes(q);
        const matchEvent = w.eventTitle.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchRole && !matchUpi && !matchEvent) return false;
      }

      return true;
    });
  }, [workerPayments, selectedEventId, statusFilter, volunteerSearch]);

  // Financial Stats for selected event / all events
  const currentEventCrew = useMemo(() => {
    return workerPayments.filter((w) => selectedEventId === "ALL" || w.eventId === selectedEventId);
  }, [workerPayments, selectedEventId]);

  const currentCrewCount = currentEventCrew.length;
  const currentWageBudget = currentEventCrew.reduce((acc, w) => acc + (w.payment?.amount || w.wage), 0);
  const currentSettledCrew = currentEventCrew.filter((w) => w.payment?.status === "CONFIRMED");
  const currentSettledAmount = currentSettledCrew.reduce((acc, w) => acc + (w.payment?.amount || w.wage), 0);
  const currentPendingCrew = currentEventCrew.filter((w) => !w.payment || w.payment.status === "PENDING" || w.payment.status === "DISPUTED");
  const currentPendingAmount = currentPendingCrew.reduce((acc, w) => acc + (w.payment?.amount || w.wage), 0);
  const currentOverdueCount = currentEventCrew.filter((w) => {
    const dl = w.payment?.deadlineAt ? new Date(w.payment.deadlineAt) : null;
    return dl && new Date() > dl && w.payment?.status !== "CONFIRMED";
  }).length;

  const filteredPlatformEvents = useMemo(() => {
    return events.filter((e) => {
      if (!e.platformFee) return false;
      if (selectedEventId !== "ALL" && e.id !== selectedEventId) return false;
      if (eventSearch.trim()) {
        const q = eventSearch.trim().toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          (e.city && e.city.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [events, selectedEventId, eventSearch]);

  const openUpiModal = (w: (typeof workerPayments)[0]) => {
    const amount = w.payment?.amount || w.wage;
    const defaultUpi = w.workerUpi || `${w.workerPhone.replace(/[^0-9]/g, "")}@upi`;
    setPayModal({
      paymentId: w.payment?.id || w.id,
      workerName: w.workerName,
      workerPhone: w.workerPhone,
      workerUpi: defaultUpi,
      eventTitle: w.eventTitle,
      jobName: w.jobName,
      amount,
    });
    setUtrInput(w.payment?.upiReference || "");
    setErrorMsg(null);
    setCopySuccess(false);
  };

  const handleCopyUpi = (upiId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleCopyFeeUpi = (upiId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setFeeCopySuccess(true);
      setTimeout(() => setFeeCopySuccess(false), 2000);
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    if (!utrInput.trim()) {
      setErrorMsg("Please enter the 12-digit UPI UTR or Transaction Reference number.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await recordPayment(payModal.paymentId, utrInput.trim());
      setPayModal(null);
      setUtrInput("");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to record payment reference. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeModal) return;
    if (!feeUtrInput.trim()) {
      setFeeErrorMsg("Please enter the UPI Reference or UTR number.");
      return;
    }

    setFeeSubmitting(true);
    setFeeErrorMsg(null);
    try {
      await payPlatformFee(feeModal.feeId, feeUtrInput.trim());
      setFeeModal(null);
      setFeeUtrInput("");
    } catch (err: any) {
      setFeeErrorMsg(err?.message || "Failed to settle platform fee. Please try again.");
    } finally {
      setFeeSubmitting(false);
    }
  };

  // Generate UPI QR for current active modal
  const upiPayload = payModal
    ? generateUpiPayload({
        payeeUpi: payModal.workerUpi,
        payeeName: payModal.workerName,
        amount: payModal.amount,
        transactionNote: `CrewHub - ${payModal.jobName.slice(0, 20)}`,
      })
    : "";
  const upiQrUrl = upiPayload ? getUpiQrCodeUrl(upiPayload, 220) : "";
  const upiLinks = upiPayload ? getUpiDeepLinks(upiPayload) : null;

  const ADMIN_UPI = "crewhub.platform@okaxis";
  const feePayload = feeModal
    ? generateUpiPayload({
        payeeUpi: ADMIN_UPI,
        payeeName: "CrewHub Platform",
        amount: feeModal.feeAmount,
        transactionNote: `Fee - ${feeModal.eventTitle.slice(0, 20)}`,
      })
    : "";
  const feeQrUrl = feePayload ? getUpiQrCodeUrl(feePayload, 220) : "";

  return (
    <div className="org-crew-container">
      {/* Account Restriction Warning Banner */}
      {isRestricted && (
        <div
          style={{
            background: "#fff0f0",
            border: "1.5px solid #ff4d4f",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
            boxShadow: "0 4px 12px rgba(255, 77, 79, 0.08)",
          }}
        >
          <span
            className="ms"
            style={{
              fontSize: "26px",
              color: "#d9363e",
              lineHeight: 1,
              marginTop: "2px",
            }}
          >
            warning
          </span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: "0 0 4px", color: "#a8071a", fontSize: "16px", fontWeight: 700 }}>
              Account Temporarily Restricted ({overdueCount} Overdue Settlement{overdueCount === 1 ? "" : "s"})
            </h4>
            <p style={{ margin: 0, color: "#595959", fontSize: "14px", lineHeight: 1.45 }}>
              You have worker wage payments that exceeded the 24-hour post-checkout deadline.
              In accordance with CrewHub worker protection policy, posting and publishing new events is
              restricted until all overdue worker wages are transferred via UPI and recorded.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="org-crew-header">
        <div>
          <h2>Payments & Wage Settlements</h2>
          <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
            Direct UPI peer-to-peer payouts with zero wage deductions. 24-hour settlement window starts upon worker check-out.
          </p>
        </div>
      </div>

      {/* Sub Tabs in Capsule Style */}
      <div className="capsule-filter-container" style={{ marginTop: "16px" }}>
        <div className="capsule-filter-label">
          <span className="ms">category</span> Category:
        </div>
        <div className="capsule-pills-scroll">
          <button
            type="button"
            className={`capsule-pill ${subTab === "WORKERS" ? "active" : ""}`}
            onClick={() => setSubTab("WORKERS")}
          >
            Direct Worker Wage Settlements ({workerPayments.length})
          </button>
          <button
            type="button"
            className={`capsule-pill ${subTab === "PLATFORM" ? "active" : ""}`}
            onClick={() => setSubTab("PLATFORM")}
          >
            CrewHub 10% Platform Fees ({events.filter((e) => e.platformFee).length})
          </button>
        </div>
      </div>

      {/* Capsule Style Event Selector */}
      <div className="capsule-filter-container" style={{ marginTop: "12px" }}>
        <div className="capsule-filter-label">
          <span className="ms">calendar_month</span> Select Event:
        </div>
        <div className="capsule-pills-scroll">
          <button
            type="button"
            className={`capsule-pill ${selectedEventId === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedEventId("ALL")}
          >
            All Events ({events.length})
          </button>
          {filteredEventPills.map((e) => {
            const confirmedInEvent = applicants.filter(
              (a) => a.eventId === e.id && a.status === "CONFIRMED"
            ).length;
            return (
              <button
                key={e.id}
                type="button"
                className={`capsule-pill ${selectedEventId === e.id ? "active" : ""}`}
                onClick={() => setSelectedEventId(e.id)}
              >
                {e.title}
                <span className="capsule-mini-badge">{confirmedInEvent}/{e.totalVacancies}</span>
              </button>
            );
          })}
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

      {subTab === "WORKERS" && (
        <>
          {/* Status & Volunteer Search Filter Bar */}
          <div className="capsule-filter-container" style={{ marginTop: "12px" }}>
            <div className="capsule-filter-label">
              <span className="ms">filter_list</span> Status:
            </div>
            <div className="capsule-pills-scroll">
              {["ALL", "PENDING", "RECORDED", "CONFIRMED", "DISPUTED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`capsule-pill ${statusFilter === st ? "active" : ""}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === "ALL"
                    ? `All (${workerPayments.filter((w) => selectedEventId === "ALL" || w.eventId === selectedEventId).length})`
                    : st === "RECORDED"
                    ? "Waiting Confirmation"
                    : st.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <div className="capsule-search-box">
              <span className="ms capsule-search-icon">search</span>
              <input
                type="search"
                className="capsule-search-input"
                placeholder="Search worker by name, phone or role..."
                value={volunteerSearch}
                onChange={(e) => setVolunteerSearch(e.target.value)}
              />
              {volunteerSearch && (
                <button
                  type="button"
                  className="capsule-search-clear"
                  onClick={() => setVolunteerSearch("")}
                  title="Clear search"
                >
                  <span className="ms" style={{ fontSize: "14px" }}>close</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Financial Summary Pill Strip for Selected Event */}
          <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
            <div className="capsule-stat-pill" style={{ background: "#f0f4ff", color: "#1e40af" }}>
              <span className="ms">group</span>
              <span>Confirmed Volunteers: <b>{currentCrewCount}</b></span>
            </div>
            <div className="capsule-stat-pill" style={{ background: "#f8fafc", border: "1px solid var(--line)" }}>
              <span className="ms">payments</span>
              <span>Total Wage Budget: <b>₹{currentWageBudget.toLocaleString("en-IN")}</b></span>
            </div>
            <div className="capsule-stat-pill" style={{ background: "#e6f7ef", color: "#05944f" }}>
              <span className="ms">check_circle</span>
              <span>Settled: <b>₹{currentSettledAmount.toLocaleString("en-IN")}</b> ({currentSettledCrew.length})</span>
            </div>
            <div className="capsule-stat-pill" style={{ background: currentPendingCrew.length > 0 ? "#fffbe6" : "#f8fafc", color: currentPendingCrew.length > 0 ? "#d48806" : "var(--muted)", border: currentPendingCrew.length > 0 ? "1px solid #ffe58f" : "1px solid var(--line)" }}>
              <span className="ms">hourglass_top</span>
              <span>Pending / Due: <b>₹{currentPendingAmount.toLocaleString("en-IN")}</b> ({currentPendingCrew.length})</span>
            </div>
            {currentOverdueCount > 0 && (
              <div className="capsule-stat-pill" style={{ background: "#fff1f0", color: "#cf1322", border: "1px solid #ffa39e" }}>
                <span className="ms">warning</span>
                <span>Past 24h Deadline: <b>{currentOverdueCount} Overdue</b></span>
              </div>
            )}
          </div>
        </>
      )}

      {subTab === "WORKERS" ? (
        <div className="panel" style={{ marginTop: "16px" }}>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Worker Details</th>
                  <th>Event & Role</th>
                  <th>Agreed Wage</th>
                  <th>24h Deadline Window</th>
                  <th>Status</th>
                  <th>UPI Reference / UTR</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkerPayments.map((w) => {
                  const pay = w.payment;
                  const payStatus = pay?.status || "PENDING";
                  const amount = pay?.amount || w.wage;
                  const deadlineStatus = getPaymentDeadlineStatus(pay?.deadlineAt, payStatus);
                  const isCheckedOut = w.attendance?.status === "CHECKED_OUT";

                  return (
                    <tr
                      key={w.id}
                      style={{
                        background: deadlineStatus.isOverdue ? "#fffbfb" : undefined,
                      }}
                    >
                      <td>
                        <b>{w.workerName}</b>
                        <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                          Phone: {w.workerPhone}
                        </div>
                        <div style={{ fontSize: "12px", color: "#4f46e5", fontWeight: 500, marginTop: "2px" }}>
                          UPI: {w.workerUpi || `${w.workerPhone.replace(/[^0-9]/g, "")}@upi`}
                        </div>
                      </td>
                      <td>
                        <div><b>{w.jobName}</b></div>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{w.eventTitle}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: "15px", fontWeight: 700, color: "#111" }}>
                          ₹{amount.toLocaleString("en-IN")}
                        </div>
                        <span style={{ fontSize: "10px", color: "#16a34a", fontWeight: 600 }}>
                          100% Direct Payout
                        </span>
                      </td>
                      <td>
                        {isCheckedOut || pay?.deadlineAt ? (
                          <div style={{ display: "inline-flex", flexDirection: "column", gap: "2px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "999px",
                                background:
                                  deadlineStatus.color === "red"
                                    ? "#fee2e2"
                                    : deadlineStatus.color === "amber"
                                    ? "#fef3c7"
                                    : deadlineStatus.color === "green"
                                    ? "#dcfce7"
                                    : "#f3f4f6",
                                color:
                                  deadlineStatus.color === "red"
                                    ? "#b91c1c"
                                    : deadlineStatus.color === "amber"
                                    ? "#b45309"
                                    : deadlineStatus.color === "green"
                                    ? "#15803d"
                                    : "#4b5563",
                              }}
                            >
                              {deadlineStatus.formattedLabel}
                            </span>
                            {pay?.deadlineAt && payStatus === "PENDING" && (
                              <small style={{ fontSize: "10px", color: "var(--muted)" }}>
                                Due: {new Date(pay.deadlineAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </small>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            Awaiting Check-out
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge-pay badge-pay-${payStatus.toLowerCase()}`}>
                          {payStatus === "RECORDED"
                            ? "Waiting Confirmation"
                            : payStatus === "DISPUTED"
                            ? "Disputed by Worker"
                            : payStatus}
                        </span>
                        {pay?.disputeNote && (
                          <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px" }}>
                            Reason: {pay.disputeNote}
                          </div>
                        )}
                      </td>
                      <td>
                        {pay?.upiReference ? (
                          <code
                            style={{
                              fontSize: "12px",
                              background: "#f0f0f8",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontFamily: "monospace",
                            }}
                          >
                            {pay.upiReference}
                          </code>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>–</span>
                        )}
                      </td>
                      <td>
                        {payStatus === "PENDING" || payStatus === "DISPUTED" ? (
                          <button
                            type="button"
                            className="btn primary sm"
                            style={{
                              padding: "6px 14px",
                              fontSize: "12px",
                              borderRadius: "999px",
                              background: deadlineStatus.isOverdue ? "#b91c1c" : "#111",
                              color: "#fff",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={() => openUpiModal(w)}
                          >
                            <span className="ms" style={{ fontSize: "14px" }}>qr_code_2</span>
                            Pay via UPI
                          </button>
                        ) : payStatus === "RECORDED" ? (
                          <button
                            type="button"
                            className="btn sm sec"
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                            onClick={() => openUpiModal(w)}
                          >
                            Update UTR
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--green)",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            <span className="ms" style={{ fontSize: "16px" }}>check_circle</span> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredWorkerPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                      {workerPayments.length === 0
                        ? "No confirmed crew members to settle wages with yet."
                        : "No volunteer payouts match the selected event or criteria."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* PLATFORM FEES TAB */
        <div className="panel" style={{ marginTop: "16px" }}>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Event Title</th>
                  <th>Crew Wage Base</th>
                  <th>Rate</th>
                  <th>CrewHub Fee (10%)</th>
                  <th>Status</th>
                  <th>Receipt Ref</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlatformEvents.map((e) => {
                  const fee = e.platformFee;
                  if (!fee) return null;

                  return (
                    <tr key={e.id}>
                      <td>
                        <b>{e.title}</b>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {e.category} · {e.city}
                        </div>
                      </td>
                      <td>₹{fee.baseAmount.toLocaleString("en-IN")}</td>
                      <td>10%</td>
                      <td>
                        <b style={{ color: "#111" }}>₹{fee.feeAmount.toLocaleString("en-IN")}</b>
                      </td>
                      <td>
                        <span className={`badge-pay badge-pay-${fee.status.toLowerCase()}`}>
                          {fee.status}
                        </span>
                      </td>
                      <td>
                        {fee.receiptRef ? (
                          <code style={{ fontSize: "12px", background: "#f0f0f8", padding: "2px 6px", borderRadius: "4px" }}>
                            {fee.receiptRef}
                          </code>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>–</span>
                        )}
                      </td>
                      <td>
                        {fee.status === "PENDING" ? (
                          <button
                            type="button"
                            className="btn primary sm"
                            style={{ padding: "4px 12px", fontSize: "12px", borderRadius: "999px" }}
                            onClick={() => {
                              setFeeModal({
                                feeId: fee.id,
                                eventTitle: e.title,
                                feeAmount: fee.feeAmount,
                              });
                              setFeeUtrInput("");
                              setFeeErrorMsg(null);
                            }}
                          >
                            Pay 10% Fee
                          </button>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600 }}>
                            Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredPlatformEvents.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                      No platform fees match the selected event.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DYNAMIC UPI MODAL (Inspired by YouPI-PG) */}
      {payModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              width: "100%",
              maxWidth: "480px",
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid #eaeaea",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "19px", color: "#111" }}>Direct UPI Wage Transfer</h3>
                <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>
                  Zero Platform Deductions · 100% to Worker
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPayModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#999",
                  padding: "4px",
                }}
              >
                <span className="ms" style={{ fontSize: "22px" }}>close</span>
              </button>
            </div>

            {/* Wage summary banner */}
            <div
              style={{
                background: "#f8f9ff",
                border: "1px solid #e0e7ff",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>Worker & Role</div>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "#111" }}>
                  {payModal.workerName}
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {payModal.jobName} · {payModal.eventTitle}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>Amount to Pay</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#111" }}>
                  ₹{payModal.amount.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Dynamic UPI QR Code */}
            <div style={{ textAlign: "center", margin: "16px 0" }}>
              {upiQrUrl ? (
                <div
                  style={{
                    display: "inline-block",
                    padding: "10px",
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={upiQrUrl}
                    alt="Scan UPI QR"
                    width={200}
                    height={200}
                    style={{ display: "block", borderRadius: "8px" }}
                  />
                </div>
              ) : (
                <div style={{ padding: "20px", color: "var(--muted)" }}>Generating UPI QR...</div>
              )}
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
                Scan using Google Pay, PhonePe, Paytm, BHIM, or any UPI App
              </div>
            </div>

            {/* Worker UPI ID with quick copy */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f1f5f9",
                borderRadius: "12px",
                padding: "8px 14px",
                marginBottom: "16px",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                  Worker UPI ID
                </span>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", fontFamily: "monospace" }}>
                  {payModal.workerUpi}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyUpi(payModal.workerUpi)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: copySuccess ? "#16a34a" : "#334155",
                }}
              >
                <span className="ms" style={{ fontSize: "14px" }}>
                  {copySuccess ? "check" : "content_copy"}
                </span>
                {copySuccess ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Mobile App Deep Links */}
            {upiLinks && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <a
                  href={upiLinks.standard}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    background: "#0f172a",
                    color: "#ffffff",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Open in UPI App
                </a>
              </div>
            )}

            {/* UTR Form */}
            <form onSubmit={handleSubmitUtr}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  12-Digit UPI Transaction ID / UTR
                </label>
                <input
                  type="text"
                  placeholder="e.g. 402819283741 or UPI/20261125/..."
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #d1d5db",
                    fontSize: "14px",
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                  }}
                />
                <small style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  Enter the confirmation UTR from your bank/UPI app to mark as paid.
                </small>
              </div>

              {errorMsg && (
                <div style={{ color: "#b91c1c", fontSize: "12px", marginBottom: "12px" }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn sec"
                  onClick={() => setPayModal(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={submitting}
                  style={{ background: "#111", color: "#fff" }}
                >
                  {submitting ? "Recording..." : "Record Payment & Notify Worker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLATFORM FEE MODAL */}
      {feeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              width: "100%",
              maxWidth: "460px",
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "19px" }}>Settle 10% Platform Fee</h3>
              <button
                type="button"
                onClick={() => setFeeModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#999" }}
              >
                <span className="ms">close</span>
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 16px" }}>
              CrewHub charges a flat 10% platform fee on primary worker wage budget for organizer infrastructure and verification.
            </p>

            <div style={{ textAlign: "center", margin: "14px 0" }}>
              {feeQrUrl && (
                <img
                  src={feeQrUrl}
                  alt="CrewHub Platform UPI QR"
                  width={180}
                  height={180}
                  style={{ display: "block", margin: "0 auto", borderRadius: "10px", border: "1px solid #ddd" }}
                />
              )}
              <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "10px" }}>
                ₹{feeModal.feeAmount.toLocaleString("en-IN")}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc",
                padding: "8px 12px",
                borderRadius: "10px",
                marginBottom: "16px",
              }}
            >
              <div>
                <small style={{ color: "#64748b", fontSize: "11px" }}>CrewHub Platform UPI ID</small>
                <div style={{ fontWeight: 600, fontSize: "13px", fontFamily: "monospace" }}>{ADMIN_UPI}</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyFeeUpi(ADMIN_UPI)}
                style={{
                  background: "#fff",
                  border: "1px solid #ccc",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                {feeCopySuccess ? "Copied" : "Copy"}
              </button>
            </div>

            <form onSubmit={handleSubmitFee}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  UPI Reference / UTR
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-FEE-9182301"
                  value={feeUtrInput}
                  onChange={(e) => setFeeUtrInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1.5px solid #ccc",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {feeErrorMsg && (
                <div style={{ color: "#b91c1c", fontSize: "12px", marginBottom: "12px" }}>
                  {feeErrorMsg}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn sec" onClick={() => setFeeModal(null)} disabled={feeSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={feeSubmitting} style={{ background: "#111", color: "#fff" }}>
                  {feeSubmitting ? "Settling..." : "Confirm Fee Settlement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
