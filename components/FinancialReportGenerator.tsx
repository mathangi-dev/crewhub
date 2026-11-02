"use client";

import React, { useState, useMemo } from "react";

export interface FinancialEvent {
  id: string;
  title: string;
  city: string;
  category: string;
  organizerName: string;
  startsAt: string;
  endsAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  crewTotal: number;
  commission: number;
  refunded: number;
  payStatus: string;
  rolesCount: number;
  volunteersCount: number;
}

export interface FinancialApplication {
  id: string;
  volunteerName: string;
  volunteerEmail: string;
  upi: string;
  eventTitle: string;
  eventId: string;
  roleTitle: string;
  payout: number;
  paidAt: string | null;
}

export interface FinancialTransaction {
  id: string;
  type: string;
  amount: number;
  reference: string;
  paymentMethod: string;
  status: string;
  note: string;
  createdAt: string;
  fromName: string;
  toName: string;
  eventTitle: string;
}

interface Props {
  events: FinancialEvent[];
  applications: FinancialApplication[];
  transactions: FinancialTransaction[];
  defaultMonth?: string;
  defaultYear?: string;
}

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function FinancialReportGenerator({
  events = [],
  applications = [],
  transactions = [],
  defaultMonth = "2026-11",
  defaultYear = "2026",
}: Props) {
  const [mode, setMode] = useState<"month" | "year">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Parse current selected period label
  const periodLabel = useMemo(() => {
    if (mode === "month") {
      const [y, m] = selectedMonth.split("-");
      const mIdx = parseInt(m, 10) - 1;
      return `${MONTH_NAMES[mIdx] || m} ${y}`;
    }
    return `Full Year ${selectedYear}`;
  }, [mode, selectedMonth, selectedYear]);

  // Filter events, applications, and transactions for selected period
  const {
    filteredEvents,
    filteredApplications,
    totalIncome,
    totalProfit,
    totalCrewPayouts,
    totalRefunds,
    profitMargin,
    netCashflow,
  } = useMemo(() => {
    const isMatch = (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, "0");

      if (mode === "month") {
        return `${yyyy}-${mm}` === selectedMonth;
      } else {
        return yyyy === selectedYear;
      }
    };

    const fEvents = events.filter((e) => isMatch(e.paidAt));
    const fApps = applications.filter((a) => isMatch(a.paidAt));

    const income = fEvents.reduce((sum, e) => sum + (e.crewTotal + e.commission), 0);
    const profit = fEvents.reduce((sum, e) => sum + e.commission, 0);
    const crewPayouts = fApps.reduce((sum, a) => sum + a.payout, 0);
    const refunds = fEvents.reduce((sum, e) => sum + (e.refunded || 0), 0);

    const margin = income > 0 ? ((profit / income) * 100).toFixed(1) : "15.0";
    const net = income - crewPayouts - refunds;

    return {
      filteredEvents: fEvents,
      filteredApplications: fApps,
      totalIncome: income,
      totalProfit: profit,
      totalCrewPayouts: crewPayouts,
      totalRefunds: refunds,
      profitMargin: margin,
      netCashflow: net,
    };
  }, [events, applications, mode, selectedMonth, selectedYear]);

  // Export CSV Report
  const handleDownloadCSV = () => {
    const safeCell = (v: any) => {
      let t = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
      return `"${t.replace(/"/g, '""')}"`;
    };

    const rows: string[][] = [];
    rows.push(["CREWHUB FINANCIAL MANAGEMENT & PROFIT STATEMENT"]);
    rows.push([`Reporting Period: ${periodLabel}`]);
    rows.push([`Generated On: ${new Date().toLocaleString("en-IN")}`]);
    rows.push([`Platform Commission Rate: 15%`]);
    rows.push([]);
    rows.push(["FINANCIAL PERFORMANCE SUMMARY"]);
    rows.push(["Gross Income (Total Collected)", inr(totalIncome)]);
    rows.push(["Platform Net Profit (Commission)", inr(totalProfit)]);
    rows.push(["Volunteer Crew Payouts Disbursed", inr(totalCrewPayouts)]);
    rows.push(["Refunds Processed", inr(totalRefunds)]);
    rows.push(["Net Operating Cashflow", inr(netCashflow)]);
    rows.push(["Profit Margin (%)", `${profitMargin}%`]);
    rows.push([]);
    rows.push([
      "EVENT-WISE REVENUE & PROFIT BREAKDOWN",
      "Event Title",
      "Category",
      "City",
      "Organizer",
      "Payment Date",
      "Crew Pay Budget (INR)",
      "Platform Profit / Fee (INR)",
      "Total Collected (INR)",
      "Status",
    ]);

    filteredEvents.forEach((e) => {
      rows.push([
        "",
        safeCell(e.title),
        safeCell(e.category),
        safeCell(e.city),
        safeCell(e.organizerName),
        safeCell(e.paidAt ? new Date(e.paidAt).toLocaleDateString("en-IN") : "N/A"),
        safeCell(e.crewTotal),
        safeCell(e.commission),
        safeCell(e.crewTotal + e.commission),
        safeCell(e.payStatus),
      ]);
    });

    if (filteredApplications.length > 0) {
      rows.push([]);
      rows.push([
        "VOLUNTEER SALARY DISBURSEMENTS (YouPI-PG)",
        "Volunteer Name",
        "Email",
        "UPI Account",
        "Event Title",
        "Role",
        "Amount Disbursed (INR)",
        "Disbursement Date",
      ]);
      filteredApplications.forEach((a) => {
        rows.push([
          "",
          safeCell(a.volunteerName),
          safeCell(a.volunteerEmail),
          safeCell(a.upi),
          safeCell(a.eventTitle),
          safeCell(a.roleTitle),
          safeCell(a.payout),
          safeCell(a.paidAt ? new Date(a.paidAt).toLocaleDateString("en-IN") : "N/A"),
        ]);
      });
    }

    const csvContent = "\uFEFF" + rows.map((r) => r.join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `crewhub-financial-report-${mode}-${mode === "month" ? selectedMonth : selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Straight Right Corner Header Component in History Section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {/* Month & Year Controls */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#ffffff",
            padding: "4px 8px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          {/* Mode Switcher */}
          <div style={{ display: "inline-flex", background: "var(--surface)", padding: "2px", borderRadius: "6px" }}>
            <button
              type="button"
              onClick={() => setMode("month")}
              style={{
                background: mode === "month" ? "var(--navy)" : "transparent",
                color: mode === "month" ? "#ffffff" : "var(--slate-gray)",
                border: "none",
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setMode("year")}
              style={{
                background: mode === "year" ? "var(--navy)" : "transparent",
                color: mode === "year" ? "#ffffff" : "var(--slate-gray)",
                border: "none",
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Year
            </button>
          </div>

          {mode === "month" ? (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || "2026-11")}
              style={{
                padding: "4px 8px",
                fontSize: "0.84rem",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "#ffffff",
                color: "var(--navy)",
                fontWeight: 600,
                cursor: "pointer",
                width: "auto",
              }}
              title="Select Month for Financial Report"
            />
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                padding: "4px 8px",
                fontSize: "0.84rem",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "#ffffff",
                color: "var(--navy)",
                fontWeight: 600,
                cursor: "pointer",
                width: "auto",
              }}
              title="Select Year for Financial Report"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          )}
        </div>

        {/* Generate Report Button - Navy Background + Teal Hover */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn"
          style={{
            background: "var(--navy)",
            color: "#ffffff",
            fontWeight: 600,
            padding: "8px 16px",
            borderRadius: "10px",
            fontSize: "0.88rem",
            whiteSpace: "nowrap",
          }}
        >
          Generate Report
        </button>
      </div>

      {/* Modal Dialog: Full Financial Management Statement */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 7, 45, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "16px",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "860px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0, 7, 45, 0.2)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                background: "var(--navy)",
                color: "#ffffff",
                borderRadius: "16px 16px 0 0",
              }}
            >
              <div>
                <h2 style={{ margin: 0, color: "#ffffff", fontSize: "1.3rem", fontWeight: 800 }}>
                  Financial Management Report
                </h2>
                <div style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "0.85rem", marginTop: "4px" }}>
                  Income, Revenue & Profit Performance Statement for <b>{periodLabel}</b>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "1rem",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Quick Period Selector */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  background: "var(--surface)",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--navy)" }}>
                    Period:
                  </span>
                  <div style={{ display: "inline-flex", background: "#ffffff", padding: "2px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                    <button
                      type="button"
                      onClick={() => setMode("month")}
                      style={{
                        background: mode === "month" ? "var(--navy)" : "transparent",
                        color: mode === "month" ? "#ffffff" : "var(--slate-gray)",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("year")}
                      style={{
                        background: mode === "year" ? "var(--navy)" : "transparent",
                        color: mode === "year" ? "#ffffff" : "var(--slate-gray)",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Yearly
                    </button>
                  </div>

                  {mode === "month" ? (
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value || "2026-11")}
                      style={{
                        padding: "5px 10px",
                        fontSize: "0.85rem",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        background: "#ffffff",
                        color: "var(--navy)",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    />
                  ) : (
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      style={{
                        padding: "5px 10px",
                        fontSize: "0.85rem",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        background: "#ffffff",
                        color: "var(--navy)",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                    </select>
                  )}
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("month");
                      setSelectedMonth("2026-10");
                    }}
                    style={{
                      padding: "4px 9px",
                      fontSize: "0.76rem",
                      borderRadius: "6px",
                      background: selectedMonth === "2026-10" && mode === "month" ? "var(--navy)" : "#ffffff",
                      color: selectedMonth === "2026-10" && mode === "month" ? "#ffffff" : "var(--slate-gray)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Oct 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("month");
                      setSelectedMonth("2026-11");
                    }}
                    style={{
                      padding: "4px 9px",
                      fontSize: "0.76rem",
                      borderRadius: "6px",
                      background: selectedMonth === "2026-11" && mode === "month" ? "var(--navy)" : "#ffffff",
                      color: selectedMonth === "2026-11" && mode === "month" ? "#ffffff" : "var(--slate-gray)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Nov 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("month");
                      setSelectedMonth("2026-12");
                    }}
                    style={{
                      padding: "4px 9px",
                      fontSize: "0.76rem",
                      borderRadius: "6px",
                      background: selectedMonth === "2026-12" && mode === "month" ? "var(--navy)" : "#ffffff",
                      color: selectedMonth === "2026-12" && mode === "month" ? "#ffffff" : "var(--slate-gray)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Dec 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("year");
                      setSelectedYear("2026");
                    }}
                    style={{
                      padding: "4px 9px",
                      fontSize: "0.76rem",
                      borderRadius: "6px",
                      background: mode === "year" && selectedYear === "2026" ? "var(--navy)" : "#ffffff",
                      color: mode === "year" && selectedYear === "2026" ? "#ffffff" : "var(--slate-gray)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Year 2026
                  </button>
                </div>
              </div>

              {/* 4 Financial KPI Cards - Ice Blue Background */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "12px",
                }}
              >
                {/* Gross Income */}
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", color: "var(--slate-gray)", fontWeight: 700, textTransform: "uppercase" }}>
                    Gross Income
                  </span>
                  <b style={{ fontSize: "1.55rem", color: "var(--text-primary)", display: "block", margin: "4px 0 2px" }}>
                    {inr(totalIncome)}
                  </b>
                  <div style={{ fontSize: "0.76rem", color: "var(--slate-gray)" }}>
                    Total collected from organizers
                  </div>
                </div>

                {/* Platform Profit */}
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", color: "var(--teal)", fontWeight: 700, textTransform: "uppercase" }}>
                    Platform Profit
                  </span>
                  <b style={{ fontSize: "1.55rem", color: "var(--navy)", display: "block", margin: "4px 0 2px" }}>
                    {inr(totalProfit)}
                  </b>
                  <div style={{ fontSize: "0.76rem", color: "var(--slate-gray)" }}>
                    15% platform commission
                  </div>
                </div>

                {/* Volunteer Payouts */}
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", color: "var(--slate-gray)", fontWeight: 700, textTransform: "uppercase" }}>
                    Volunteer Payouts
                  </span>
                  <b style={{ fontSize: "1.55rem", color: "var(--text-primary)", display: "block", margin: "4px 0 2px" }}>
                    {inr(totalCrewPayouts)}
                  </b>
                  <div style={{ fontSize: "0.76rem", color: "var(--slate-gray)" }}>
                    Disbursed via YouPI-PG Gateway
                  </div>
                </div>

                {/* Refunds */}
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", color: "var(--slate-gray)", fontWeight: 700, textTransform: "uppercase" }}>
                    Refunded
                  </span>
                  <b style={{ fontSize: "1.55rem", color: "var(--text-primary)", display: "block", margin: "4px 0 2px" }}>
                    {inr(totalRefunds)}
                  </b>
                  <div style={{ fontSize: "0.76rem", color: "var(--slate-gray)" }}>
                    Returned to organizers
                  </div>
                </div>
              </div>

              {/* Profit Margin & Operating Highlights */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--slate-gray)", textTransform: "uppercase", fontWeight: 700 }}>
                    Financial Summary
                  </div>
                  <div style={{ fontSize: "0.92rem", color: "var(--text-primary)", fontWeight: 600, marginTop: "2px" }}>
                    Operating Profit Margin: <b>{profitMargin}%</b> &nbsp;·&nbsp;
                    Net Platform Retained Cash: <b>{inr(netCashflow)}</b>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="tag ok">
                    YouPI-PG Zero-Fee Settlement
                  </span>
                  <span className="tag">
                    {filteredEvents.length} Event{filteredEvents.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 10px", color: "var(--text-primary)" }}>
                  Revenue &amp; Profit Breakdown
                </h3>

                {!filteredEvents.length ? (
                  <p style={{ background: "var(--surface)", padding: "14px", borderRadius: "10px", color: "var(--slate-gray)", fontSize: "0.88rem", textAlign: "center" }}>
                    No funded events found for {periodLabel}.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "10px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", color: "var(--navy)" }}>
                          <th style={{ padding: "10px 12px" }}>Event</th>
                          <th style={{ padding: "10px 12px" }}>Organizer</th>
                          <th style={{ padding: "10px 12px" }}>Payment Date</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Crew Budget</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Profit (15%)</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Total Collected</th>
                          <th style={{ padding: "10px 12px", textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEvents.map((e, idx) => (
                          <tr
                            key={e.id}
                            style={{
                              borderBottom: idx === filteredEvents.length - 1 ? "none" : "1px solid var(--border)",
                              background: idx % 2 === 0 ? "#ffffff" : "var(--surface)",
                            }}
                          >
                            <td style={{ padding: "10px 12px" }}>
                              <b>{e.title}</b>
                              <div style={{ fontSize: "0.75rem", color: "var(--slate-gray)" }}>
                                {e.category} · {e.city}
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px" }}>{e.organizerName}</td>
                            <td style={{ padding: "10px 12px" }}>
                              {e.paidAt ? new Date(e.paidAt).toLocaleDateString("en-IN") : "—"}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>
                              {inr(e.crewTotal)}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--navy)" }}>
                              {inr(e.commission)}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
                              {inr(e.crewTotal + e.commission)}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <span className="tag ok">
                                {e.payStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid var(--border)",
                background: "var(--surface)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                borderRadius: "0 0 16px 16px",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "var(--slate-gray)" }}>
                Verified via CrewHub Financial Management Engine &amp; YouPI-PG Ledger.
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="btn"
                  style={{
                    background: "var(--navy)",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    padding: "8px 16px",
                  }}
                >
                  Download CSV Statement
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn ghost"
                  style={{
                    fontSize: "0.85rem",
                    padding: "8px 14px",
                  }}
                >
                  Print Report
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn ghost"
                  style={{
                    fontSize: "0.85rem",
                    padding: "8px 14px",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
