"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { App, AppStatus, Ev, Notice, Offer, Pay, Profile } from "@/lib/worker/types";

export type Ask = {
  title: string;
  body: string;
  yes: string;
  danger?: boolean;
  /** When set, a textarea is shown and its text (min 5 chars) is passed to onYes. */
  input?: string;
  onYes: (text: string) => void;
};

export type WorkerDashboardData = {
  events: Ev[];
  apps: App[];
  offer: Offer | null;
  pay: Pay[];
  notices: Notice[];
  profile: Profile;
};

type Ctx = {
  events: Ev[];
  apps: App[];
  offer: Offer | null;
  pay: Pay[];
  notices: Notice[];
  profile: Profile;
  refreshData: () => Promise<void>;
  apply: (eventId: string, jobId: string) => Promise<string | null>;
  cancelApp: (id: string) => void;
  acceptOffer: () => Promise<void>;
  declineOffer: () => Promise<void>;
  confirmPay: (paymentId: string) => Promise<void>;
  disputePay: (paymentId: string) => void;
  markRead: (idOrIndex: string | number) => Promise<void>;
  markAll: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<boolean>;
  notify: (t: string, b: string, h: string) => void;
  toast: (m: string) => void;
  ask: (a: Ask) => void;
};

const C = createContext<Ctx | null>(null);

export function useWorker() {
  const c = useContext(C);
  if (!c) throw new Error("useWorker must be used inside WorkerProvider");
  return c;
}

