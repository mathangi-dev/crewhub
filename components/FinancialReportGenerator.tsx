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
  defaultMonth?: string; // "YYYY-MM", e.g. "2026-11"
  defaultYear?: string;  // "YYYY", e.g. "2026"
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
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth); // "2026-11"
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);   // "2026"
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
    filteredTransactions,
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

    // Filter events where paidAt matches
    const fEvents = events.filter((e) => isMatch(e.paidAt));

    // Filter applications where paidAt matches
    const fApps = applications.filter((a) => isMatch(a.paidAt));

    // Filter transactions where createdAt matches
    const fTxs = transactions.filter((t) => isMatch(t.createdAt));

    // Calculate income: Total gross collected (crewTotal + commission) for events paid in this period
    const income = fEvents.reduce((sum, e) => sum + (e.crewTotal + e.commission), 0);

    // Calculate profit: 15% platform commission retained as profit
    const profit = fEvents.reduce((sum, e) => sum + e.commission, 0);

    // Calculate volunteer crew payouts disbursed in this period
    const crewPayouts = fApps.reduce((sum, a) => sum + a.payout, 0);

    // Calculate refunds processed in this period
    const refunds = fEvents.reduce((sum, e) => sum + (e.refunded || 0), 0);

    const margin = income > 0 ? ((profit / income) * 100).toFixed(1) : "15.0";
    const net = income - crewPayouts - refunds;

    return {
      filteredEvents: fEvents,
      filteredApplications: fApps,
      filteredTransactions: fTxs,
      totalIncome: income,
      totalProfit: profit,
      totalCrewPayouts: crewPayouts,
      totalRefunds: refunds,
      profitMargin: margin,
      netCashflow: net,
    };
  }, [events, applications, transactions, mode, selectedMonth, selectedYear]);

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
      {/* Straight Right Corner Header Component in .dh */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {/* Quick Month & Year Picker */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#f8fafc",
            padding: "5px 12px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {/* Mode Switcher */}
          <div style={{ display: "inline-flex", background: "#e2e8f0", padding: "2px", borderRadius: "8px" }}>
            <button
              type="button"
              onClick={() => setMode("month")}
              style={{
                background: mode === "month" ? "#0284c7" : "transparent",
                color: mode === "month" ? "#ffffff" : "#475569",
                border: "none",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setMode("year")}
              style={{
                background: mode === "year" ? "#0284c7" : "transparent",
                color: mode === "year" ? "#ffffff" : "#475569",
                border: "none",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Year
            </button>
          </div>

          {/* Month or Year Input */}
          {mode === "month" ? (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || "2026-11")}
              style={{
                padding: "4px 8px",
                fontSize: "0.85rem",
                border: "1px solid #94a3b8",
                borderRadius: "6px",
                background: "#ffffff",
                color: "#0f172a",
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
                fontSize: "0.85rem",
                border: "1px solid #94a3b8",
                borderRadius: "6px",
                background: "#ffffff",
                color: "#0f172a",
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

        {/* Generate Report Button */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn"
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            color: "#ffffff",
            fontWeight: 700,
            padding: "8px 18px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(2, 132, 199, 0.35)",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.9rem",
            whiteSpace: "nowrap",
          }}
        >
          <span>📊</span>
          <span>Generate Report</span>
        </button>
      </div>

      {/* Modal Dialog: Full Financial Management & P&L Statement */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              maxWidth: "880px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "22px 28px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                borderRadius: "20px 20px 0 0",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.4rem" }}>📊</span>
                  <h2 style={{ margin: 0, color: "#ffffff", fontSize: "1.35rem", fontWeight: 800 }}>
                    Financial Management Report
                  </h2>
                </div>
                <div style={{ color: "#94a3b8", fontSize: "0.88rem", marginTop: "4px" }}>
                  Official Revenue, Income & Profit Performance Statement for <b>{periodLabel}</b>
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
                  width: "32px",
                  height: "32px",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  fontWeight: 700,
                  transition: "background 0.15s",
                }}
                title="Close Report"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "22px" }}>
              {/* Quick Period Selector Inside Modal */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  background: "#f8fafc",
                  padding: "12px 18px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
                    Select Required Period:
                  </span>
                  <div style={{ display: "inline-flex", background: "#e2e8f0", padding: "2px", borderRadius: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setMode("month")}
                      style={{
                        background: mode === "month" ? "#0284c7" : "transparent",
                        color: mode === "month" ? "#ffffff" : "#475569",
                        border: "none",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("year")}
                      style={{
                        background: mode === "year" ? "#0284c7" : "transparent",
                        color: mode === "year" ? "#ffffff" : "#475569",
                        border: "none",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
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
                        padding: "6px 12px",
                        fontSize: "0.88rem",
                        border: "1px solid #94a3b8",
                        borderRadius: "8px",
                        background: "#ffffff",
                        color: "#0f172a",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    />
                  ) : (
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.88rem",
                        border: "1px solid #94a3b8",
                        borderRadius: "8px",
                        background: "#ffffff",
                        color: "#0f172a",
                        fontWeight: 700,
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

                {/* Quick Presets */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("month");
                      setSelectedMonth("2026-10");
                    }}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      borderRadius: "6px",
                      background: selectedMonth === "2026-10" && mode === "month" ? "#0f172a" : "#ffffff",
                      color: selectedMonth === "2026-10" && mode === "month" ? "#ffffff" : "#334155",
                      border: "1px solid #cbd5e1",
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
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      borderRadius: "6px",
                      background: selectedMonth === "2026-11" && mode === "month" ? "#0f172a" : "#ffffff",
                      color: selectedMonth === "2026-11" && mode === "month" ? "#ffffff" : "#334155",
                      border: "1px solid #cbd5e1",
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
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      borderRadius: "6px",
                      background: selectedMonth === "2026-12" && mode === "month" ? "#0f172a" : "#ffffff",
                      color: selectedMonth === "2026-12" && mode === "month" ? "#ffffff" : "#334155",
                      border: "1px solid #cbd5e1",
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
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      borderRadius: "6px",
                      background: mode === "year" && selectedYear === "2026" ? "#0f172a" : "#ffffff",
                      color: mode === "year" && selectedYear === "2026" ? "#ffffff" : "#334155",
                      border: "1px solid #cbd5e1",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Full Year 2026
                  </button>
                </div>
              </div>

              {/* 4 Key Financial Metrics Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px",
                }}
              >
                {/* 1. Gross Income */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                    border: "1px solid #86efac",
                    borderRadius: "14px",
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
                      Gross Income
                    </span>
                    <span style={{ fontSize: "1.1rem" }}>💰</span>
                  </div>
                  <b style={{ fontSize: "1.65rem", color: "#14532d", display: "block", margin: "6px 0 2px" }}>
                    {inr(totalIncome)}
                  </b>
                  <div style={{ fontSize: "0.76rem", color: "#15803d" }}>
                    Total collected from organizers
                  </div>
                </div>

                {/* 2. Platform Profit */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    border: "1px solid #93c5fd",
                    borderRadius: "14px",
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#1e40af", fontWeight: 700, textTransform: "uppercase" }}>
                      Platform Profit
                    </span>
                    <span style={{ fontSize: "1.1rem" }}>📈</span>
                  </div>
                  <b style={{ fontSize: "1.65rem", color: "#1e3a8a", display: "block", margin: "6px 0 2px" }}>
                    {inr(totalProfit)}
                  </b>
                  <div style={{ fontSize: "0.76rem", color: "#2563eb" }}>
                    15% Commission (Pure Revenue)
                  </div>
                </div>

                {/* 3. Volunteer Payouts */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
                    border: "1px solid #d8b4fe",
                    borderRadius: "14px",
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#6b21a8", fontWeight: 700, textTransform: "uppercase" }}>
                      Volunteer Payouts
                    </span>
                    <span style={{ fontSize: "1.1rem" }}>👥</span>
                  </div>
                  <b style={{ fontSize: "1.65rem", color: "#581c87", display: "block", margin: "6px 0 2px" }}>
                    {inr(totalCrewPayouts)}
                  </b>
                  <div style={{ fontSize: "0.76rem", color: "#7e22ce" }}>
                    Disbursed via YouPI-PG Gateway
                  </div>
                </div>

                {/* 4. Refunds Processed */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                    border: "1px solid #fed7aa",
                    borderRadius: "14px",
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#9a3412", fontWeight: 700, textTransform: "uppercase" }}>
                      Refunded
                    </span>
                    <span style={{ fontSize: "1.1rem" }}>🔄</span>
                  </div>
                  <b style={{ fontSize: "1.65rem", color: "#7c2d12", display: "block", margin: "6px 0 2px" }}>
                    {inr(totalRefunds)}
                  </b>
                  <div style={{ fontSize: "0.76rem", color: "#c2410c" }}>
                    Returned to organizers
                  </div>
                </div>
              </div>

              {/* Profit Margin & Performance Highlights Banner */}
              <div
                style={{
                  background: "#f1f5f9",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.82rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    Financial Efficiency & Zero-Fee Settlement
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 600, marginTop: "2px" }}>
                    Operating Profit Margin: <b style={{ color: "#0284c7" }}>{profitMargin}%</b> &nbsp;·&nbsp;
                    Net Platform Retained Cash: <b style={{ color: "#059669" }}>{inr(netCashflow)}</b>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      background: "#dcfce7",
                      color: "#166534",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "99px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ✓ YouPI-PG 0% Gateway Fee
                  </span>
                  <span
                    style={{
                      background: "#e0f2fe",
                      color: "#0369a1",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "99px",
                    }}
                  >
                    {filteredEvents.length} Event{filteredEvents.length === 1 ? "" : "s"} In Period
                  </span>
                </div>
              </div>

              {/* Itemized Table of Events & Revenue in Selected Period */}
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 10px", color: "#0f172a" }}>
                  📋 Revenue & Profit Breakdown ({filteredEvents.length} Events)
                </h3>

                {!filteredEvents.length ? (
                  <p style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", color: "#64748b", fontSize: "0.9rem", textAlign: "center" }}>
                    No funded events found for {periodLabel}. Try selecting another month or &quot;Full Year 2026&quot;.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
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
                              borderBottom: idx === filteredEvents.length - 1 ? "none" : "1px solid #f1f5f9",
                              background: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                            }}
                          >
                            <td style={{ padding: "10px 12px" }}>
                              <b>{e.title}</b>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {e.category} · {e.city}
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px" }}>{e.organizerName}</td>
                            <td style={{ padding: "10px 12px" }}>
                              {e.paidAt ? new Date(e.paidAt).toLocaleDateString("en-IN") : "—"}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right", color: "#334155" }}>
                              {inr(e.crewTotal)}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right", color: "#0284c7", fontWeight: 700 }}>
                              {inr(e.commission)}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a", fontWeight: 700 }}>
                              {inr(e.crewTotal + e.commission)}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <span
                                style={{
                                  background: "#dcfce7",
                                  color: "#166534",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "99px",
                                }}
                              >
                                {e.payStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "#f1f5f9", fontWeight: 800, borderTop: "2px solid #cbd5e1" }}>
                          <td colSpan={3} style={{ padding: "10px 12px", color: "#0f172a" }}>
                            TOTAL FOR {periodLabel.toUpperCase()}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#334155" }}>
                            {inr(filteredEvents.reduce((n, x) => n + x.crewTotal, 0))}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#0284c7" }}>
                            {inr(totalProfit)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#059669" }}>
                            {inr(totalIncome)}
                          </td>
                          <td style={{ padding: "10px 12px" }}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer / Action Buttons */}
            <div
              style={{
                padding: "16px 28px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                borderRadius: "0 0 20px 20px",
              }}
            >
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                🔒 Generated securely via CrewHub Financial Management Engine &amp; YouPI-PG Ledger.
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="btn"
                  style={{
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    padding: "9px 18px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>📥</span>
                  <span>Download CSV Statement</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn"
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    fontWeight: 700,
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>🖨️</span>
                  <span>Print Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn ghost"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
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
