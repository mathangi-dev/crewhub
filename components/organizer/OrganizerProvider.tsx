"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import type { OrganizerDashboardData, CreateEventInput } from "@/lib/organizer/types";

interface AskOpts {
  title: string;
  body: string;
  yes?: string;
  no?: string;
  input?: string;
  defaultValue?: string;
  onYes: (inputValue?: string) => void | Promise<void>;
}

interface OrganizerContextType {
  data: OrganizerDashboardData;
  loading: boolean;
  refresh: () => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<any>;
  updateEventStatus: (
    eventId: string,
    status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED",
    receiptRef?: string
  ) => Promise<void>;
  updateApplication: (applicationId: string, status: "CONFIRMED" | "WAITLISTED" | "REJECTED") => Promise<void>;
  updateAttendance: (applicationId: string, status: string, note?: string) => Promise<void>;
  recordPayment: (paymentId: string, upiReference: string) => Promise<void>;
  payPlatformFee: (feeId: string, receiptRef: string) => Promise<void>;
  toast: (msg: string) => void;
  ask: (opts: AskOpts) => void;
  activeDialog: AskOpts | null;
  closeDialog: () => void;
  toastMsg: string | null;
}

const OrganizerContext = createContext<OrganizerContextType | undefined>(undefined);

export default function OrganizerProvider({
  initialData,
  children,
}: {
  initialData: OrganizerDashboardData;
  children: ReactNode;
}) {
  const [data, setData] = useState<OrganizerDashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<AskOpts | null>(null);

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const ask = (opts: AskOpts) => setActiveDialog(opts);
  const closeDialog = () => setActiveDialog(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/organizer/data");
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
      }
    } catch (err) {
      console.error("Failed to refresh organizer data", err);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (input: CreateEventInput) => {
    setLoading(true);
    try {
      const res = await fetch("/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create event");
      }
      toast(input.status === "PUBLISHED" ? "Event published successfully!" : "Event saved as draft!");
      await refresh();
      return result.event;
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (
    eventId: string,
    status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED",
    receiptRef?: string
  ) => {
    try {
      const res = await fetch(`/api/organizer/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, receiptRef }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || result.error || "Failed to update event status");
      toast(`Event status updated to ${status}`);
      await refresh();
    } catch (err: any) {
      toast(err.message || "Failed to update status");
    }
  };

  const updateApplication = async (
    applicationId: string,
    status: "CONFIRMED" | "WAITLISTED" | "REJECTED"
  ) => {
    try {
      const res = await fetch(`/api/organizer/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update application");
      toast(`Applicant ${status.toLowerCase()}!`);
      await refresh();
    } catch (err: any) {
      toast(err.message || "Failed to update applicant");
    }
  };

  const updateAttendance = async (applicationId: string, status: string, note?: string) => {
    try {
      const res = await fetch("/api/organizer/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status, note }),
      });
      if (!res.ok) throw new Error("Failed to record attendance");
      toast("Attendance updated");
      await refresh();
    } catch (err: any) {
      toast(err.message || "Failed to update attendance");
    }
  };

  const recordPayment = async (paymentId: string, upiReference: string) => {
    try {
      const res = await fetch(`/api/organizer/payments/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiReference }),
      });
      if (!res.ok) throw new Error("Failed to record payment");
      toast("Payment recorded! Worker will confirm receipt.");
      await refresh();
    } catch (err: any) {
      toast(err.message || "Failed to record payment");
    }
  };

  const payPlatformFee = async (feeId: string, receiptRef: string) => {
    try {
      const res = await fetch(`/api/organizer/platform-fee/${feeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptRef }),
      });
      if (!res.ok) throw new Error("Failed to pay platform fee");
      toast("Platform fee settlement recorded!");
      await refresh();
    } catch (err: any) {
      toast(err.message || "Failed to settle fee");
    }
  };

  return (
    <OrganizerContext.Provider
      value={{
        data,
        loading,
        refresh,
        createEvent,
        updateEventStatus,
        updateApplication,
        updateAttendance,
        recordPayment,
        payPlatformFee,
        toast,
        ask,
        activeDialog,
        closeDialog,
        toastMsg,
      }}
    >
      {children}
    </OrganizerContext.Provider>
  );
}

export function useOrganizer() {
  const ctx = useContext(OrganizerContext);
  if (!ctx) throw new Error("useOrganizer must be used within OrganizerProvider");
  return ctx;
}
