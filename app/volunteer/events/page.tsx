import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import EventCard from "@/components/EventCard";
import LiveLocationBar from "@/components/LiveLocationBar";
import EventsMapView from "@/components/EventsMapView";
import { LOOK } from "@/lib/look";
import { haversineDistance, getCityCoordinates } from "@/lib/geo";

type SP = {
  q?: string;
  city?: string;
  cat?: string;
  pay?: string;
  open?: string;
  lat?: string;
  lng?: string;
  radius?: string;
  view?: string;
};

export default async function Page({ searchParams: sp }: { searchParams: SP }) {
  const u = await need("VOLUNTEER");

  // Determine volunteer location (from query params, saved profile, or city fallback)
  const qLat = sp.lat ? parseFloat(sp.lat) : null;
  const qLng = sp.lng ? parseFloat(sp.lng) : null;
  const cityFallback = getCityCoordinates(u.city);

  const volLat = qLat && !isNaN(qLat) ? qLat : u.latitude ?? cityFallback?.lat ?? null;
  const volLng = qLng && !isNaN(qLng) ? qLng : u.longitude ?? cityFallback?.lng ?? null;

  const all: any[] = await db.event.findMany({
    where: { status: "PUBLISHED", endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { organizer: true, roles: { include: { applications: true } } },
  });

  const live = (r: any) =>
    r.applications.filter((a: any) => a.status === "PENDING" || a.status === "ACCEPTED").length;
  const max = (e: any) => Math.max(0, ...e.roles.map((r: any) => r.pay));
  const q = (sp.q || "").toLowerCase();
  const c = (sp.city || "").toLowerCase();

  // Calculate distance for every event
  const eventsWithDistance = all.map((e) => {
    let evLat = e.latitude;
    let evLng = e.longitude;
    if (evLat == null || evLng == null) {
      const ec = getCityCoordinates(e.city);
      if (ec) {
        evLat = ec.lat;
        evLng = ec.lng;
      }
    }

    let dist: number | null = null;
    let isNearby = false;

    if (volLat != null && volLng != null && evLat != null && evLng != null) {
      dist = haversineDistance(volLat, volLng, evLat, evLng);
      isNearby = dist <= (e.radiusKm || 20);
    }

    return {
      ...e,
      latitude: evLat,
      longitude: evLng,
      distance: dist,
      isNearby,
    };
  });

  // Filter based on standard criteria and radius
  const radiusFilter = sp.radius ? parseFloat(sp.radius) : null;

  let list = eventsWithDistance.filter(
    (e) =>
      `${e.title} ${e.venue}`.toLowerCase().includes(q) &&
      e.city.toLowerCase().includes(c) &&
      (!sp.cat || e.category === sp.cat) &&
      (!sp.pay || (sp.pay === "paid") === max(e) > 0) &&
      (!sp.open || e.roles.some((r: any) => live(r) < r.slots)) &&
      (!radiusFilter || (e.distance != null && e.distance <= radiusFilter))
  );

  // SORT: Events within radius (< 20km) MUST DISPLAY FIRST! Closest first.
  list.sort((a, b) => {
    // Both nearby: sort by distance
    if (a.isNearby && b.isNearby) {
      return (a.distance ?? 9999) - (b.distance ?? 9999);
    }
    // a is nearby, b is not: a comes first!
    if (a.isNearby && !b.isNearby) return -1;
    if (!a.isNearby && b.isNearby) return 1;

    // Neither is nearby: sort by distance if known, else by date
    if (a.distance != null && b.distance != null) {
      return a.distance - b.distance;
    }
    if (a.distance != null) return -1;
    if (b.distance != null) return 1;
    return a.startsAt.getTime() - b.startsAt.getTime();
  });

  const nearbyCount = list.filter((e) => e.isNearby).length;
  const isMapView = sp.view === "map";

  // Map view items
  const mapItems = list.map((e) => ({
    id: e.id,
    title: e.title,
    venue: e.venue,
    city: e.city,
    category: e.category,
    distance: e.distance,
    latitude: e.latitude,
    longitude: e.longitude,
    radiusKm: e.radiusKm || 20,
    startsAt: e.startsAt.toLocaleDateString("en-IN"),
  }));

  return (
    <>
      <div className="dh">
        <div>
          <span className="mute">Volunteer dashboard</span>
          <h1>Events</h1>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Link
            href={`/volunteer/events?${new URLSearchParams({ ...sp, view: "" }).toString()}`}
            className={`btn ${!isMapView ? "" : "ghost"}`}
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            ⊞ Grid View
          </Link>
          <Link
            href={`/volunteer/events?${new URLSearchParams({ ...sp, view: "map" }).toString()}`}
            className={`btn ${isMapView ? "" : "ghost"}`}
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            🗺️ Map View
          </Link>
        </div>
      </div>

      <p className="mute">
        Live-tracked event recommendations. Events in your 10–20 km radius are prioritized first.
      </p>

      {/* Live Location and radius filter bar */}
      <LiveLocationBar
        userCity={u.city}
        userLat={volLat}
        userLng={volLng}
        lastLocationAt={u.lastLocationAt?.toISOString()}
      />

      <form className="filters" action="/volunteer/events">
        {sp.view && <input type="hidden" name="view" value={sp.view} />}
        {sp.radius && <input type="hidden" name="radius" value={sp.radius} />}
        <input name="q" placeholder="Search events or venues" aria-label="Search" defaultValue={sp.q} />
        <input name="city" placeholder="City" aria-label="City" defaultValue={sp.city} />
        <select name="cat" aria-label="Category" defaultValue={sp.cat || ""}>
          <option value="">All categories</option>
          {Object.keys(LOOK).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <select name="pay" aria-label="Pay" defaultValue={sp.pay || ""}>
          <option value="">Paid and unpaid</option>
          <option value="paid">Paid only</option>
          <option value="free">Unpaid only</option>
        </select>
        <select name="open" aria-label="Availability" defaultValue={sp.open || ""}>
          <option value="">Any availability</option>
          <option value="1">Spots left only</option>
        </select>
        <button>Search</button>
        <Link href="/volunteer/events" className="btn dark">
          Clear
        </Link>
      </form>

      {/* Interactive Map View */}
      {isMapView ? (
        <EventsMapView userLat={volLat} userLng={volLng} events={mapItems} />
      ) : null}

      {!list.length ? (
        <p className="card">No events match your proximity or search filters.</p>
      ) : (
        <>
          {nearbyCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "20px 0 12px",
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#00072D" }}>
                🎯 Recommended Events Near You ({nearbyCount})
              </h2>
              <span
                style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "99px",
                }}
              >
                Within 10–20 km radius · Sorted closest first
              </span>
            </div>
          )}

          <div className="grid">
            {list.map((e) => {
              const f = e.roles.reduce((n: number, r: any) => n + live(r), 0);
              const s = e.roles.reduce((n: number, r: any) => n + r.slots, 0);
              const applied = e.roles.some((r: any) =>
                r.applications.some((a: any) => a.userId === u.id && a.status !== "CANCELLED")
              );
              return (
                <EventCard
                  key={e.id}
                  href={`/volunteer/events/${e.id}`}
                  e={e}
                  distance={e.distance}
                  sub={
                    <>
                      {f}/{s} applied · {s - f > 0 ? `${s - f} spots left` : "Full"}{" "}
                      {applied && <span className="tag ok">Applied</span>}
                    </>
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