export default function WorkerProvider({
  initialData,
  user,
  children,
}: {
  initialData?: WorkerDashboardData;
  user: { id?: string; name: string; email: string };
  children: React.ReactNode;
}) {
  const [events, setEvents] = useState<Ev[]>(() => initialData?.events || []);
  const [apps, setApps] = useState<App[]>(() => initialData?.apps || []);
  const [offer, setOffer] = useState<Offer | null>(() => initialData?.offer || null);
  const [pay, setPay] = useState<Pay[]>(() => initialData?.pay || []);
  const [notices, setNotices] = useState<Notice[]>(() => initialData?.notices || []);
  const [profile, setProfile] = useState<Profile>(
    () => initialData?.profile || {
      name: user.name,
      email: user.email,
      phone: "",
      upi: "",
      city: "",
      skills: [],
      exp: "",
      cats: [],
      notif: { email: true, push: true, remind: true },
    }
  );

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch("/api/worker/data");
      if (res.ok) {
        const d: WorkerDashboardData = await res.json();
        setEvents(d.events || []);
        setApps(d.apps || []);
        setOffer(d.offer || null);
        setPay(d.pay || []);
        setNotices(d.notices || []);
        if (d.profile) setProfile(d.profile);
      }
    } catch (err) {
      console.error("Failed to refresh worker data:", err);
    }
  }, []);

  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const toast = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 2800);
  }, []);

  const notify = useCallback((t: string, b: string, h: string) => {
    setNotices((n) => [{ id: "n_" + Date.now(), t, b, h, r: 0 }, ...n]);
  }, []);

  const [dlg, setDlg] = useState<Ask | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (dlg && !d.open) d.showModal();
    if (!dlg && d.open) d.close();
  }, [dlg]);

  const ask = useCallback((a: Ask) => {
    setText("");
    setErr("");
    setDlg(a);
  }, []);

  const yes = () => {
    if (!dlg) return;
    if (dlg.input !== undefined && text.trim().length < 5) {
      setErr("Please enter at least 5 characters.");
      return;
    }
    const d = dlg;
    setDlg(null);
    d.onYes(text.trim());
  };

  const nameOf = (a: App) => {
    if (a.ev) {
      const found = events.find((e) => e.id === a.ev);
      if (found) return found.n;
    }
    return a.name ?? "event";
  };

  const apply: Ctx["apply"] = async (eventId, jobId) => {
    if (apps.some((a) => a.ev === eventId)) {
      return "You already applied to this event.";
    }

    try {
      const res = await fetch("/api/worker/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, eventJobId: jobId }),
      });

      const data = await res.json();
      if (!res.ok) {
        return data.error?.message || "Failed to apply. Please try again.";
      }

      const created: App = data.application;
      setApps((prev) => [created, ...prev]);

      // Update remaining spot count locally
      setEvents((all) =>
        all.map((e) => {
          if (e.id !== eventId) return e;
          return {
            ...e,
            jobs: e.jobs.map((j) => (j.id === jobId && j.s > 0 ? { ...j, s: j.s - 1 } : j)),
          };
        })
      );

      const isConf = created.st === "Confirmed";
      toast(isConf ? `You are confirmed for ${created.name}` : `You joined the waitlist, position #${created.pos}`);
      refreshData();
      return null;
    } catch (e: any) {
      return e.message || "Failed to submit application.";
    }
  };

  const cancelApp = (id: string) => {
    const a = apps.find((x) => x.id === id);
    if (!a) return;

    ask({
      title: "Cancel this application?",
      body: `You will lose your place for ${nameOf(a)}. This cannot be undone.`,
      yes: "Cancel application",
      danger: true,
      onYes: async () => {
        try {
          const res = await fetch(`/api/worker/applications/${id}/cancel`, { method: "POST" });
          if (!res.ok) {
            const data = await res.json();
            toast(data.error?.message || "Could not cancel application");
            return;
          }
          setApps((all) => all.map((x) => (x.id === id ? { ...x, st: "Cancelled", pos: null } : x)));
          toast("Application cancelled");
          refreshData();
        } catch {
          toast("Failed to cancel application");
        }
      },
    });
  };

  const acceptOffer = async () => {
    if (!offer) return;
    try {
      const res = await fetch(`/api/worker/offers/${offer.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) {
        toast("Offer could not be accepted or has expired.");
        refreshData();
        return;
      }
      setApps((all) => all.map((x) => (x.id === offer.app ? { ...x, st: "Confirmed", pos: null } : x)));
      setOffer(null);
      toast("Spot confirmed!");
      refreshData();
    } catch {
      toast("Failed to accept offer");
    }
  };

  const declineOffer = async () => {
    if (!offer) return;
    ask({
      title: "Decline this offer?",
      body: "The spot goes to the next person and you leave the waitlist.",
      yes: "Decline offer",
      danger: true,
      onYes: async () => {
        try {
          await fetch(`/api/worker/offers/${offer.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "decline" }),
          });
          setApps((all) => all.map((x) => (x.id === offer.app ? { ...x, st: "Cancelled", pos: null } : x)));
          setOffer(null);
          toast("Offer declined");
          refreshData();
        } catch {
          toast("Failed to decline offer");
        }
      },
    });
  };

  const confirmPay = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/worker/payments/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      if (res.ok) {
        setPay((p) => p.map((x) => (x.id === paymentId ? { ...x, st: "Confirmed" } : x)));
        toast("Marked as received");
      } else {
        toast("Failed to update payment");
      }
    } catch {
      toast("Failed to update payment");
    }
  };

  const disputePay = (paymentId: string) => {
    const item = pay.find((p) => p.id === paymentId);
    ask({
      title: "Dispute this payment?",
      body: `Tell the admin team what is wrong with the payment for ${item?.ev || "this event"}.`,
      yes: "Send dispute",
      danger: true,
      input: "What went wrong?",
      onYes: async (reason) => {
        try {
          const res = await fetch(`/api/worker/payments/${paymentId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "dispute", disputeNote: reason }),
          });
          if (res.ok) {
            setPay((p) => p.map((x) => (x.id === paymentId ? { ...x, st: "Disputed" } : x)));
            toast("Dispute sent to Admin");
          } else {
            toast("Failed to submit dispute");
          }
        } catch {
          toast("Failed to submit dispute");
        }
      },
    });
  };

  const markRead = async (idOrIndex: string | number) => {
    let noticeId = "";
    if (typeof idOrIndex === "number") {
      noticeId = notices[idOrIndex]?.id || "";
      setNotices((n) => n.map((x, k) => (k === idOrIndex ? { ...x, r: 1 } : x)));
    } else {
      noticeId = idOrIndex;
      setNotices((n) => n.map((x) => (x.id === idOrIndex ? { ...x, r: 1 } : x)));
    }

    if (noticeId) {
      try {
        await fetch("/api/worker/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: noticeId }),
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const markAll = async () => {
    setNotices((n) => n.map((x) => ({ ...x, r: 1 })));
    try {
      await fetch("/api/worker/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const saveProfile = async (p: Profile): Promise<boolean> => {
    try {
      const res = await fetch("/api/worker/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (res.ok) {
        const json = await res.json();
        const updated = {
          ...p,
          latitude: json.coordinates?.latitude ?? p.latitude,
          longitude: json.coordinates?.longitude ?? p.longitude,
        };
        setProfile(updated);
        toast("Profile saved");
        return true;
      } else {
        const d = await res.json();
        toast(d.error?.message || "Failed to save profile");
        return false;
      }
    } catch {
      toast("Network error saving profile");
      return false;
    }
  };

  return (
    <C.Provider
      value={{
        events,
        apps,
        offer,
        pay,
        notices,
        profile,
        refreshData,
        apply,
        cancelApp,
        acceptOffer,
        declineOffer,
        confirmPay,
        disputePay,
        markRead,
        markAll,
        saveProfile,
        notify,
        toast,
        ask,
      }}
    >
      {children}
      <dialog id="dlg" ref={ref} onClose={() => setDlg(null)}>
        <h2 id="dh">{dlg?.title}</h2>
        <p className="sub" id="db">{dlg?.body}</p>
        <div id="dx">
          {dlg?.input !== undefined && (
            <textarea
              id="dtx"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={dlg.input}
              aria-label={dlg.input}
            />
          )}
        </div>
        <p className="er" id="derr">{err}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn sec" id="dn" type="button" onClick={() => setDlg(null)}>
            Cancel
          </button>
          <button className={"btn" + (dlg?.danger ? " red" : "")} id="dy" type="button" onClick={yes}>
            {dlg?.yes}
          </button>
        </div>
      </dialog>
      <div id="toast" className={msg ? "on" : ""} role="status" aria-live="polite">
        {msg}
      </div>
    </C.Provider>
  );
}
