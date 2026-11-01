"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface EventMapItem {
  id: string;
  title: string;
  venue: string;
  city: string;
  category: string;
  distance?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
  startsAt: string;
}

interface Props {
  userLat?: number | null;
  userLng?: number | null;
  events: EventMapItem[];
}

export default function EventsMapView({ userLat, userLng, events }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

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

      // Default center to user position or Tamil Nadu center
      const defaultCenter: [number, number] =
        userLat != null && userLng != null ? [userLat, userLng] : [11.1271, 78.6569];

      const map = L.map(mapContainerRef.current).setView(defaultCenter, 11);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const markersGroup = L.featureGroup();

      // Volunteer Location Marker
      if (userLat != null && userLng != null) {
        const userIcon = L.divIcon({
          className: "custom-user-pin",
          html: `
            <div style="
              width: 20px;
              height: 20px;
              background: #2563eb;
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 0 12px rgba(37,99,235,0.8);
              animation: pulse 1.8s infinite;
            "></div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
        userMarker.bindPopup("<b>📍 Your Current Location</b>");
        markersGroup.addLayer(userMarker);
      }

      // Add markers for all events that have coordinates
      events.forEach((ev) => {
        if (ev.latitude != null && ev.longitude != null) {
          const isNearby = ev.distance != null && ev.distance <= (ev.radiusKm || 20);

          const eventMarker = L.marker([ev.latitude, ev.longitude]).addTo(map);

          // Add radius circle for nearby events
          if (ev.radiusKm) {
            L.circle([ev.latitude, ev.longitude], {
              radius: ev.radiusKm * 1000,
              color: isNearby ? "#059669" : "#64748b",
              fillColor: isNearby ? "#059669" : "#64748b",
              fillOpacity: 0.1,
              weight: 1,
            }).addTo(map);
          }

          const distHtml =
            ev.distance != null
              ? `<div style="margin: 4px 0; color: #0284c7; font-weight: 700;">📍 ${ev.distance.toFixed(
                  1
                )} km away ${isNearby ? "(Within 20 km!)" : ""}</div>`
              : "";

          const popupContent = `
            <div style="font-family: inherit; min-width: 180px;">
              <b style="font-size: 1rem; color: #00072D;">${ev.title}</b>
              <div style="font-size: 0.82rem; color: #6b7280; margin-top: 2px;">${ev.venue}, ${ev.city}</div>
              ${distHtml}
              <div style="margin-top: 8px;">
                <a href="/volunteer/events/${ev.id}" style="
                  display: inline-block;
                  background: #00072D;
                  color: #ffffff;
                  padding: 4px 12px;
                  border-radius: 99px;
                  font-size: 0.78rem;
                  font-weight: 600;
                  text-decoration: none;
                ">View & Apply →</a>
              </div>
            </div>
          `;

          eventMarker.bindPopup(popupContent);
          markersGroup.addLayer(eventMarker);
        }
      });

      // Fit map bounds if we have layers
      if (markersGroup.getLayers().length > 0) {
        map.fitBounds(markersGroup.getBounds().pad(0.2));
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [userLat, userLng, events]);

  return (
    <div
      style={{
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        margin: "18px 0 28px",
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "380px",
          background: "#f3f4f6",
        }}
      />
      <div
        style={{
          background: "#fff",
          padding: "10px 18px",
          fontSize: "0.82rem",
          color: "#4b5563",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <span>
          🔵 <b>Blue Dot:</b> Your Location &nbsp;·&nbsp; 📍 <b>Pins:</b> Event Venues &nbsp;·&nbsp; ⭕ <b>Circles:</b> 10–20 km notification radius
        </span>
        <span style={{ color: "#059669", fontWeight: 600 }}>
          {events.filter((e) => e.distance != null && e.distance <= (e.radiusKm || 20)).length} events near you!
        </span>
      </div>
    </div>
  );
}
