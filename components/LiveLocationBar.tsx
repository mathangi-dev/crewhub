"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Props {
  userCity: string;
  userLat?: number | null;
  userLng?: number | null;
  lastLocationAt?: string | null;
}

export default function LiveLocationBar({
  userCity,
  userLat,
  userLng,
  lastLocationAt,
}: Props) {
  const [isLocating, setIsLocating] = useState(false);
  const [status, setStatus] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const hasLiveCoords = userLat != null && userLng != null;
  const currentRadiusFilter = searchParams.get("radius") || "";

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setStatus("Fetching your real-time GPS position...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });

          if (res.ok) {
            setStatus("📍 Real-time location updated!");
            // Update URL search params with coordinates so server page instantly sorts
            const params = new URLSearchParams(searchParams.toString());
            params.set("lat", latitude.toFixed(6));
            params.set("lng", longitude.toFixed(6));
            router.replace(`${pathname}?${params.toString()}`);
            router.refresh();
          } else {
            setStatus("Failed to save location.");
          }
        } catch (e) {
          setStatus("Error saving location.");
        } finally {
          setIsLocating(false);
          setTimeout(() => setStatus(""), 4000);
        }
      },
      (err) => {
        setIsLocating(false);
        setStatus(`GPS access denied or timed out (${err.message}). Using city default.`);
        setTimeout(() => setStatus(""), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRadiusChange = (radiusVal: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (radiusVal) {
      params.set("radius", radiusVal);
    } else {
      params.delete("radius");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f0f7ff 0%, #e6f0fd 100%)",
        border: "1px solid #bfdbfe",
        borderRadius: "20px",
        padding: "16px 20px",
        margin: "16px 0 24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#2563eb",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: "1.1rem",
              flexShrink: 0,
            }}
          >
            📍
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#00072D" }}>
              Live Location Tracking:{" "}
              <span style={{ color: hasLiveCoords ? "#059669" : "#4b5563" }}>
                {hasLiveCoords ? "GPS Active" : `City Default (${userCity || "Not set"})`}
              </span>
            </div>
            <div className="mute" style={{ fontSize: "0.82rem" }}>
              {hasLiveCoords
                ? `${userLat?.toFixed(4)}° N, ${userLng?.toFixed(4)}° E · Events within 10–20 km appear first!`
                : "Enable GPS to automatically sort nearest events first and receive 10–20 km radius alerts"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleUpdateLocation}
            disabled={isLocating}
            style={{
              background: "#00072D",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "99px",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🎯</span> {isLocating ? "Detecting GPS..." : "Update Live Location"}
          </button>
        </div>
      </div>

      {status && (
        <div
          style={{
            fontSize: "0.85rem",
            color: "#1d4ed8",
            fontWeight: 600,
            background: "#dbeafe",
            padding: "6px 12px",
            borderRadius: "8px",
          }}
        >
          {status}
        </div>
      )}

      {/* Radius quick filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          borderTop: "1px solid #dbeafe",
          paddingTop: "10px",
        }}
      >
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e3a8a" }}>
          Proximity Filter:
        </span>
        {[
          { label: "Nearest First (All)", val: "" },
          { label: "Within 10 km", val: "10" },
          { label: "Within 20 km (Radius)", val: "20" },
        ].map((f) => {
          const active = currentRadiusFilter === f.val;
          return (
            <button
              key={f.val}
              type="button"
              onClick={() => handleRadiusChange(f.val)}
              style={{
                padding: "4px 12px",
                fontSize: "0.8rem",
                borderRadius: "99px",
                background: active ? "#2563eb" : "#fff",
                color: active ? "#fff" : "#1e3a8a",
                border: active ? "1px solid #2563eb" : "1px solid #bfdbfe",
                cursor: "pointer",
                fontWeight: active ? 700 : 500,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
