"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CATS } from "@/lib/worker/data";
import { validUpi } from "@/lib/worker/format";
import type { Profile } from "@/lib/worker/types";
import { useWorker } from "../WorkerProvider";

export default function ProfileView() {
  const { profile, saveProfile, toast } = useWorker();
  const [d, setD] = useState<Profile>(profile);
  const [skill, setSkill] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [fetchingGps, setFetchingGps] = useState(false);
  const [geocodingAddress, setGeocodingAddress] = useState(false);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    setD(profile);
  }, [profile]);

  function addSkill() {
    const s = skill.trim();
    if (!s) return setErrs((e) => ({ ...e, skill: "Type a skill first." }));
    if (s.length > 30) return setErrs((e) => ({ ...e, skill: "Keep it under 30 characters." }));
    if (d.skills.some((x) => x.toLowerCase() === s.toLowerCase())) return setErrs((e) => ({ ...e, skill: "Already added." }));
    setErrs((e) => ({ ...e, skill: "" }));
    set("skills", [...d.skills, s]);
    setSkill("");
  }

  const handleFetchGpsLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast("Geolocation is not supported by your browser");
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));

        set("latitude", lat);
        set("longitude", lon);

        // Reverse geocode via Photon to prefill address/area/city/pincode
        try {
          const res = await fetch("/api/location/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: lat, longitude: lon }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.address && !d.address) set("address", data.address);
            if (data.area) set("area", data.area);
            if (data.city) set("city", data.city);
            if (data.pincode) set("pincode", data.pincode);
          }
        } catch {
          // ignore reverse geocoding failure
        }
        setFetchingGps(false);
        toast(`GPS location detected (${lat}° N, ${lon}° E)`);
      },
      (err) => {
        setFetchingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast("Location permission was not granted. You can enter your address manually.");
        } else {
          toast("Unable to retrieve GPS coordinates. Please enter your address manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleVerifyAddressWithPhoton = async () => {
    const query = [d.address, d.area, d.city, d.pincode].filter(Boolean).join(", ");
    if (!query.trim()) {
      toast("Please enter your area or city first");
      return;
    }
    setGeocodingAddress(true);
    try {
      const res = await fetch("/api/location/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (res.ok && data.latitude && data.longitude) {
        set("latitude", data.latitude);
        set("longitude", data.longitude);
        toast(`Address geocoded (${data.latitude}° N, ${data.longitude}° E)`);
      } else {
        toast(data.error?.message || "Could not find coordinates for this address");
      }
    } catch {
      toast("Network error during geocoding");
    } finally {
      setGeocodingAddress(false);
    }
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (d.name.trim().length < 2) next.name = "Enter your full name.";
    if (d.phone.trim() && !/^[6-9]\d{9}$/.test(d.phone.trim())) next.phone = "Enter a valid 10-digit mobile number.";
    if (d.upi.trim() && !validUpi(d.upi.trim())) next.upi = "Enter a valid UPI ID (name@bank) or the 10-digit mobile number linked to UPI.";
    setErrs(next);
    if (Object.keys(next).length) return;

    saveProfile({
      ...d,
      name: d.name.trim(),
      phone: d.phone.trim(),
      upi: d.upi.trim(),
      address: d.address?.trim() || "",
      area: d.area?.trim() || "",
      city: d.city.trim(),
      pincode: d.pincode?.trim() || "",
      radiusKm: d.radiusKm ?? 15,
      nearbyNotif: d.nearbyNotif !== false,
      exp: d.exp.trim(),
    });
  }

  const box = { width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", font: "inherit" } as const;

  return (
    <>
      <div className="head">
        <div>
          <h1>Profile</h1>
          <p className="sub">Keep your details current so organizers can trust your application and you receive nearby event alerts.</p>
        </div>
      </div>
      <form className="f" id="pform" onSubmit={submit} noValidate>
        <div className="pf">
          {/* Left Column: Personal Info & Location Section */}
          <div>
            <div className="panel pad">
              <h2>Personal information</h2>
              <label htmlFor="pn1">Full name</label>
              <input type="text" id="pn1" name="name" value={d.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
              <p className="er" id="e_name">{errs.name}</p>

              <label htmlFor="pe">Email</label>
              <input type="text" id="pe" value={d.email} readOnly />

              <label htmlFor="pp">Mobile number</label>
              <input type="tel" id="pp" name="phone" value={d.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit number" autoComplete="tel" />
              <p className="er" id="e_phone">{errs.phone}</p>

              <label htmlFor="pu">UPI ID or number</label>
              <input type="text" id="pu" name="upi" value={d.upi} onChange={(e) => set("upi", e.target.value)} placeholder="name@bank or 10-digit number" autoComplete="off" />
              <p className="er" id="e_upi">{errs.upi}</p>
              <p className="sub" style={{ fontSize: 13, margin: "-2px 0 0" }}>Organizers use this to pay your wages directly. Never share your UPI PIN or OTP with anyone.</p>

              <label htmlFor="px">Experience</label>
              <textarea id="px" name="exp" rows={3} value={d.exp} onChange={(e) => set("exp", e.target.value)} style={box} placeholder="Tell organizers about past events or volunteer roles..." />
            </div>

            {/* Location & Preferred Work Radius Section */}
            <div className="panel pad" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <h2>Location & Preferred Radius</h2>
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={handleFetchGpsLocation}
                  disabled={fetchingGps}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span className="ms" style={{ fontSize: 18 }}>my_location</span>
                  {fetchingGps ? "Detecting GPS..." : "Use Current Location"}
                </button>
              </div>

              <p className="sub" style={{ fontSize: 13, margin: "4px 0 16px" }}>
                Enter your residential address manually or click &quot;Use Current Location&quot;. Photon geocoding converts this into coordinates to match you with nearby events.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label htmlFor="p_addr">House / Flat / Street Address</label>
                  <input
                    type="text"
                    id="p_addr"
                    placeholder="e.g. 14B, 2nd Cross Street"
                    value={d.address || ""}
                    onChange={(e) => set("address", e.target.value)}
                    autoComplete="street-address"
                  />
                </div>

                <div>
                  <label htmlFor="p_area">Area / Locality</label>
                  <input
                    type="text"
                    id="p_area"
                    placeholder="e.g. T. Nagar, Velachery, Indiranagar"
                    value={d.area || ""}
                    onChange={(e) => set("area", e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="pc">City *</label>
                  <input
                    type="text"
                    id="pc"
                    name="city"
                    placeholder="e.g. Chennai, Bangalore, Coimbatore"
                    value={d.city}
                    onChange={(e) => set("city", e.target.value)}
                    required
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label htmlFor="p_pin">Pincode</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      id="p_pin"
                      placeholder="e.g. 600017"
                      value={d.pincode || ""}
                      onChange={(e) => set("pincode", e.target.value)}
                      maxLength={10}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={handleVerifyAddressWithPhoton}
                      disabled={geocodingAddress}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      <span className="ms" style={{ fontSize: 16 }}>pin_drop</span>
                      {geocodingAddress ? "Geocoding..." : "Geocode Address"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Coordinates Status Badge */}
              {d.latitude && d.longitude && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "8px 14px", background: "#eef4ff", borderRadius: 10, fontSize: 13, color: "#1a73e8" }}>
                  <span className="ms" style={{ fontSize: 18 }}>check_circle</span>
                  <span>
                    Saved Coordinates: <b>{Number(d.latitude).toFixed(4)}° N, {Number(d.longitude).toFixed(4)}° E</b> (Photon Geocoded)
                  </span>
                </div>
              )}

              {/* Preferred Notification Radius Selector */}
              <div style={{ marginTop: 18 }}>
                <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                  Preferred Notification Radius
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[5, 10, 15, 25, 50].map((r) => {
                    const active = (d.radiusKm ?? 15) === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => set("radiusKm", r)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 999,
                          border: active ? "2px solid #111" : "1px solid var(--line)",
                          background: active ? "#111" : "#fff",
                          color: active ? "#fff" : "#111",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {r} km
                      </button>
                    );
                  })}
                </div>
                <span className="sub" style={{ fontSize: 12, marginTop: 6, display: "block" }}>
                  You will receive in-app alerts when events are published within <b>{d.radiusKm ?? 15} km</b> of your saved location.
                </span>
              </div>

              {/* Nearby Event Notification Toggle */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <label className="chk" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={d.nearbyNotif !== false && d.notif.nearby !== false}
                    onChange={(e) => {
                      set("nearbyNotif", e.target.checked);
                      set("notif", { ...d.notif, nearby: e.target.checked });
                    }}
                  />
                  <span>Enable nearby event notifications</span>
                </label>
                <p className="sub" style={{ fontSize: 12, margin: "6px 0 0", color: "#666" }}>
                  🔒 <b>Privacy Guarantee:</b> Your exact residential address is strictly confidential. It is never shared with event organizers or displayed publicly. Location permission is completely optional.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Skills, Categories & General Notifications */}
          <div>
            <div className="panel pad">
              <h2>Skills</h2>
              <div id="chips" style={{ marginTop: 12 }}>
                {d.skills.length === 0 && <span className="sub">No skills added yet.</span>}
                {d.skills.map((s) => (
                  <span className="chip" key={s}>
                    {s}
                    <button type="button" aria-label={`Remove ${s}`} onClick={() => set("skills", d.skills.filter((x) => x !== s))}>
                      <span className="ms" style={{ fontSize: 16 }}>close</span>
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  id="sk"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Add a skill"
                  style={{ ...box, flex: 1 }}
                  aria-label="Add a skill"
                />
                <button className="btn sec sm" type="button" data-act="addskill" style={{ height: 42 }} onClick={addSkill}>
                  Add
                </button>
              </div>
              <p className="er" id="e_sk">{errs.skill}</p>
            </div>

            <div className="panel pad" style={{ marginTop: 16 }}>
              <h2>Preferred job categories</h2>
              <div style={{ marginTop: 8 }}>
                {CATS.map((c) => (
                  <label className="chk" key={c}>
                    <input
                      type="checkbox"
                      name="cat"
                      value={c}
                      checked={d.cats.includes(c)}
                      onChange={(e) => set("cats", e.target.checked ? [...d.cats, c] : d.cats.filter((x) => x !== c))}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div className="panel pad" style={{ marginTop: 16 }}>
              <h2>General notification channels</h2>
              <div style={{ marginTop: 8 }}>
                {([
                  ["email", "Email updates", "n_email"],
                  ["push", "Push notifications", "n_push"],
                  ["remind", "Event reminders", "n_remind"],
                ] as const).map(([k, label, name]) => (
                  <label className="chk" key={k}>
                    <input
                      type="checkbox"
                      name={name}
                      checked={d.notif[k]}
                      onChange={(e) => set("notif", { ...d.notif, [k]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button className="btn" type="submit">Save changes</button>
          <button
            className="btn sec"
            type="button"
            data-act="pcancel"
            onClick={() => {
              setD(profile);
              setErrs({});
              setSkill("");
              toast("Changes discarded");
            }}
          >
            Cancel
          </button>
        </div>
      </form>
      <p className="sub" style={{ marginTop: 20 }}>
        Need a new password? <Link href="/worker/password" style={{ color: "var(--blue)" }}>Change password</Link>
      </p>
    </>
  );
}
