"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import PillNav, { type NavItem } from "@/components/worker/PillNav";
import type { AdminDashboardData } from "@/lib/admin/types";

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/admin?tab=overview", icon: "dashboard", match: (p) => p.includes("overview") || p === "/admin" },
  { label: "10% Platform Fees", href: "/admin?tab=finance", icon: "payments", match: (p) => p.includes("finance") || p.includes("fees") },
  { label: "Live Attendance", href: "/admin?tab=attendance", icon: "how_to_reg", match: (p) => p.includes("attendance") },
  { label: "Events Moderation", href: "/admin?tab=events", icon: "event", match: (p) => p.includes("events") },
  { label: "User Governance", href: "/admin?tab=users", icon: "group", match: (p) => p.includes("users") },
  { label: "Disputes & Support", href: "/admin?tab=support", icon: "support_agent", match: (p) => p.includes("support") || p.includes("disputes") },
];

export default function AdminDashboard({ initialData }: { initialData: AdminDashboardData }) {
  const [data, setData] = useState<AdminDashboardData>(initialData);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = (searchParams?.get("tab") || "overview").toLowerCase();
  const activePath = `/admin?tab=${currentTab}`;

  const tab =
    currentTab === "finance" || currentTab === "fees"
      ? "FEES"
      : currentTab === "attendance"
      ? "ATTENDANCE"
      : currentTab === "events"
      ? "EVENTS"
      : currentTab === "users"
      ? "USERS"
      : currentTab === "support" || currentTab === "disputes"
      ? "DISPUTES"
      : "OVERVIEW";

  const [userSubTab, setUserSubTab] = useState<"ORGANIZERS" | "VOLUNTEERS">("ORGANIZERS");
  const [profileOpen, setProfileOpen] = useState(false);

  // Admin Change Password State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (!(e.target as Element).closest(".rel")) setProfileOpen(false);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, []);

  // Filters
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [eventSearch, setEventSearch] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>("ALL");
  const [eventStatusFilter, setEventStatusFilter] = useState<string>("ALL");
  const [feeStatusFilter, setFeeStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // States for actions & modal dialog
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<{
    title: string;
    body: string;
    inputPlaceholder?: string;
    defaultValue?: string;
    confirmText?: string;
    onConfirm: (val: string) => Promise<void>;
  } | null>(null);
  const [dialogInput, setDialogInput] = useState("");

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (!curPw) return setPwError("Enter your current password.");
    if (newPw.length < 8) return setPwError("New password must be at least 8 characters.");
    if (newPw === curPw) return setPwError("New password must be different from current password.");
    if (newPw !== confirmPw) return setPwError("New passwords do not match.");

    setPwSubmitting(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cur: curPw, n1: newPw }),
      });
      const resData = await res.json();
      setPwSubmitting(false);
      if (res.ok) {
        toast("Admin password updated successfully");
        setShowChangePassword(false);
        setCurPw("");
        setNewPw("");
        setConfirmPw("");
      } else {
        setPwError(resData.error?.message || "Failed to update password");
      }
    } catch {
      setPwSubmitting(false);
      setPwError("Network error updating password");
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/data");
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  // Admin Actions
  const handleVerifyFee = (feeId: string, eventTitle: string, amount: number) => {
    const defaultRef = `UTR-${Date.now().toString().slice(-8)}`;
    setDialogInput(defaultRef);
    setActiveDialog({
      title: "Verify Platform Fee Payment",
      body: `Confirm receipt of 10% platform fee of ₹${amount.toLocaleString("en-IN")} for "${eventTitle}". Enter bank UTR / transaction reference:`,
      inputPlaceholder: "e.g. UTR-20261124-918231",
      defaultValue: defaultRef,
      confirmText: "Mark Fee Paid",
      onConfirm: async (val) => {
        const res = await fetch(`/api/admin/platform-fee/${feeId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PAID", receiptRef: val }),
        });
        if (res.ok) {
          toast("Platform fee verified and marked as PAID");
          await refreshData();
        } else {
          toast("Failed to update fee status");
        }
      },
    });
  };

  const handleWaiveFee = (feeId: string, eventTitle: string) => {
    setActiveDialog({
      title: "Waive Platform Fee",
      body: `Are you sure you want to waive the platform fee for "${eventTitle}"? Enter reason for waiver:`,
      inputPlaceholder: "e.g. Community non-profit event waiver",
      confirmText: "Waive Fee",
      onConfirm: async (val) => {
        const res = await fetch(`/api/admin/platform-fee/${feeId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "WAIVED", receiptRef: `WAIVED: ${val}` }),
        });
        if (res.ok) {
          toast("Platform fee marked as WAIVED");
          await refreshData();
        } else {
          toast("Failed to waive fee");
        }
      },
    });
  };

  const handleToggleOrganizerVerification = async (userId: string, currentVerified: boolean) => {
    try {
      const res = await fetch(`/api/admin/organizers/${userId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !currentVerified }),
      });
      if (res.ok) {
        toast(!currentVerified ? "Organizer verified successfully!" : "Organizer verification revoked");
        await refreshData();
      } else {
        toast("Failed to update verification status");
      }
    } catch {
      toast("Error updating verification");
    }
  };

  const handleToggleUserAccountStatus = (
    userId: string,
    userName: string,
    currentStatus: string,
    defaultReason?: string
  ) => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (nextStatus === "SUSPENDED") {
      setDialogInput(defaultReason || "");
      setActiveDialog({
        title: `Suspend Account: ${userName}`,
        body: `Are you sure you want to suspend ${userName}'s account? This will block their login and prevent creating or applying for events. Enter an optional reason:`,
        inputPlaceholder: "e.g. Excessive cancellations / Unsettled worker payments / Policy violation",
        defaultValue: defaultReason || "",
        confirmText: "Suspend Account",
        onConfirm: async (val) => {
          const res = await fetch(`/api/admin/users/${userId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus, reason: val }),
          });
          if (res.ok) {
            toast(`Account suspended: ${userName}`);
            await refreshData();
          } else {
            toast("Failed to update user account");
          }
        },
      });
    } else {
      setDialogInput("");
      setActiveDialog({
        title: `Reactivate Account: ${userName}`,
        body: `Restore ${userName}'s account to Active status? They will be allowed to log in and participate on CrewHub again.`,
        confirmText: "Reactivate Account",
        onConfirm: async () => {
          const res = await fetch(`/api/admin/users/${userId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
          });
          if (res.ok) {
            toast(`Account reactivated: ${userName}`);
            await refreshData();
          } else {
            toast("Failed to update user account");
          }
        },
      });
    }
  };

  const handleEventStatusAction = (eventId: string, eventTitle: string, newStatus: string) => {
    if (newStatus === "SUSPENDED") {
      setActiveDialog({
        title: "Suspend Event",
        body: `Specify the violation or reason for suspending "${eventTitle}":`,
        inputPlaceholder: "e.g. Unverified location / wage non-compliance",
        confirmText: "Suspend Event",
        onConfirm: async (val) => {
          const res = await fetch(`/api/admin/events/${eventId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "SUSPENDED", suspendedReason: val }),
          });
          if (res.ok) {
            toast("Event has been suspended");
            await refreshData();
          } else {
            toast("Failed to suspend event");
          }
        },
      });
    } else {
      setActiveDialog({
        title: `Change Event Status to ${newStatus}`,
        body: `Are you sure you want to mark "${eventTitle}" as ${newStatus}?`,
        confirmText: `Set to ${newStatus}`,
        onConfirm: async () => {
          const res = await fetch(`/api/admin/events/${eventId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
          if (res.ok) {
            toast(`Event status set to ${newStatus}`);
            await refreshData();
          } else {
            toast("Failed to update event status");
          }
        },
      });
    }
  };

  const handleResolveDispute = (paymentId: string, workerName: string, amount: number) => {
    setActiveDialog({
      title: "Resolve Wage Dispute",
      body: `Confirm that organizer payment of ₹${amount} to ${workerName} has been verified and settled. Enter UTR reference or resolution notes:`,
      inputPlaceholder: "e.g. Verified UPI receipt with bank ref #92019",
      confirmText: "Confirm Settlement",
      onConfirm: async (val) => {
        const res = await fetch(`/api/admin/disputes/${paymentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONFIRMED", disputeNote: `Resolved by admin: ${val}` }),
        });
        if (res.ok) {
          toast("Payment dispute marked as CONFIRMED");
          await refreshData();
        } else {
          toast("Failed to resolve dispute");
        }
      },
    });
  };

  const handleResolveTicket = async (ticketId: string, nextStatus: string) => {
    const res = await fetch(`/api/admin/tickets/${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      toast(`Ticket marked as ${nextStatus}`);
      await refreshData();
    } else {
      toast("Failed to update ticket");
    }
  };

  // Filtered views
  const filteredAttendance = data.attendanceList.filter((a) => {
    if (selectedEventId !== "ALL" && a.eventId !== selectedEventId) return false;
    if (attendanceStatusFilter !== "ALL" && a.status !== attendanceStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.workerName.toLowerCase().includes(q) ||
        a.eventTitle.toLowerCase().includes(q) ||
        a.jobName.toLowerCase().includes(q) ||
        a.workerCity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredEventPills = useMemo(() => {
    if (!eventSearch.trim()) return data.events;
    const q = eventSearch.trim().toLowerCase();
    return data.events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) ||
        Boolean(ev.city && ev.city.toLowerCase().includes(q)) ||
        Boolean(ev.venue && ev.venue.toLowerCase().includes(q))
    );
  }, [data.events, eventSearch]);

  const filteredFees = data.platformFees.filter((f) => {
    if (feeStatusFilter !== "ALL" && f.status !== feeStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.eventTitle.toLowerCase().includes(q) ||
        f.organizerName.toLowerCase().includes(q) ||
        f.organizerEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredEvents = data.events.filter((e) => {
    if (eventStatusFilter !== "ALL" && e.status !== eventStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.organizerName.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredOrganizers = data.organizers.filter((o) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.orgName.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredVolunteers = data.volunteers.filter((v) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="wk org-shell">
      {/* Admin Capsule Header */}
      <header className="bar">
        <div className="wrap pnrow">
          <Link className="brand" href="/admin" aria-label="CrewHub Admin">
            CrewHub <span className="org-tag" style={{ background: "var(--butter)" }}>Admin</span>
          </Link>
          <PillNav items={ADMIN_NAV_ITEMS} pathname={activePath} />
          <span className="sp" />

          {/* Sync Refresh Button */}
          <button
            className="ib"
            aria-label="Refresh Dashboard Data"
            title="Sync Live Data"
            onClick={refreshData}
            disabled={refreshing}
          >
            <span className="ms" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}>
              refresh
            </span>
          </button>

          {/* Avatar & Profile Dropdown matching WorkerShell and OrganizerShell */}
          <div className="rel">
            <button
              className="av"
              id="admin-avb"
              aria-label="Admin profile menu"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              AD
            </button>
            {profileOpen && (
              <div className="dd sm" style={{ minWidth: "220px" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontWeight: 700, fontSize: "15px" }}>CrewHub Administrator</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>admin@crewhub.demo</div>
                  <span className="badge-verified" style={{ marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span className="ms" style={{ fontSize: "14px" }}>shield</span> Super Admin
                  </span>
                </div>
                <Link className="mi" href="/admin?tab=overview" onClick={() => setProfileOpen(false)}>
                  <span className="ms">dashboard</span>Dashboard Overview
                </Link>
                <Link className="mi" href="/admin?tab=finance" onClick={() => setProfileOpen(false)}>
                  <span className="ms">payments</span>Platform Fees
                </Link>
                <Link className="mi" href="/admin?tab=attendance" onClick={() => setProfileOpen(false)}>
                  <span className="ms">how_to_reg</span>Live Attendance
                </Link>
                <Link className="mi" href="/admin?tab=events" onClick={() => setProfileOpen(false)}>
                  <span className="ms">event</span>Events Moderation
                </Link>
                <Link className="mi" href="/admin?tab=users" onClick={() => setProfileOpen(false)}>
                  <span className="ms">group</span>User Governance
                </Link>
                <button
                  className="mi"
                  onClick={() => {
                    setProfileOpen(false);
                    setShowChangePassword(true);
                    setPwError("");
                  }}
                >
                  <span className="ms">lock</span>Change Password
                </button>
                <button className="mi" onClick={logout} style={{ color: "var(--red)" }}>
                  <span className="ms">logout</span>Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        <div className="wrap">
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {tab === "OVERVIEW" && (
            <div>
              {/* Executive Hero Banner */}
              <div className="hero2" style={{ marginBottom: "24px" }}>
                <div className="top">
                  <span className="hi">Co-Founder & Executive Command Center</span>
                  <span className="badge-verified">
                    <span className="ms" style={{ fontSize: "14px" }}>verified</span> Platform Healthy
                  </span>
                </div>
                <h1>
                  Marketplace Pulse & <span className="lav">Revenue Engine</span>
                </h1>
                <p style={{ color: "#d6d6d6", margin: "0", fontSize: "15px" }}>
                  Overseeing ₹{data.stats.totalGMV.toLocaleString("en-IN")} in gross temporary crew wages across {data.stats.totalEvents} events with 10% platform fee monetization.
                </p>
              </div>

              {/* 4 Pastel Financial & Core Operational KPI Cards */}
              <div className="stats" style={{ marginBottom: "24px" }}>
                <div className="stat s0" style={{ background: "var(--lav)" }}>
                  <span className="ic"><span className="ms">payments</span></span>
                  <div>
                    <strong>₹{data.stats.totalRevenueCollected.toLocaleString("en-IN")}</strong>
                    <small>10% Revenue Collected</small>
                  </div>
                </div>
                <div className="stat s1" style={{ background: "var(--butter)" }}>
                  <span className="ic"><span className="ms">pending_actions</span></span>
                  <div>
                    <strong>₹{data.stats.pendingRevenue.toLocaleString("en-IN")}</strong>
                    <small>Uncollected Platform Fees</small>
                  </div>
                </div>
                <div className="stat s2" style={{ background: "var(--mint)" }}>
                  <span className="ic"><span className="ms">event_available</span></span>
                  <div>
                    <strong>{data.stats.activeEvents}</strong>
                    <small>Live Active Events</small>
                  </div>
                </div>
                <div className="stat s3" style={{ background: "var(--sky)" }}>
                  <span className="ic"><span className="ms">group</span></span>
                  <div>
                    <strong>{data.stats.totalWorkers}</strong>
                    <small>Registered Volunteers</small>
                  </div>
                </div>
              </div>

              {/* Operational Action Items Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "28px" }}>
                {/* Alert 1: Unpaid Fees */}
                <div className="panel" style={{ padding: "20px", borderLeft: "4px solid var(--butter)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="ms" style={{ color: "#b57c00" }}>receipt_long</span>
                      <h4 style={{ margin: 0, fontSize: "16px" }}>Platform Fees Receivable</h4>
                    </div>
                    <span className="badge-pay badge-pay-pending">
                      ₹{data.stats.pendingRevenue.toLocaleString("en-IN")} Pending
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: "10px 0 16px" }}>
                    Organizers who have completed or published events with outstanding 10% service fee settlement.
                  </p>
                  <button className="btn sm" onClick={() => router.push("/admin?tab=finance")}>
                    Manage & Collect Fees
                  </button>
                </div>

                {/* Alert 2: Organizer Verification */}
                <div className="panel" style={{ padding: "20px", borderLeft: "4px solid var(--sky)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="ms" style={{ color: "#1a73e8" }}>verified_user</span>
                      <h4 style={{ margin: 0, fontSize: "16px" }}>Organizer Vetting & Trust</h4>
                    </div>
                    <span className="badge-verified">
                      {data.stats.verifiedOrganizers} / {data.stats.totalOrganizers} Verified
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: "10px 0 16px" }}>
                    Protect volunteer safety by vetting event organizer credentials, GST/identity, and business records.
                  </p>
                  <button className="btn sm" onClick={() => { setUserSubTab("ORGANIZERS"); router.push("/admin?tab=users"); }}>
                    Review Organizers
                  </button>
                </div>

                {/* Alert 3: Disputes & Support */}
                <div className="panel" style={{ padding: "20px", borderLeft: "4px solid var(--lav)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="ms" style={{ color: "#6b46c1" }}>gavel</span>
                      <h4 style={{ margin: 0, fontSize: "16px" }}>Disputes & Support Queue</h4>
                    </div>
                    <span className="badge-st badge-draft">
                      {data.stats.activeDisputesCount} Disputes · {data.stats.overduePaymentsCount || 0} Overdue · {data.stats.openTicketsCount} Tickets
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: "10px 0 16px" }}>
                    Mediate volunteer wage disputes and resolve customer support tickets submitted by platform users.
                  </p>
                  <button className="btn sm" onClick={() => router.push("/admin?tab=support")}>
                    Open Dispute Console
                  </button>
                </div>
              </div>

              {/* Recent Events & Staffing Health Snapshot */}
              <div className="panel">
                <div className="ph">
                  <h2>Active Events & Staffing Health Snapshot</h2>
                  <button className="btn sm ghost" onClick={() => router.push("/admin?tab=events")}>
                    View All Events
                  </button>
                </div>
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Event Title</th>
                        <th>Organizer</th>
                        <th>Location</th>
                        <th>Staffing Progress</th>
                        <th>Gross Wages</th>
                        <th>10% CrewHub Fee</th>
                        <th>Event Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.events.slice(0, 6).map((e) => (
                        <tr key={e.id}>
                          <td><b>{e.title}</b><div style={{ fontSize: "12px", color: "var(--muted)" }}>{e.category}</div></td>
                          <td>{e.organizerName}</td>
                          <td>{e.venue}, {e.city}</td>
                          <td>
                            <b>{e.confirmedCrew} / {e.totalVacancies} filled</b>
                          </td>
                          <td>₹{e.totalBudget.toLocaleString("en-IN")}</td>
                          <td>
                            <b>₹{e.platformFeeAmount.toLocaleString("en-IN")}</b>
                            <span className={`badge-pay badge-pay-${e.platformFeeStatus.toLowerCase()}`} style={{ marginLeft: "6px" }}>
                              {e.platformFeeStatus}
                            </span>
                          </td>
                          <td>
                            <span className={`badge-st badge-${e.status.toLowerCase()}`}>
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLATFORM FEES & FINANCIALS */}
          {tab === "FEES" && (
            <div>
              <div className="org-crew-header">
                <div>
                  <h2>CrewHub Platform Fees & Revenue Collection</h2>
                  <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
                    Manage our 10% platform fees on total event staffing payrolls. Verify receipts, track collections, or grant waivers.
                  </p>
                </div>
              </div>

              {/* Capsule Filter Strip */}
              <div className="capsule-filter-container" style={{ marginTop: "16px" }}>
                <div className="capsule-filter-label">
                  <span className="ms">filter_list</span> Fee Status:
                </div>
                <div className="capsule-pills-scroll">
                  {["ALL", "PENDING", "PAID", "WAIVED"].map((st) => (
                    <button
                      key={st}
                      className={`capsule-pill ${feeStatusFilter === st ? "active" : ""}`}
                      onClick={() => setFeeStatusFilter(st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <input
                    type="search"
                    className="inp sm"
                    placeholder="Search by event or organizer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ borderRadius: "999px", padding: "6px 14px", width: "240px" }}
                  />
                </div>
              </div>

              {/* Financial Metrics Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", margin: "20px 0" }}>
                <div className="panel" style={{ padding: "18px", background: "var(--mint)" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Collected Revenue</span>
                  <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>
                    ₹{data.stats.totalRevenueCollected.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="panel" style={{ padding: "18px", background: "var(--butter)" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Pending Receivables</span>
                  <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>
                    ₹{data.stats.pendingRevenue.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="panel" style={{ padding: "18px", background: "#fff" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Gross Payroll GMV</span>
                  <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>
                    ₹{data.stats.totalGMV.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Platform Fees Table */}
              <div className="panel">
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Event & Category</th>
                        <th>Organizer Contact</th>
                        <th>Base Crew Wages</th>
                        <th>Rate</th>
                        <th>10% Fee Due</th>
                        <th>Status</th>
                        <th>Receipt / UTR Reference</th>
                        <th>Admin Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFees.map((f) => (
                        <tr key={f.id}>
                          <td>
                            <b>{f.eventTitle}</b>
                          </td>
                          <td>
                            <b>{f.organizerName}</b>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                              {f.organizerPhone} · {f.organizerEmail}
                            </div>
                          </td>
                          <td>₹{f.baseAmount.toLocaleString("en-IN")}</td>
                          <td>10%</td>
                          <td>
                            <b style={{ fontSize: "15px" }}>₹{f.feeAmount.toLocaleString("en-IN")}</b>
                          </td>
                          <td>
                            <span className={`badge-pay badge-pay-${f.status.toLowerCase()}`}>
                              {f.status}
                            </span>
                          </td>
                          <td>
                            {f.receiptRef ? (
                              <code style={{ fontSize: "12px", background: "#f0f0f8", padding: "3px 8px", borderRadius: "6px" }}>
                                {f.receiptRef}
                              </code>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>Awaiting payment</span>
                            )}
                          </td>
                          <td>
                            <div className="action-btns-row">
                              {f.status === "PENDING" && (
                                <>
                                  <button
                                    className="btn sm"
                                    style={{ padding: "4px 10px", fontSize: "12px" }}
                                    onClick={() => handleVerifyFee(f.id, f.eventTitle, f.feeAmount)}
                                  >
                                    Verify Receipt
                                  </button>
                                  <button
                                    className="btn sm ghost"
                                    style={{ padding: "4px 8px", fontSize: "12px" }}
                                    onClick={() => handleWaiveFee(f.id, f.eventTitle)}
                                  >
                                    Waive
                                  </button>
                                </>
                              )}
                              {f.status === "PAID" && (
                                <span style={{ color: "var(--green)", fontSize: "12px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "2px" }}>
                                  <span className="ms" style={{ fontSize: "14px" }}>done</span> Settled
                                </span>
                              )}
                              {f.status === "WAIVED" && (
                                <span style={{ color: "var(--muted)", fontSize: "12px" }}>Waived</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredFees.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                            No fee records match the selected filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE ATTENDANCE & ON-FLOOR FULFILLMENT */}
          {tab === "ATTENDANCE" && (
            <div>
              <div className="org-crew-header">
                <div>
                  <h2>Live On-Site Crew Attendance</h2>
                  <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
                    Monitor real-time worker check-ins and check-outs across all event venues. Instant synchronization from organizer floor check-ins.
                  </p>
                </div>
              </div>

              {/* Capsule Event Selector */}
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
                    All Events ({data.events.length})
                  </button>
                  {filteredEventPills.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      className={`capsule-pill ${selectedEventId === ev.id ? "active" : ""}`}
                      onClick={() => setSelectedEventId(ev.id)}
                    >
                      {ev.title} ({ev.city})
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

              {/* Capsule Status Filter */}
              <div className="capsule-filter-container" style={{ marginTop: "12px" }}>
                <div className="capsule-filter-label">
                  <span className="ms">check_circle</span> Status:
                </div>
                <div className="capsule-pills-scroll">
                  {["ALL", "CHECKED_IN", "CHECKED_OUT", "ABSENT", "NOT_CHECKED_IN"].map((st) => (
                    <button
                      key={st}
                      className={`capsule-pill ${attendanceStatusFilter === st ? "active" : ""}`}
                      onClick={() => setAttendanceStatusFilter(st)}
                    >
                      {st.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <input
                    type="search"
                    className="inp sm"
                    placeholder="Search volunteer, event or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ borderRadius: "999px", padding: "6px 14px", width: "240px" }}
                  />
                </div>
              </div>

              {/* Attendance Stats Cards */}
              <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
                <div className="capsule-stat-pill" style={{ background: "#e6f7ef", color: "#05944f" }}>
                  <span className="ms">how_to_reg</span>
                  <span>Currently Checked In: <b>{data.stats.checkedInToday}</b></span>
                </div>
                <div className="capsule-stat-pill" style={{ background: "#eaf1fb", color: "#1a73e8" }}>
                  <span className="ms">done_all</span>
                  <span>Checked Out: <b>{data.stats.checkedOutCount}</b></span>
                </div>
                <div className="capsule-stat-pill" style={{ background: "#fff", border: "1px solid var(--line)" }}>
                  <span className="ms">group</span>
                  <span>Total Confirmed Crew: <b>{data.stats.totalConfirmedAssignments}</b></span>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="panel" style={{ marginTop: "16px" }}>
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Volunteer Details</th>
                        <th>Event & Location</th>
                        <th>Organizer</th>
                        <th>Role & Wage</th>
                        <th>Status</th>
                        <th>Check-in Time</th>
                        <th>Check-out Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendance.map((a) => {
                        const inTime = a.checkInAt
                          ? new Date(a.checkInAt).toLocaleTimeString("en-IN", {
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            })
                          : "–";
                        const outTime = a.checkOutAt
                          ? new Date(a.checkOutAt).toLocaleTimeString("en-IN", {
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            })
                          : "–";

                        return (
                          <tr key={a.applicationId}>
                            <td>
                              <b>{a.workerName}</b>
                              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                                {a.workerPhone} · {a.workerEmail}
                              </div>
                            </td>
                            <td>
                              <b>{a.eventTitle}</b>
                              <div style={{ fontSize: "12px", color: "var(--muted)" }}>{a.eventCity}</div>
                            </td>
                            <td>{a.organizerName}</td>
                            <td>
                              <b>{a.jobName}</b> (₹{a.wage})
                            </td>
                            <td>
                              <span className={`badge-att badge-att-${a.status.toLowerCase()}`}>
                                {a.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td>{inTime}</td>
                            <td>{outTime}</td>
                          </tr>
                        );
                      })}
                      {filteredAttendance.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                            No attendance records match the selected criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EVENT MODERATION */}
          {tab === "EVENTS" && (
            <div>
              <div className="org-crew-header">
                <div>
                  <h2>Event Moderation & Quality Control</h2>
                  <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
                    Oversee all events posted by organizers. Review details, staffing vacancies, and manage publication or safety suspensions.
                  </p>
                </div>
              </div>

              {/* Capsule Filter Strip */}
              <div className="capsule-filter-container" style={{ marginTop: "16px" }}>
                <div className="capsule-filter-label">
                  <span className="ms">filter_list</span> Status:
                </div>
                <div className="capsule-pills-scroll">
                  {["ALL", "PUBLISHED", "DRAFT", "SUSPENDED", "COMPLETED"].map((st) => (
                    <button
                      key={st}
                      className={`capsule-pill ${eventStatusFilter === st ? "active" : ""}`}
                      onClick={() => setEventStatusFilter(st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <input
                    type="search"
                    className="inp sm"
                    placeholder="Search by event, venue or organizer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ borderRadius: "999px", padding: "6px 14px", width: "240px" }}
                  />
                </div>
              </div>

              {/* Events Table */}
              <div className="panel" style={{ marginTop: "16px" }}>
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Event Title</th>
                        <th>Organizer</th>
                        <th>Venue & City</th>
                        <th>Event Date</th>
                        <th>Staffing Filled</th>
                        <th>Total Wages</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((e) => (
                        <tr key={e.id}>
                          <td>
                            <b>{e.title}</b>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{e.category}</div>
                            {e.suspendedReason && (
                              <div style={{ fontSize: "11px", color: "var(--red)", marginTop: "2px" }}>
                                Suspended: {e.suspendedReason}
                              </div>
                            )}
                          </td>
                          <td>
                            <b>{e.organizerName}</b>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{e.organizerEmail}</div>
                          </td>
                          <td>{e.venue}, {e.city}</td>
                          <td>{new Date(e.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td>
                            <b>{e.confirmedCrew} / {e.totalVacancies}</b>
                          </td>
                          <td>₹{e.totalBudget.toLocaleString("en-IN")}</td>
                          <td>
                            <span className={`badge-st badge-${e.status.toLowerCase()}`}>
                              {e.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-btns-row">
                              {e.status === "DRAFT" && (
                                <button
                                  className="btn sm"
                                  style={{ padding: "4px 10px", fontSize: "12px" }}
                                  onClick={() => handleEventStatusAction(e.id, e.title, "PUBLISHED")}
                                >
                                  Publish
                                </button>
                              )}
                              {e.status === "PUBLISHED" && (
                                <>
                                  <button
                                    className="btn sm ghost"
                                    style={{ padding: "4px 8px", fontSize: "12px" }}
                                    onClick={() => handleEventStatusAction(e.id, e.title, "COMPLETED")}
                                  >
                                    Complete
                                  </button>
                                  <button
                                    className="btn-text-del"
                                    onClick={() => handleEventStatusAction(e.id, e.title, "SUSPENDED")}
                                  >
                                    Suspend
                                  </button>
                                </>
                              )}
                              {e.status === "SUSPENDED" && (
                                <button
                                  className="btn sm"
                                  style={{ padding: "4px 10px", fontSize: "12px" }}
                                  onClick={() => handleEventStatusAction(e.id, e.title, "PUBLISHED")}
                                >
                                  Reinstate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredEvents.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                            No events match the selected criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: USER GOVERNANCE & VERIFICATION */}
          {tab === "USERS" && (
            <div>
              <div className="org-crew-header">
                <div>
                  <h2>User Governance & Organizer Verification</h2>
                  <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
                    Manage platform trust. Grant verified badges to vetted organizers and manage account suspensions.
                  </p>
                </div>
              </div>

              {/* Subtabs for Organizers vs Volunteers */}
              <div className="capsule-filter-container" style={{ marginTop: "16px" }}>
                <div className="capsule-pills-scroll">
                  <button
                    className={`capsule-pill ${userSubTab === "ORGANIZERS" ? "active" : ""}`}
                    onClick={() => { setUserSubTab("ORGANIZERS"); setSearchQuery(""); }}
                  >
                    Event Organizers ({data.organizers.length})
                  </button>
                  <button
                    className={`capsule-pill ${userSubTab === "VOLUNTEERS" ? "active" : ""}`}
                    onClick={() => { setUserSubTab("VOLUNTEERS"); setSearchQuery(""); }}
                  >
                    Registered Volunteers ({data.volunteers.length})
                  </button>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <input
                    type="search"
                    className="inp sm"
                    placeholder={`Search ${userSubTab.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ borderRadius: "999px", padding: "6px 14px", width: "240px" }}
                  />
                </div>
              </div>

              {userSubTab === "ORGANIZERS" ? (
                <div className="panel" style={{ marginTop: "16px" }}>
                  <div className="scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Organization & Contact</th>
                          <th>Owner Name</th>
                          <th>Events Hosted</th>
                          <th>Payment Discipline</th>
                          <th>Total Fees Paid</th>
                          <th>Fees Pending</th>
                          <th>Verified Badge</th>
                          <th>Account Status</th>
                          <th>Admin Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrganizers.map((o) => (
                          <tr key={o.id}>
                            <td>
                              <b>{o.orgName}</b>
                              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                                {o.phone} · {o.email}
                              </div>
                            </td>
                            <td>{o.name}</td>
                            <td><b>{o.eventsCount} events</b></td>
                            <td>
                              {o.overduePaymentsCount >= 2 ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "#fff1f0",
                                    color: "#cf1322",
                                    border: "1px solid #ffa39e",
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                  }}
                                >
                                  <span className="ms" style={{ fontSize: "13px" }}>report</span>
                                  {o.overduePaymentsCount} Overdue (Auto-Suspended)
                                </span>
                              ) : o.overduePaymentsCount === 1 ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "#fffbe6",
                                    color: "#d48806",
                                    border: "1px solid #ffe58f",
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                  }}
                                >
                                  <span className="ms" style={{ fontSize: "13px" }}>warning</span>
                                  1 Overdue (Restricted)
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "#f6ffed",
                                    color: "#389e0d",
                                    border: "1px solid #b7eb8f",
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                  }}
                                >
                                  <span className="ms" style={{ fontSize: "13px" }}>check_circle</span>
                                  Good Standing
                                </span>
                              )}
                            </td>
                            <td>₹{o.totalFeesPaid.toLocaleString("en-IN")}</td>
                            <td>
                              {o.totalFeesOwed > 0 ? (
                                <span style={{ color: "#b57c00", fontWeight: 600 }}>
                                  ₹{o.totalFeesOwed.toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span style={{ color: "var(--muted)" }}>₹0</span>
                              )}
                            </td>
                            <td>
                              {o.verified ? (
                                <span className="badge-verified">
                                  <span className="ms" style={{ fontSize: "13px" }}>verified</span> Verified
                                </span>
                              ) : (
                                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Unverified</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge-st ${o.status === "ACTIVE" ? "badge-published" : "badge-cancelled"}`}>
                                {o.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-btns-row">
                                <button
                                  className={`btn sm ${o.verified ? "ghost" : ""}`}
                                  style={{ padding: "4px 10px", fontSize: "12px" }}
                                  onClick={() => handleToggleOrganizerVerification(o.id, o.verified)}
                                >
                                  {o.verified ? "Revoke Badge" : "Grant Verified"}
                                </button>
                                <button
                                  className="btn sm"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: "12px",
                                    background: o.status === "ACTIVE" ? "#fff1f0" : "#e6f7ef",
                                    color: o.status === "ACTIVE" ? "#cf1322" : "#05944f",
                                    border: `1px solid ${o.status === "ACTIVE" ? "#ffa39e" : "#a3e0c0"}`,
                                    borderRadius: "999px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                  onClick={() =>
                                    handleToggleUserAccountStatus(
                                      o.id,
                                      o.orgName,
                                      o.status,
                                      o.overduePaymentsCount > 0 ? `${o.overduePaymentsCount} overdue worker payments` : undefined
                                    )
                                  }
                                >
                                  {o.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="panel" style={{ marginTop: "16px" }}>
                  <div className="scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Volunteer Name</th>
                          <th>Contact Details</th>
                          <th>City & Skills</th>
                          <th>Applications</th>
                          <th>Confirmed Shifts</th>
                          <th>Cancellations</th>
                          <th>Attendance Rate</th>
                          <th>Account Status</th>
                          <th>Admin Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVolunteers.map((v) => (
                          <tr key={v.id}>
                            <td>
                              <b>{v.name}</b>
                            </td>
                            <td>
                              <div>{v.phone}</div>
                              <div style={{ fontSize: "12px", color: "var(--muted)" }}>{v.email}</div>
                            </td>
                            <td>
                              <div>{v.city}</div>
                              <div className="org-worker-skills">
                                {v.skills.slice(0, 3).map((sk) => (
                                  <span key={sk} className="skill-mini-tag">{sk}</span>
                                ))}
                              </div>
                            </td>
                            <td>{v.totalApplications}</td>
                            <td><b>{v.confirmedAssignments}</b></td>
                            <td>
                              {v.cancelledCount >= 5 ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "#fff1f0",
                                    color: "#cf1322",
                                    border: "1px solid #ffa39e",
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                  }}
                                >
                                  <span className="ms" style={{ fontSize: "13px" }}>block</span>
                                  {v.cancelledCount}/5 Limit Exceeded
                                </span>
                              ) : v.cancelledCount >= 3 ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "#fffbe6",
                                    color: "#d48806",
                                    border: "1px solid #ffe58f",
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                  }}
                                >
                                  <span className="ms" style={{ fontSize: "13px" }}>warning</span>
                                  {v.cancelledCount}/5 Warning
                                </span>
                              ) : (
                                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                                  {v.cancelledCount || 0} / 5
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: v.attendanceRate >= 80 ? "var(--green)" : "var(--red)" }}>
                                {v.attendanceRate}%
                              </span>
                            </td>
                            <td>
                              <span className={`badge-st ${v.status === "ACTIVE" ? "badge-published" : "badge-cancelled"}`}>
                                {v.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn sm"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "12px",
                                  background: v.status === "ACTIVE" ? "#fff1f0" : "#e6f7ef",
                                  color: v.status === "ACTIVE" ? "#cf1322" : "#05944f",
                                  border: `1px solid ${v.status === "ACTIVE" ? "#ffa39e" : "#a3e0c0"}`,
                                  borderRadius: "999px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  handleToggleUserAccountStatus(
                                    v.id,
                                    v.name,
                                    v.status,
                                    v.cancelledCount >= 3 ? `${v.cancelledCount} event cancellations` : undefined
                                  )
                                }
                              >
                                {v.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DISPUTES & SUPPORT TICKETS */}
          {tab === "DISPUTES" && (
            <div>
              <div className="org-crew-header">
                <div>
                  <h2>Mediation & Support Incident Console</h2>
                  <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
                    Mediate volunteer wage payout disputes, verify UTR transfers, and resolve platform support inquiries.
                  </p>
                </div>
              </div>

              {/* Section 0: Overdue Worker Settlements */}
              <div className="panel" style={{ marginTop: "16px" }}>
                <div className="ph" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2>Overdue Worker Settlements ({data.overduePayments?.length || 0})</h2>
                    <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                      Workers not paid within 24 hours of check-out (Organizer accounts auto-restricted)
                    </span>
                  </div>
                  {data.overduePayments && data.overduePayments.length > 0 && (
                    <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px" }}>
                      Requires Enforcement
                    </span>
                  )}
                </div>
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Worker & UPI</th>
                        <th>Organizer</th>
                        <th>Wage Due</th>
                        <th>Hours Overdue</th>
                        <th>Restriction Status</th>
                        <th>UTR Ref</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.overduePayments || []).map((o) => (
                        <tr key={o.id}>
                          <td><b>{o.eventTitle}</b></td>
                          <td>
                            <b>{o.workerName}</b>
                            <div style={{ fontSize: "12px", color: "#4f46e5" }}>
                              UPI: {o.workerUpi || o.workerPhone + "@upi"}
                            </div>
                          </td>
                          <td>
                            <b>{o.organizerName}</b>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{o.organizerEmail}</div>
                          </td>
                          <td><b style={{ color: "#b91c1c" }}>₹{o.amount.toLocaleString("en-IN")}</b></td>
                          <td>
                            <span style={{ color: "#b91c1c", fontWeight: 700, fontSize: "12px", background: "#fee2e2", padding: "2px 8px", borderRadius: "999px" }}>
                              {o.hoursOverdue}h overdue
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#b91c1c" }}>
                              Posting Restricted
                            </span>
                          </td>
                          <td>
                            {o.upiReference ? (
                              <code style={{ fontSize: "12px", background: "#f0f0f8", padding: "2px 6px", borderRadius: "4px" }}>
                                {o.upiReference}
                              </code>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>–</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn sm"
                              style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "999px", background: "#111", color: "#fff" }}
                              onClick={() => handleResolveDispute(o.paymentId, o.workerName, o.amount)}
                            >
                              Mediate & Resolve
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!data.overduePayments || data.overduePayments.length === 0) && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                            No overdue worker payments. All checked-out crew paid within the 24-hour deadline.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 1: Payment Disputes */}
              <div className="panel" style={{ marginTop: "16px" }}>
                <div className="ph">
                  <h2>Worker Payment Disputes & Mediation ({data.disputes.length})</h2>
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                    Direct wage settlements between organizers and volunteers
                  </span>
                </div>
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Volunteer</th>
                        <th>Organizer</th>
                        <th>Wages Due</th>
                        <th>Dispute Reason</th>
                        <th>UTR Recorded</th>
                        <th>Status</th>
                        <th>Resolution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.disputes.map((d) => (
                        <tr key={d.id}>
                          <td><b>{d.eventTitle}</b></td>
                          <td>
                            <b>{d.workerName}</b>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{d.workerPhone}</div>
                          </td>
                          <td>
                            <b>{d.organizerName}</b>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{d.organizerEmail}</div>
                          </td>
                          <td><b>₹{d.amount.toLocaleString("en-IN")}</b></td>
                          <td>
                            <span style={{ color: "var(--red)", fontSize: "13px" }}>
                              {d.disputeNote || "Worker reported payment not received"}
                            </span>
                          </td>
                          <td>
                            {d.upiReference ? (
                              <code style={{ fontSize: "12px", background: "#f0f0f8", padding: "2px 6px", borderRadius: "4px" }}>
                                {d.upiReference}
                              </code>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>None provided</span>
                            )}
                          </td>
                          <td>
                            <span className="badge-st badge-cancelled">
                              {d.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn sm"
                              style={{ padding: "4px 10px", fontSize: "12px" }}
                              onClick={() => handleResolveDispute(d.paymentId, d.workerName, d.amount)}
                            >
                              Resolve Dispute
                            </button>
                          </td>
                        </tr>
                      ))}
                      {data.disputes.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                            No active payment disputes. All volunteer payouts settled smoothly.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Support Tickets */}
              <div className="panel" style={{ marginTop: "24px" }}>
                <div className="ph">
                  <h2>Platform Inquiries & Support Tickets ({data.supportTickets.length})</h2>
                </div>
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.supportTickets.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <b>{t.userName}</b>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{t.userEmail}</div>
                          </td>
                          <td>
                            <span className="skill-mini-tag">{t.userRole}</span>
                          </td>
                          <td><b>{t.subject}</b></td>
                          <td style={{ maxWidth: "300px" }}>{t.message}</td>
                          <td>{new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                          <td>
                            <span className={`badge-st ${t.status === "RESOLVED" ? "badge-published" : t.status === "OPEN" ? "badge-cancelled" : "badge-draft"}`}>
                              {t.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-btns-row">
                              {t.status !== "RESOLVED" && (
                                <button
                                  className="btn sm"
                                  style={{ padding: "4px 10px", fontSize: "12px" }}
                                  onClick={() => handleResolveTicket(t.id, "RESOLVED")}
                                >
                                  Resolve
                                </button>
                              )}
                              {t.status === "OPEN" && (
                                <button
                                  className="btn sm ghost"
                                  style={{ padding: "4px 8px", fontSize: "12px" }}
                                  onClick={() => handleResolveTicket(t.id, "IN_PROGRESS")}
                                >
                                  In Progress
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {data.supportTickets.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                            No support tickets submitted yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Admin Action Modal Dialog */}
      {activeDialog && (
        <div className="modal-backdrop" onClick={() => setActiveDialog(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{activeDialog.title}</h3>
            <p>{activeDialog.body}</p>
            {activeDialog.inputPlaceholder && (
              <input
                type="text"
                className="inp modal-input"
                placeholder={activeDialog.inputPlaceholder}
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
                autoFocus
              />
            )}
            <div className="modal-actions">
              <button className="btn sm ghost" onClick={() => setActiveDialog(null)}>
                Cancel
              </button>
              <button
                className="btn sm"
                onClick={async () => {
                  await activeDialog.onConfirm(dialogInput);
                  setActiveDialog(null);
                  setDialogInput("");
                }}
              >
                {activeDialog.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Change Password Modal Dialog */}
      {showChangePassword && (
        <div className="modal-backdrop" onClick={() => setShowChangePassword(false)}>
          <div className="modal-box" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span className="ms" style={{ fontSize: "24px" }}>lock</span>
              <h3 style={{ margin: 0, fontSize: "20px" }}>Change Admin Password</h3>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 18px" }}>
              Update your administrator credentials. Minimum 8 characters.
            </p>

            {pwError && (
              <div style={{ background: "#fde8e8", color: "#e11900", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }}>
                {pwError}
              </div>
            )}

            <form onSubmit={handleChangeAdminPassword}>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Current Password *</label>
                <input
                  type="password"
                  className="inp"
                  placeholder="Enter current password"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>New Password *</label>
                <input
                  type="password"
                  className="inp"
                  placeholder="At least 8 characters"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Confirm New Password *</label>
                <input
                  type="password"
                  className="inp"
                  placeholder="Re-enter new password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => setShowChangePassword(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn sm"
                  disabled={pwSubmitting}
                >
                  <span className="ms">lock_reset</span>
                  {pwSubmitting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && <div className="toast-pop">{toastMsg}</div>}
    </div>
  );
}
