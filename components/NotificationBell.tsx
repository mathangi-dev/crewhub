"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  distance?: number | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      // Ignore network errors in polling
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000); // Poll every 12 seconds for real-time live alert
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_read", id: notif.id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        console.error(e);
      }
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="notif-wrapper" ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="notif-bell-btn"
        aria-label="View notifications"
        style={{
          background: "transparent",
          border: "none",
          padding: "8px",
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "inherit",
          borderRadius: "50%",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: "block" }}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            className="notif-badge"
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              background: "#b42318",
              color: "#fff",
              borderRadius: "99px",
              fontSize: "0.68rem",
              fontWeight: 800,
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 2px #fff",
              animation: "pulse 2s infinite",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notif-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "350px",
            maxWidth: "92vw",
            background: "#fff",
            borderRadius: "18px",
            boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
            border: "1px solid #e5e7eb",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "480px",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #f0f0f2",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fafbfc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#00072D",
                    color: "#fff",
                    borderRadius: "99px",
                    padding: "2px 8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2f80ed",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "36px 20px",
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "0.9rem",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔔</div>
                <b>No notifications yet</b>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
                  You are completely caught up! Live alerts for events, registrations, payouts, and inquiries will appear here in real time.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f4f4f6",
                    background: n.isRead ? "#fff" : "#f0f7ff",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = n.isRead ? "#fafbfc" : "#e6f0fd";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.isRead ? "#fff" : "#f0f7ff";
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: n.isRead ? "transparent" : "#2f80ed",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: "6px",
                      }}
                    >
                      <b
                        style={{
                          fontSize: "0.88rem",
                          color: n.isRead ? "#374151" : "#00072D",
                        }}
                      >
                        {n.title}
                      </b>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", whiteSpace: "nowrap" }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "3px 0 6px",
                        fontSize: "0.82rem",
                        color: "#4b5563",
                        lineHeight: 1.4,
                      }}
                    >
                      {n.message}
                    </p>

                    {n.distance != null && (
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          background: "#e0f2fe",
                          color: "#0369a1",
                          borderRadius: "99px",
                          padding: "2px 8px",
                        }}
                      >
                        📍 {n.distance} km away
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid #f0f0f2",
              textAlign: "center",
              background: "#fafbfc",
            }}
          >
            <Link
              href="/volunteer/events"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#00072D",
                textDecoration: "none",
              }}
            >
              Browse all nearby events →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
