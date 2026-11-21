"use client";

import { useState } from "react";
import SubmitBtn from "./SubmitBtn";

export default function CheckoutPaymentModule({
  eventId,
  total,
  totalFormatted,
  adminName,
  adminUpiId,
  adminUpiNumber,
  upiLink,
  qrUrl,
  initialUtr,
  payEventAction,
}: {
  eventId: string;
  total: number;
  totalFormatted: string;
  adminName: string;
  adminUpiId: string;
  adminUpiNumber: string;
  upiLink: string;
  qrUrl: string;
  initialUtr: string;
  payEventAction: (id: string, formData: FormData) => Promise<void>;
}) {
  const [utrClaim, setUtrClaim] = useState(initialUtr);
  const [copied, setCopied] = useState(false);

  const copyVpa = () => {
    navigator.clipboard.writeText(adminUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        margin: "20px 0",
        background: "#ffffff",
        border: "1.5px solid #e2e8f0",
        borderRadius: "14px",
        padding: "20px",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <b style={{ fontSize: "1.05rem", color: "#0f172a" }}>Payment</b>
        <div className="mute" style={{ fontSize: "0.82rem", marginTop: "2px" }}>
          Transfer {totalFormatted} to the Admin escrow account to submit your event for approval.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.88rem" }}>
          <div>
            <span className="mute">Payee:</span> <b>{adminName}</b>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="mute">Admin UPI ID:</span>{" "}
            <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
              {adminUpiId}
            </code>
            <button
              type="button"
              onClick={copyVpa}
              className="btn ghost sm"
              style={{ padding: "2px 8px", fontSize: "0.75rem" }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div>
            <span className="mute">Admin UPI Number:</span>{" "}
            <b>{adminUpiNumber}</b>
          </div>
          <div>
            <span className="mute">Total Escrow Amount:</span>{" "}
            <b style={{ color: "#16a34a", fontSize: "1.1rem" }}>{totalFormatted}</b>
          </div>

          <div style={{ marginTop: "6px" }}>
            <a
              href={upiLink}
              className="btn sm"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Pay via UPI App
            </a>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "10px",
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              border: "1px solid #e2e8f0",
            }}
          >
            <img
              src={qrUrl}
              alt="Scan to pay"
              width={140}
              height={140}
              style={{ display: "block", borderRadius: "8px" }}
            />
          </div>
          <div className="mute" style={{ fontSize: "0.76rem", marginTop: "6px" }}>
            Scan with any UPI app
          </div>
        </div>
      </div>

      <form action={payEventAction.bind(null, eventId)} style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
        <div style={{ marginBottom: "12px" }}>
          <label htmlFor="reference" style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
            Transaction Reference / UTR Number
          </label>
          <input
            id="reference"
            name="reference"
            value={utrClaim}
            onChange={(e) => setUtrClaim(e.target.value)}
            placeholder="12-digit reference number"
            required
            style={{
              width: "100%",
              marginTop: "6px",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1.5px solid #cbd5e1",
              fontFamily: "monospace",
              fontSize: "0.95rem",
            }}
          />
          <div className="mute" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
            Auto-filled with simulated reference for testing, or paste from your transaction.
          </div>
        </div>

        <SubmitBtn pendingText="Submitting payment...">
          Confirm Payment &amp; Submit Event
        </SubmitBtn>
      </form>
    </div>
  );
}
