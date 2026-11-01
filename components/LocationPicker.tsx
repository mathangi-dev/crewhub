"use client";

import { useState, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface Props {
  initialVenue?: string;
  initialCity?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  initialRadius?: number;
  defaultCity?: string;
}

const KNOWN_VENUES_MAP: Record<string, [number, number]> = {
  "codissia": [11.0425, 77.0375],
  "codissia hall": [11.0425, 77.0375],
  "codissia trade fair complex": [11.0425, 77.0375],
  "sri varalakshmi mahal": [11.6643, 78.146],
  "varalakshmi mahal": [11.6643, 78.146],
  "reliance mall": [11.341, 77.7172],
  "chennai trade centre": [13.0185, 80.1837],
  "jawaharlal nehru stadium": [13.0827, 80.2707],
  "express avenue": [13.0587, 80.2642],
  "phoenix marketcity": [12.9925, 80.217],
  "brookefields mall": [11.0118, 76.9582],
  "prozone mall": [11.0558, 77.0006],
  "race course": [11.0068, 76.974],
};

const CITY_COORDS_MAP: Record<string, [number, number]> = {
  chennai: [13.0827, 80.2707],
  coimbatore: [11.0168, 76.9558],
  salem: [11.6643, 78.146],
  erode: [11.341, 77.7172],
  madurai: [9.9252, 78.1198],
  trichy: [10.7905, 78.7047],
  tiruchirappalli: [10.7905, 78.7047],
  tiruppur: [11.1085, 77.3411],
  bangalore: [12.9716, 77.5946],
};

export default function LocationPicker({
  initialVenue = "",
  initialCity = "",
  initialLat,
  initialLng,
  initialRadius = 20,
  defaultCity = "Chennai",
}: Props) {
  const [venue, setVenue] = useState<string>(initialVenue);
  const [city, setCity] = useState<string>(initialCity || defaultCity);
  const [lat, setLat] = useState<number>(
    initialLat || CITY_COORDS_MAP[defaultCity.toLowerCase()]?.[0] || 13.0827
  );
  const [lng, setLng] = useState<number>(
    initialLng || CITY_COORDS_MAP[defaultCity.toLowerCase()]?.[1] || 80.2707
  );
  const [radius, setRadius] = useState<number>(initialRadius || 20);
  const [address, setAddress] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  // Initialize Leaflet map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = await import("leaflet");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Venue Marker
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      // Notification Radius Circle around Venue
      const circle = L.circle([lat, lng], {
        radius: radius * 1000,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);
      circleRef.current = circle;

      marker.bindPopup(`<b>Venue Location</b><br>Radius: ${radius} km`).openPopup();

      // On marker drag
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setLat(pos.lat);
        setLng(pos.lng);
        circle.setLatLng(pos);
        marker.setPopupContent(`<b>Venue Location</b><br>Radius: ${radius} km`).openPopup();
        setStatusMsg(`📍 Venue pinned at: ${pos.lat.toFixed(4)}° N, ${pos.lng.toFixed(4)}° E`);
      });

      // On map click
      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        setLat(clickLat);
        setLng(clickLng);
        marker.setLatLng([clickLat, clickLng]);
        circle.setLatLng([clickLat, clickLng]);
        marker.setPopupContent(`<b>Venue Location</b><br>Radius: ${radius} km`).openPopup();
        setStatusMsg(`📍 Venue repositioned at: ${clickLat.toFixed(4)}° N, ${clickLng.toFixed(4)}° E`);
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update circle radius when radius state changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius * 1000);
    }
    if (markerRef.current) {
      markerRef.current.setPopupContent(`<b>Venue Location</b><br>Radius: ${radius} km`);
    }
  }, [radius]);

  const updateMapPosition = (newLat: number, newLng: number, zoom = 14) => {
    setLat(newLat);
    setLng(newLng);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], zoom);
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([newLat, newLng]);
    }
  };

  // Search and locate venue strictly based on Venue name + City
  const locateVenueOnMap = async (vOverride?: string, cOverride?: string) => {
    const v = (vOverride ?? venue).trim();
    const c = (cOverride ?? city).trim();
    if (!v && !c) {
      setStatusMsg("Please enter a venue or city name to locate on map.");
      return;
    }

    // 1. Check known venues dictionary first for instant exact match
    const vLower = v.toLowerCase();
    for (const [key, coords] of Object.entries(KNOWN_VENUES_MAP)) {
      if (vLower.includes(key) || key.includes(vLower)) {
        updateMapPosition(coords[0], coords[1], 15);
        setAddress(`${v}, ${c}`);
        setStatusMsg(`📍 Venue matched: ${v} (${coords[0]}° N, ${coords[1]}° E)`);
        return;
      }
    }

    // 2. Query OpenStreetMap Nominatim for Venue + City
    try {
      setIsSearching(true);
      setStatusMsg(`Locating venue: "${v} ${c}"...`);
      const query = `${v} ${c}`.trim();
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const found = data[0];
        const newLat = parseFloat(found.lat);
        const newLng = parseFloat(found.lon);
        updateMapPosition(newLat, newLng, 15);
        setAddress(found.display_name);
        setStatusMsg(`📍 Venue located: ${found.display_name.slice(0, 60)}...`);
      } else {
        // Fallback to City coordinates if specific venue place is not in OSM database
        const cityLower = c.toLowerCase();
        const cityFallback = CITY_COORDS_MAP[cityLower];
        if (cityFallback) {
          updateMapPosition(cityFallback[0], cityFallback[1], 13);
          setStatusMsg(`📍 Centered on ${c}. You can drag or click the map pin to mark ${v} precisely.`);
        } else {
          setStatusMsg("Venue not found automatically. Click on the map to set the venue pin.");
        }
      }
    } catch (err) {
      setStatusMsg("Search failed. You can click on the map to set the venue pin.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "18px",
        padding: "20px",
        margin: "14px 0",
      }}
    >
      {/* Hidden inputs submitted with createEvent form */}
      <input type="hidden" name="latitude" value={lat ?? ""} />
      <input type="hidden" name="longitude" value={lng ?? ""} />
      <input type="hidden" name="radiusKm" value={radius} />
      <input type="hidden" name="locationAddress" value={address || `${venue}, ${city}`} />

      {/* Venue & City Inputs */}
      <div className="row" style={{ marginTop: 0, marginBottom: 12 }}>
        <div>
          <label htmlFor="venue_input">Venue Name / Location</label>
          <input
            id="venue_input"
            name="venue"
            placeholder="e.g. Codissia Hall, Peelamedu"
            required
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            onBlur={() => {
              if (venue.trim()) locateVenueOnMap();
            }}
          />
        </div>
        <div>
          <label htmlFor="city_input">City</label>
          <input
            id="city_input"
            name="city"
            placeholder="e.g. Coimbatore"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onBlur={() => {
              if (venue.trim() || city.trim()) locateVenueOnMap();
            }}
          />
        </div>
      </div>

      {/* Button to pinpoint venue on map */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
        <button
          type="button"
          onClick={() => locateVenueOnMap()}
          disabled={isSearching}
          style={{
            background: "#00072D",
            color: "#fff",
            fontSize: "0.85rem",
            padding: "8px 18px",
            borderRadius: "99px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
          }}
        >
          <span>🔍</span> {isSearching ? "Locating Venue..." : "Locate Venue on Map"}
        </button>

        {/* Quick Venue Examples for Instant Testing */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <span className="mute" style={{ fontSize: "0.78rem" }}>Quick Venues:</span>
          {[
            { v: "Codissia Hall", c: "Coimbatore" },
            { v: "Sri Varalakshmi mahal", c: "Salem" },
            { v: "Reliance mall", c: "Erode" },
            { v: "Chennai Trade Centre", c: "Chennai" },
          ].map((item) => (
            <button
              key={item.v}
              type="button"
              onClick={() => {
                setVenue(item.v);
                setCity(item.c);
                locateVenueOnMap(item.v, item.c);
              }}
              style={{
                fontSize: "0.74rem",
                padding: "3px 10px",
                background: "#f1f5f9",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                borderRadius: "99px",
                cursor: "pointer",
              }}
            >
              {item.v}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div
          style={{
            fontSize: "0.82rem",
            color: "#1d4ed8",
            background: "#eff6ff",
            padding: "6px 12px",
            borderRadius: "8px",
            marginBottom: "10px",
            fontWeight: 500,
          }}
        >
          {statusMsg}
        </div>
      )}

      {/* Leaflet Venue Map */}
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "290px",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid #cbd5e1",
          marginBottom: "14px",
          zIndex: 1,
        }}
      />

      {/* ORGANIZER RADIUS FIXING / CUSTOMIZATION SECTION */}
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <div>
            <b style={{ fontSize: "0.95rem", color: "#00072D", display: "flex", alignItems: "center", gap: "6px" }}>
              🔔 Fix Notification Radius Around Venue
            </b>
            <div className="mute" style={{ fontSize: "0.8rem", marginTop: "2px" }}>
              Only volunteers located within this radius around <b>{venue || "this venue"}</b> will receive notifications!
            </div>
          </div>

          {/* Direct Custom Radius Input */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Radius:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={radius}
              onChange={(e) => {
                const val = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
                setRadius(val);
              }}
              style={{
                width: "70px",
                padding: "6px 8px",
                fontSize: "0.95rem",
                fontWeight: 700,
                textAlign: "center",
                borderRadius: "8px",
                border: "2px solid #00072D",
              }}
            />
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>km</span>
          </div>
        </div>

        {/* Range Slider for smooth radius setting */}
        <div style={{ margin: "10px 0 12px" }}>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "#00072D", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b" }}>
            <span>5 km (Local area)</span>
            <span>20 km (City wide)</span>
            <span>50 km (Metro region)</span>
          </div>
        </div>

        {/* Quick Radius Selection Chips */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Presets:</span>
          {[5, 10, 15, 20, 25, 30].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              style={{
                padding: "5px 14px",
                fontSize: "0.8rem",
                borderRadius: "99px",
                background: radius === r ? "#00072D" : "#ffffff",
                color: radius === r ? "#ffffff" : "#1e293b",
                border: radius === r ? "1px solid #00072D" : "1px solid #cbd5e1",
                cursor: "pointer",
                fontWeight: radius === r ? 700 : 500,
                transition: "all 0.15s ease",
              }}
            >
              {r} km {r === 20 ? "(Default)" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Live Venue Status Confirmation */}
      <div
        style={{
          marginTop: "12px",
          padding: "10px 14px",
          background: "#ecfdf5",
          border: "1px solid #a7f3d0",
          borderRadius: "10px",
          fontSize: "0.82rem",
          color: "#065f46",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span>
          ✓ <b>Venue Pin:</b> {venue ? `"${venue}"` : "Venue"} at {lat.toFixed(4)}° N, {lng.toFixed(4)}° E &nbsp;·&nbsp; Alert Radius: <b>{radius} km</b>
        </span>
        <span style={{ color: "#047857", fontWeight: 600 }}>
          Notifications will strictly target people within {radius} km of this venue!
        </span>
      </div>
    </div>
  );
}
